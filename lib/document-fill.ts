import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  rgb,
} from "pdf-lib";

import type { FamilyMember } from "@/generated/prisma/client";
import {
  fillProfileKeys,
  normalizeFillText,
  resolveFillProfileKey,
} from "@/lib/fill-profile-fields";
import { getFamilyAutofillValues } from "@/lib/forms";
import { MAX_IMPORT_UPLOAD_BYTES } from "@/lib/import-sources";

export const MAX_ORIGINAL_FILL_UPLOAD_BYTES = MAX_IMPORT_UPLOAD_BYTES;

export type OriginalFillPlacementKind = "check" | "highlight" | "text" | "x";

type FillOriginalResult =
  | {
      ok: true;
      bytes: Uint8Array;
      filledCount: number;
      totalFields: number;
      unmatchedFields: string[];
    }
  | {
      ok: false;
      error: "invalid-pdf" | "not-fillable" | "no-profile-values" | "no-matches" | "no-placements";
      totalFields?: number;
      unmatchedFields?: string[];
    };

export type OriginalFillPlacement = {
  kind?: OriginalFillPlacementKind;
  profileKey?: string;
  x: number;
  y: number;
  pageIndex?: number;
  fontSize?: number;
  width?: number;
  height?: number;
};

type OriginalFileKind = "pdf" | "png" | "jpg" | "unsupported";

function buildProfileValues(member: FamilyMember) {
  const values = {
    ...getFamilyAutofillValues(member),
    "household.name": member.householdName,
    "basic.relationship": member.relationship ?? "",
  };

  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()));
}

function selectPdfChoice(field: PDFDropdown | PDFOptionList | PDFRadioGroup, value: string) {
  const options = field.getOptions();
  const normalizedValue = normalizeFillText(value);
  const selected = options.find((option) => normalizeFillText(option) === normalizedValue);

  if (!selected) {
    return false;
  }

  field.select(selected);
  return true;
}

function shouldCheck(value: string) {
  const normalized = normalizeFillText(value);
  return Boolean(normalized) && !["no", "none", "false", "n/a", "na"].includes(normalized);
}

function fillField(field: unknown, value: string) {
  if (field instanceof PDFTextField) {
    field.setText(value);
    return true;
  }

  if (field instanceof PDFDropdown || field instanceof PDFOptionList || field instanceof PDFRadioGroup) {
    return selectPdfChoice(field, value);
  }

  if (field instanceof PDFCheckBox && shouldCheck(value)) {
    field.check();
    return true;
  }

  return false;
}

export function getOriginalFileKind(file: File): OriginalFileKind {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (fileType === "image/png" || fileName.endsWith(".png")) {
    return "png";
  }

  if (
    fileType === "image/jpeg" ||
    fileType === "image/jpg" ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg")
  ) {
    return "jpg";
  }

  return "unsupported";
}

function normalizeManualMappings(fieldMappings: Record<string, string> | undefined) {
  if (!fieldMappings) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fieldMappings).filter(
      ([fieldName, profileKey]) => fieldName.trim() && fillProfileKeys.has(profileKey),
    ),
  );
}

function normalizePlacementNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizePlacementKind(value: unknown): OriginalFillPlacementKind {
  if (value === "check" || value === "highlight" || value === "x") {
    return value;
  }

  return "text";
}

function normalizePlacementSize(value: unknown, fallback: number, max: number) {
  const parsed = normalizePlacementNumber(value, fallback);

  return Math.min(Math.max(parsed, 0.01), max);
}

function normalizePlacements(placements: OriginalFillPlacement[] | undefined) {
  if (!placements) {
    return [];
  }

  return placements
    .map((placement) => {
      const kind = normalizePlacementKind(placement.kind);
      const profileKey = `${placement.profileKey ?? ""}`.trim();

      if (kind === "text" && !fillProfileKeys.has(profileKey)) {
        return null;
      }

      return {
        fontSize:
          kind === "text"
            ? Math.min(Math.max(normalizePlacementNumber(placement.fontSize, 11), 7), 28)
            : Math.min(Math.max(normalizePlacementNumber(placement.fontSize, 16), 8), 36),
        height: normalizePlacementSize(placement.height, kind === "highlight" ? 0.035 : 0.03, 1),
        kind,
        pageIndex: Math.max(Math.trunc(normalizePlacementNumber(placement.pageIndex, 0)), 0),
        profileKey: fillProfileKeys.has(profileKey) ? profileKey : "",
        width: normalizePlacementSize(placement.width, kind === "highlight" ? 0.18 : 0.03, 1),
        x: Math.min(Math.max(normalizePlacementNumber(placement.x, 0), 0), 1),
        y: Math.min(Math.max(normalizePlacementNumber(placement.y, 0), 0), 1),
      };
    })
    .filter((placement): placement is NonNullable<typeof placement> => Boolean(placement));
}

type NormalizedPlacement = ReturnType<typeof normalizePlacements>[number];

function drawCheckMark(
  page: ReturnType<PDFDocument["getPages"]>[number],
  x: number,
  y: number,
  size: number,
) {
  const color = rgb(0.04, 0.06, 0.09);
  const thickness = Math.max(size * 0.11, 1.4);
  const midX = x - size * 0.12;
  const midY = y - size * 0.28;

  page.drawLine({
    color,
    end: { x: midX, y: midY },
    start: { x: x - size * 0.38, y: y - size * 0.03 },
    thickness,
  });
  page.drawLine({
    color,
    end: { x: x + size * 0.42, y: y + size * 0.34 },
    start: { x: midX, y: midY },
    thickness,
  });
}

function drawXMark(
  page: ReturnType<PDFDocument["getPages"]>[number],
  x: number,
  y: number,
  size: number,
) {
  const color = rgb(0.04, 0.06, 0.09);
  const halfSize = size * 0.38;
  const thickness = Math.max(size * 0.1, 1.35);

  page.drawLine({
    color,
    end: { x: x + halfSize, y: y + halfSize },
    start: { x: x - halfSize, y: y - halfSize },
    thickness,
  });
  page.drawLine({
    color,
    end: { x: x + halfSize, y: y - halfSize },
    start: { x: x - halfSize, y: y + halfSize },
    thickness,
  });
}

function drawHighlight(page: ReturnType<PDFDocument["getPages"]>[number], placement: NormalizedPlacement) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const width = Math.max(placement.width * pageWidth, 8);
  const height = Math.max(placement.height * pageHeight, 6);
  const x = placement.x * pageWidth;
  const y = pageHeight - placement.y * pageHeight - height;

  page.drawRectangle({
    color: rgb(1, 0.92, 0.18),
    height,
    opacity: 0.38,
    width,
    x,
    y: Math.max(y, 0),
  });
}

async function drawOriginalPlacements(
  pdfDoc: PDFDocument,
  profileValues: Record<string, string>,
  placements: ReturnType<typeof normalizePlacements>,
) {
  if (placements.length === 0) {
    return 0;
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  let filledCount = 0;

  for (const placement of placements) {
    const page = pages[placement.pageIndex];

    if (!page) {
      continue;
    }

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const x = placement.x * pageWidth;
    const y = pageHeight - placement.y * pageHeight;

    if (placement.kind === "check") {
      drawCheckMark(page, x, y, placement.fontSize);
      filledCount += 1;
      continue;
    }

    if (placement.kind === "x") {
      drawXMark(page, x, y, placement.fontSize);
      filledCount += 1;
      continue;
    }

    if (placement.kind === "highlight") {
      drawHighlight(page, placement);
      filledCount += 1;
      continue;
    }

    const value = profileValues[placement.profileKey]?.trim();

    if (!value) {
      continue;
    }

    page.drawText(value.replace(/\s+/g, " "), {
      color: rgb(0.05, 0.06, 0.08),
      font,
      maxWidth: Math.max(pageWidth - x - 24, 80),
      size: placement.fontSize,
      x,
      y: Math.max(y - placement.fontSize * 0.8, 8),
    });

    filledCount += 1;
  }

  return filledCount;
}

async function createImagePdf(file: File, kind: "png" | "jpg") {
  const pdfDoc = await PDFDocument.create();
  const imageBytes = await file.arrayBuffer();
  const image = kind === "png" ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
  const { width, height } = image.scale(1);
  const page = pdfDoc.addPage([width, height]);

  page.drawImage(image, {
    height,
    width,
    x: 0,
    y: 0,
  });

  return pdfDoc;
}

export async function createOriginalPdfCopy(file: File, kind = getOriginalFileKind(file)) {
  if (kind === "pdf") {
    return new Uint8Array(await file.arrayBuffer());
  }

  if (kind === "png" || kind === "jpg") {
    return (await createImagePdf(file, kind)).save();
  }

  return null;
}

export async function fillOriginalPdf(
  file: File,
  member: FamilyMember,
  options: {
    fieldMappings?: Record<string, string>;
    placements?: OriginalFillPlacement[];
  } = {},
): Promise<FillOriginalResult> {
  const profileValues = buildProfileValues(member);
  const kind = getOriginalFileKind(file);
  const placements = normalizePlacements(options.placements);

  if (kind === "png" || kind === "jpg") {
    try {
      const pdfDoc = await createImagePdf(file, kind);

      if (placements.length === 0) {
        return {
          ok: true,
          bytes: await pdfDoc.save(),
          filledCount: 0,
          totalFields: 0,
          unmatchedFields: [],
        };
      }

      const filledCount = await drawOriginalPlacements(pdfDoc, profileValues, placements);

      if (filledCount === 0) {
        return { ok: false, error: "no-matches", totalFields: placements.length };
      }

      return {
        ok: true,
        bytes: await pdfDoc.save(),
        filledCount,
        totalFields: placements.length,
        unmatchedFields: [],
      };
    } catch {
      return { ok: false, error: "invalid-pdf" };
    }
  }

  let pdfDoc: PDFDocument;

  try {
    pdfDoc = await PDFDocument.load(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "invalid-pdf" };
  }

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  if (fields.length === 0 && placements.length === 0) {
    return {
      ok: true,
      bytes: await pdfDoc.save(),
      filledCount: 0,
      totalFields: 0,
      unmatchedFields: [],
    };
  }

  const unmatchedFields: string[] = [];
  const manualMappings = normalizeManualMappings(options.fieldMappings);
  let filledCount = 0;

  if (fields.length > 0) {
    for (const field of fields) {
      const fieldName = field.getName();
      const manualKey = manualMappings[fieldName];
      const profileKey =
        manualKey && profileValues[manualKey] ? manualKey : resolveFillProfileKey(fieldName, profileValues);

      if (!profileKey) {
        unmatchedFields.push(fieldName);
        continue;
      }

      if (fillField(field, profileValues[profileKey])) {
        filledCount += 1;
      } else {
        unmatchedFields.push(fieldName);
      }
    }

    form.updateFieldAppearances();
  }

  filledCount += await drawOriginalPlacements(pdfDoc, profileValues, placements);

  if (filledCount === 0) {
    return { ok: false, error: "no-matches", totalFields: fields.length + placements.length, unmatchedFields };
  }

  return {
    ok: true,
    bytes: await pdfDoc.save(),
    filledCount,
    totalFields: fields.length + placements.length,
    unmatchedFields,
  };
}

export function getFilledDocumentFilename(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "filled-form";
  return `${baseName}-filled.pdf`;
}
