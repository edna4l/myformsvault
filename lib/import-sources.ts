import { createRequire } from "node:module";
import { tmpdir } from "node:os";

import {
  buildImportedFormBlueprint,
  type ImportedFormBlueprint,
} from "@/lib/forms";

export type ImportMethod = "application" | "webpage" | "file" | "camera";
export type ImportSourceKind =
  | "application"
  | "webpage"
  | "document"
  | "pdf"
  | "image"
  | "camera";
export type ImportCompatibilityStatus = "ready" | "review" | "needs-input";

export type ImportQueryState = {
  method: ImportMethod;
  draft: string;
  sourceLabel: string;
  sourceTitle: string;
  sourceKind: ImportSourceKind;
  sourceType: string;
  usedFallbackText: boolean;
};

export type ImportCompatibilityItem = {
  title: string;
  status: ImportCompatibilityStatus;
  detail: string;
};

export type ImportDraftSummary = {
  method: ImportMethod;
  methodLabel: string;
  sourceLabel: string;
  sourceTitle: string;
  sourceKind: ImportSourceKind;
  sourceType: string;
  blueprint: ImportedFormBlueprint | null;
  compatibility: ImportCompatibilityItem[];
  recommendedNextStep: string;
};

type PrepareImportResult =
  | {
      ok: true;
      state: ImportQueryState;
    }
  | {
      ok: false;
      error: "validation" | "url" | "fetch" | "ocr";
      state?: Partial<ImportQueryState>;
    };

const htmlEntityMap: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const methodLabels: Record<ImportMethod, string> = {
  application: "Application copy",
  webpage: "Webpage import",
  file: "File upload",
  camera: "Photo or scan",
};

const nativeOcrCachePath = `${tmpdir()}/myformsvault-tesseract`;
const runtimeRequire = createRequire(`${process.cwd()}/myformsvault-import-runtime.js`);
const pdfJsPackageName = ["pdfjs-dist", "legacy", "build", "pdf.mjs"].join("/");
const canvasPackageName = ["@napi-rs", "canvas"].join("/");

let pdfJsModulePromise: Promise<void> | null = null;

function hasUsefulImportText(value: string) {
  const normalized = value.trim();

  if (normalized.length < 12) {
    return false;
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 1);
  return lines.length > 1 || normalized.length >= 40;
}

function loadPdfJsModule() {
  return Promise.resolve(runtimeRequire(pdfJsPackageName));
}

function loadCanvasModule() {
  return Promise.resolve(runtimeRequire(canvasPackageName));
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (entity) => htmlEntityMap[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, digits) => String.fromCharCode(Number(digits)));
}

function stripHtml(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueLines(lines: string[]) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

function toTitleCase(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function looksLikePrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();

  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower === "0.0.0.0" ||
    lower === "::1"
  ) {
    return true;
  }

  if (
    /^127\./.test(lower) ||
    /^10\./.test(lower) ||
    /^192\.168\./.test(lower) ||
    /^169\.254\./.test(lower)
  ) {
    return true;
  }

  const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower);

  if (private172 || /^fc/i.test(lower) || /^fd/i.test(lower)) {
    return true;
  }

  return false;
}

function parseImportUrl(value: string) {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol) || looksLikePrivateHostname(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function extractTitleFromHtml(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "";

  return title || "Imported webpage";
}

function collectHtmlMatches(html: string, pattern: RegExp, group = 1) {
  const matches: string[] = [];

  for (const match of html.matchAll(pattern)) {
    const candidate = stripHtml(match[group] ?? "");

    if (candidate.length > 1) {
      matches.push(candidate);
    }
  }

  return matches;
}

function extractFormHintsFromHtml(html: string) {
  const labelText = collectHtmlMatches(html, /<label\b[^>]*>([\s\S]*?)<\/label>/gi);
  const placeholderText = collectHtmlMatches(html, /\bplaceholder=(["'])(.*?)\1/gi, 2);
  const ariaLabels = collectHtmlMatches(html, /\baria-label=(["'])(.*?)\1/gi, 2);
  const headings = collectHtmlMatches(
    html,
    /<(?:legend|h1|h2|h3)\b[^>]*>([\s\S]*?)<\/(?:legend|h1|h2|h3)>/gi,
  );
  const fallbackText = stripHtml(html)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && line.length <= 120);

  return uniqueLines([
    ...labelText,
    ...placeholderText,
    ...ariaLabels,
    ...headings,
    ...fallbackText,
  ]).slice(0, 240);
}

function extractStringsFromJson(value: unknown, carry: string[] = []) {
  if (typeof value === "string") {
    carry.push(value);
    return carry;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractStringsFromJson(item, carry);
    }

    return carry;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const [key, entry] of Object.entries(record)) {
      if (/^(label|name|title|placeholder|question|prompt)$/i.test(key) && typeof entry === "string") {
        carry.push(entry);
      }

      extractStringsFromJson(entry, carry);
    }
  }

  return carry;
}

function normalizeImportedText(raw: string, sourceType = "") {
  const trimmed = raw.trim();

  if (!trimmed) {
    return "";
  }

  if (/json/i.test(sourceType) || /^[\[{]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      const extracted = uniqueLines(extractStringsFromJson(parsed)).slice(0, 240);

      if (extracted.length > 0) {
        return extracted.join("\n");
      }
    } catch {
      // Fall through to text heuristics below.
    }
  }

  if (/html/i.test(sourceType) || /<html|<body|<form|<label|<input/i.test(trimmed)) {
    return extractFormHintsFromHtml(trimmed).join("\n");
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function describeUploadKind(fileName: string, mimeType: string, method: ImportMethod) {
  const lowerName = fileName.toLowerCase();
  const lowerType = mimeType.toLowerCase();

  if (lowerType.startsWith("image/")) {
    return method === "camera" ? "camera" : "image";
  }

  if (lowerType.includes("pdf") || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  return "document";
}

function buildSourceTitle(sourceLabel: string, fallback: string) {
  const cleaned = toTitleCase(sourceLabel);
  return cleaned || fallback;
}

function isTextLikeUpload(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const lowerType = mimeType.toLowerCase();

  return (
    lowerType.startsWith("text/") ||
    lowerType.includes("json") ||
    lowerType.includes("xml") ||
    lowerType.includes("csv") ||
    lowerType.includes("html") ||
    [".txt", ".csv", ".json", ".xml", ".html", ".htm", ".md"].some((extension) =>
      lowerName.endsWith(extension),
    )
  );
}

async function ensurePdfJsModule() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("unpdf").then(({ definePDFJSModule }) =>
      definePDFJSModule(loadPdfJsModule),
    );
  }

  await pdfJsModulePromise;
}

async function withNativeOcrWorker<T>(
  run: (
    worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>,
  ) => Promise<T>,
) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    cachePath: nativeOcrCachePath,
  });

  try {
    return await run(worker);
  } finally {
    await worker.terminate();
  }
}

async function extractNativeImageText(file: File) {
  return withNativeOcrWorker(async (worker) => {
    const image = Buffer.from(await file.arrayBuffer());
    const result = await worker.recognize(image);
    return normalizeImportedText(result.data.text, file.type || file.name || "image/*");
  });
}

async function extractNativePdfImport(file: File, sourceType: string) {
  await ensurePdfJsModule();

  const { extractText, getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });
  const normalizedPdfText = normalizeImportedText(text, "application/pdf");

  if (hasUsefulImportText(normalizedPdfText)) {
    return {
      draft: normalizedPdfText,
      resolvedSourceType: `native-pdf-text:${sourceType}`,
    };
  }

  const pageTexts: string[] = [];

  await withNativeOcrWorker(async (worker) => {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const rendered = await renderPageAsImage(pdf, pageNumber, {
        canvasImport: loadCanvasModule,
        scale: 2,
      });
      const result = await worker.recognize(Buffer.from(rendered));
      const normalizedPageText = normalizeImportedText(
        result.data.text,
        `application/pdf-page-${pageNumber}`,
      );

      if (hasUsefulImportText(normalizedPageText)) {
        pageTexts.push(normalizedPageText);
      }
    }
  });

  const normalizedOcrText = normalizeImportedText(pageTexts.join("\n"), "application/pdf");

  if (!hasUsefulImportText(normalizedOcrText)) {
    return null;
  }

  return {
    draft: normalizedOcrText,
    resolvedSourceType: `native-pdf-ocr:${sourceType}`,
  };
}

async function prepareWebpageImport(
  pageUrl: string,
  fallbackText: string,
): Promise<PrepareImportResult> {
  const url = parseImportUrl(pageUrl);

  if (!url) {
    return { ok: false, error: "url" };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "myformsvault-importer/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      if (fallbackText.trim()) {
        return {
          ok: true,
          state: {
            method: "webpage",
            draft: normalizeImportedText(fallbackText, "text/plain"),
            sourceLabel: url.toString(),
            sourceTitle: buildSourceTitle(url.hostname, "Imported webpage"),
            sourceKind: "webpage",
            sourceType: "manual-web-copy",
            usedFallbackText: true,
          },
        };
      }

      return { ok: false, error: "fetch" };
    }

    const contentType = response.headers.get("content-type") ?? "text/html";
    const raw = await response.text();
    const normalized = /html/i.test(contentType)
      ? extractFormHintsFromHtml(raw).join("\n")
      : normalizeImportedText(raw, contentType);

    return {
      ok: true,
      state: {
        method: "webpage",
        draft: normalized,
        sourceLabel: url.toString(),
        sourceTitle: /html/i.test(contentType)
          ? extractTitleFromHtml(raw)
          : buildSourceTitle(url.hostname, "Imported webpage"),
        sourceKind: "webpage",
        sourceType: contentType,
        usedFallbackText: false,
      },
    };
  } catch {
    if (fallbackText.trim()) {
      return {
        ok: true,
        state: {
          method: "webpage",
          draft: normalizeImportedText(fallbackText, "text/plain"),
          sourceLabel: url.toString(),
          sourceTitle: buildSourceTitle(url.hostname, "Imported webpage"),
          sourceKind: "webpage",
          sourceType: "manual-web-copy",
          usedFallbackText: true,
        },
      };
    }

    return { ok: false, error: "fetch" };
  }
}

async function prepareUploadedImport(
  method: ImportMethod,
  file: File | null,
  fallbackText: string,
): Promise<PrepareImportResult> {
  if (!file || file.size === 0) {
    if (!fallbackText.trim()) {
      return { ok: false, error: "validation" };
    }

    return {
      ok: true,
      state: {
        method,
        draft: normalizeImportedText(fallbackText, "text/plain"),
        sourceLabel: method === "camera" ? "Captured scan text" : "Uploaded form text",
        sourceTitle: method === "camera" ? "Captured scan" : "Uploaded form",
        sourceKind: method === "camera" ? "camera" : "document",
        sourceType: "manual-text",
        usedFallbackText: true,
      },
    };
  }

  const sourceKind = describeUploadKind(file.name, file.type, method);
  const sourceTitle = buildSourceTitle(
    file.name,
    method === "camera" ? "Captured scan" : "Uploaded form",
  );
  const sourceType = file.type || file.name.split(".").pop() || "unknown";

  if (file.size > 8_000_000) {
    return { ok: false, error: "validation" };
  }

  if (isTextLikeUpload(file.name, file.type)) {
    const raw = await file.text();

    return {
      ok: true,
      state: {
        method,
        draft: normalizeImportedText(raw, file.type || file.name),
        sourceLabel: file.name,
        sourceTitle,
        sourceKind,
        sourceType,
        usedFallbackText: false,
      },
    };
  }

  if (sourceKind === "pdf") {
    try {
      const preparedPdf = await extractNativePdfImport(file, sourceType);

      if (preparedPdf) {
        return {
          ok: true,
          state: {
            method,
            draft: preparedPdf.draft,
            sourceLabel: file.name,
            sourceTitle,
            sourceKind,
            sourceType: preparedPdf.resolvedSourceType,
            usedFallbackText: false,
          },
        };
      }
    } catch {
      // Fall through to fallback handling below.
    }
  }

  if (sourceKind === "image" || sourceKind === "camera") {
    try {
      const extracted = await extractNativeImageText(file);

      if (hasUsefulImportText(extracted)) {
        return {
          ok: true,
          state: {
            method,
            draft: extracted,
            sourceLabel: file.name,
            sourceTitle,
            sourceKind,
            sourceType: `native-ocr:${sourceType}`,
            usedFallbackText: false,
          },
        };
      }
    } catch {
      // Fall through to fallback handling below.
    }
  }

  if (!fallbackText.trim()) {
    return {
      ok: false,
      error: "ocr",
      state: {
        method,
        sourceLabel: file.name,
        sourceTitle,
        sourceKind,
        sourceType,
      },
    };
  }

  return {
    ok: true,
    state: {
      method,
      draft: normalizeImportedText(fallbackText, "text/plain"),
      sourceLabel: file.name,
      sourceTitle,
      sourceKind,
      sourceType,
      usedFallbackText: true,
    },
  };
}

export function normalizeImportMethod(value: string | null | undefined): ImportMethod {
  if (value === "webpage" || value === "file" || value === "camera") {
    return value;
  }

  return "application";
}

export async function prepareImportQueryState(formData: FormData): Promise<PrepareImportResult> {
  const method = normalizeImportMethod(`${formData.get("method") ?? ""}`);
  const sourceText = `${formData.get("sourceText") ?? ""}`.trim();

  if (method === "application") {
    if (!sourceText) {
      return { ok: false, error: "validation" };
    }

    return {
      ok: true,
      state: {
        method,
        draft: normalizeImportedText(sourceText, "text/plain"),
        sourceLabel: "Copied application form",
        sourceTitle: "Application import",
        sourceKind: "application",
        sourceType: "copied-text",
        usedFallbackText: false,
      },
    };
  }

  if (method === "webpage") {
    return prepareWebpageImport(`${formData.get("pageUrl") ?? ""}`.trim(), sourceText);
  }

  const fileValue = formData.get("sourceFile");
  const file = fileValue instanceof File ? fileValue : null;

  return prepareUploadedImport(method, file, sourceText);
}

function pushCompatibility(
  compatibility: ImportCompatibilityItem[],
  title: string,
  status: ImportCompatibilityStatus,
  detail: string,
) {
  compatibility.push({ title, status, detail });
}

export function buildImportDraftSummary(state: ImportQueryState): ImportDraftSummary {
  const sourceText = state.draft.trim();
  const blueprint = sourceText ? buildImportedFormBlueprint(sourceText) : null;
  const compatibility: ImportCompatibilityItem[] = [];
  const customFieldCount = blueprint?.customSection?.fields.length ?? 0;
  const matchedCount = blueprint?.matchedSections.length ?? 0;

  pushCompatibility(
    compatibility,
    "Source intake",
    sourceText ? "ready" : "needs-input",
    sourceText
      ? `The ${methodLabels[state.method].toLowerCase()} source is ready to map into reusable sections.`
      : "Add or extract field text first so the importer has something to map.",
  );

  if (state.sourceKind === "image" || state.sourceKind === "pdf" || state.sourceKind === "camera") {
    const sourceType = state.sourceType.toLowerCase();
    const usedNativePdfText = sourceType.startsWith("native-pdf-text:");
    const usedNativePdfOcr = sourceType.startsWith("native-pdf-ocr:");
    const usedNativeOcr = sourceType.startsWith("native-ocr:");

    pushCompatibility(
      compatibility,
      "OCR cleanup",
      usedNativePdfText
        ? "ready"
        : usedNativePdfOcr || state.usedFallbackText || usedNativeOcr
          ? "review"
          : "needs-input",
      usedNativePdfText
        ? "The app extracted a text layer directly from the PDF, so this source is ready for mapping with only a quick wording check."
        : usedNativePdfOcr
          ? "The app rendered each PDF page and ran built-in OCR on the scan. Review the wording for OCR mistakes before saving."
          : usedNativeOcr
            ? "The app read this image or scan with built-in OCR. Double-check labels for OCR mistakes before saving the form."
            : state.usedFallbackText
              ? "This came from a scan, photo, or PDF companion text. Double-check labels for OCR mistakes before saving the form."
              : "The app could not extract enough text from this file on its own. Add copied OCR text or use a text-based PDF for the cleanest mapping.",
    );
  } else if (state.method === "webpage") {
    pushCompatibility(
      compatibility,
      "Web compatibility",
      "review",
      "Public webpages import best. Auth-gated or app-rendered pages may still need copied field text for a clean mapping.",
    );
  } else {
    pushCompatibility(
      compatibility,
      "Source cleanup",
      "ready",
      "This source type is already text-based, so the importer can map it directly.",
    );
  }

  pushCompatibility(
    compatibility,
    "Reusable section match",
    matchedCount > 0 ? "ready" : "review",
    matchedCount > 0
      ? `${matchedCount} reusable section${matchedCount === 1 ? "" : "s"} matched automatically.`
      : "Nothing matched the built-in library yet, so this import will lean more heavily on custom sections.",
  );

  pushCompatibility(
    compatibility,
    "Custom carry-over",
    customFieldCount > 0 ? "review" : "ready",
    customFieldCount > 0
      ? `${customFieldCount} field${customFieldCount === 1 ? "" : "s"} will stay in a custom imported section until you tighten them later.`
      : "Everything in this draft matched reusable sections cleanly.",
  );

  return {
    method: state.method,
    methodLabel: methodLabels[state.method],
    sourceLabel: state.sourceLabel,
    sourceTitle: state.sourceTitle,
    sourceKind: state.sourceKind,
    sourceType: state.sourceType,
    blueprint,
    compatibility,
    recommendedNextStep:
      state.sourceKind === "image" || state.sourceKind === "pdf" || state.sourceKind === "camera"
        ? state.sourceType.toLowerCase().startsWith("native-pdf-text:")
          ? "Save the import once the field list looks right, then fine-tune labels or sections in the form editor if needed."
          : state.sourceType.toLowerCase().startsWith("native-pdf-ocr:")
            ? "Review the OCR wording page by page, then save the import and fine-tune labels or section grouping in the form editor."
            : "Review extracted wording, then save the import and fine-tune the field labels in the form editor."
        : state.method === "webpage"
          ? "Check the imported field list for navigation or helper text, then save the form and trim anything extra."
          : "Save the import once the mapping looks right, then adjust sections in the form editor if you want a cleaner public flow.",
  };
}
