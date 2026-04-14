import Link from "next/link";

import { importFormAction, prepareImportSourceAction } from "@/app/actions";
import { getTemplateCategoryLabel, normalizeSlug } from "@/lib/forms";
import {
  buildImportDraftSummary,
  normalizeImportMethod,
  type ImportMethod,
} from "@/lib/import-sources";

export const dynamic = "force-dynamic";

const sampleImportText = `Student Name
Date of Birth
Street Address
Mailing Address
School Name
Grade Level
Student ID
Allergies
Medications
Primary Physician
Insurance Provider
Emergency Contact Name
Emergency Contact Phone
Authorized Pickup Notes
Additional Instructions`;

const importMethods: Array<{
  id: ImportMethod;
  title: string;
  description: string;
  eyebrow: string;
}> = [
  {
    id: "application",
    title: "Copy from another app",
    description:
      "Paste field labels from Adobe, Microsoft, or any other app that lets you copy form content.",
    eyebrow: "Fastest setup",
  },
  {
    id: "webpage",
    title: "Import from a webpage",
    description:
      "Fetch a public form page directly, then clean up the mapped fields before saving.",
    eyebrow: "Public URLs",
  },
  {
    id: "file",
    title: "Upload a file",
    description:
      "Bring in text, HTML, CSV, JSON, PDFs, or exported form files from your device, including scanned PDFs.",
    eyebrow: "Documents",
  },
  {
    id: "camera",
    title: "Use a photo or scan",
    description:
      "Capture paperwork from a phone or scanner and let the app try OCR before you need any backup text.",
    eyebrow: "CamScanner-style",
  },
];

function buildDefaultImportName(sourceTitle: string, method: ImportMethod) {
  if (sourceTitle.trim()) {
    return sourceTitle;
  }

  if (method === "webpage") {
    return "Imported website form";
  }

  if (method === "file") {
    return "Imported uploaded form";
  }

  if (method === "camera") {
    return "Imported scan form";
  }

  return "Imported application form";
}

function getErrorMessage(error?: string) {
  if (error === "slug") {
    return "That slug is already taken. Try a different public URL.";
  }

  if (error === "url") {
    return "Use a public http or https webpage URL. Local or private network addresses are blocked for safety.";
  }

  if (error === "fetch") {
    return "That page could not be fetched cleanly. Try again or paste the visible form text from the page.";
  }

  if (error === "ocr") {
    return "The app could not extract enough text from that file on its own. Add companion OCR text or try a cleaner scan.";
  }

  if (error === "validation") {
    return "Add the outside form source first so the importer has field text to map.";
  }

  return null;
}

type ImportPageProps = {
  searchParams: Promise<{
    draft?: string;
    error?: string;
    method?: string;
    sourceKind?: string;
    sourceLabel?: string;
    sourceTitle?: string;
    sourceType?: string;
    usedFallbackText?: string;
  }>;
};

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const activeMethod = normalizeImportMethod(params.method);
  const sourceText = params.draft?.trim()
    ? params.draft.trim()
    : activeMethod === "application"
      ? sampleImportText
      : "";
  const sourceLabel =
    params.sourceLabel?.trim() ||
    (activeMethod === "application"
      ? "Copied application form"
      : activeMethod === "webpage"
        ? "Public webpage"
        : activeMethod === "camera"
          ? "Captured scan"
          : "Uploaded form");
  const sourceTitle =
    params.sourceTitle?.trim() || buildDefaultImportName(sourceLabel, activeMethod);
  const summary = buildImportDraftSummary({
    method: activeMethod,
    draft: sourceText,
    sourceLabel,
    sourceTitle,
    sourceKind:
      params.sourceKind === "webpage" ||
      params.sourceKind === "document" ||
      params.sourceKind === "pdf" ||
      params.sourceKind === "image" ||
      params.sourceKind === "camera"
        ? params.sourceKind
        : activeMethod === "webpage"
          ? "webpage"
          : activeMethod === "camera"
            ? "camera"
            : activeMethod === "file"
              ? "document"
              : "application",
    sourceType: params.sourceType?.trim() || "manual-text",
    usedFallbackText: params.usedFallbackText === "1",
  });
  const errorMessage = getErrorMessage(params.error);
  const defaultName = buildDefaultImportName(sourceTitle, activeMethod);
  const defaultSlug = normalizeSlug(defaultName) || "imported-form";

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Import studio</span>
            <h1>
              Bring outside forms in from webpages, apps, files, or scans and turn them into
              reusable vault-ready flows.
            </h1>
            <p>
              This import studio now accepts copied app text, public webpages, uploaded files, and
              photo or scanner workflows. The app will now try native text extraction for PDFs,
              built-in OCR for images, and scanned-PDF OCR by rendering each page when no text
              layer is present before falling back to copied companion text. It will map what it
              recognizes into reusable sections, keep unmatched prompts in custom sections, and flag
              the cleanup step each source still needs.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/templates" className="button button-secondary">
              Browse templates
            </Link>
            <Link href="/dashboard" className="button button-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="import-method-grid">
          {importMethods.map((method) => (
            <Link
              key={method.id}
              href={`/dashboard/import?method=${method.id}`}
              className={`import-method-card${method.id === activeMethod ? " is-active" : ""}`}
            >
              <span className="eyebrow">{method.eyebrow}</span>
              <strong>{method.title}</strong>
              <p>{method.description}</p>
            </Link>
          ))}
        </div>

        {errorMessage ? (
          <div className="notice warning" style={{ marginTop: "1.25rem" }}>
            {errorMessage}
          </div>
        ) : null}

        <div className="detail-grid" style={{ marginTop: "1.25rem" }}>
          <section className="form-surface import-step-stack">
            <div>
              <span className="eyebrow">Step 1</span>
              <h2 style={{ marginTop: "0.85rem" }}>Prepare the outside form source</h2>
              <p style={{ marginTop: "0.6rem" }}>
                Start with the source you actually have. The importer will adapt its compatibility
                checks depending on whether you are pulling from copied text, a live webpage, an
                uploaded document, or a scan that still needs OCR cleanup.
              </p>
            </div>

            {activeMethod === "application" ? (
              <form action={prepareImportSourceAction} className="form-grid">
                <input type="hidden" name="method" value="application" />
                <label className="field field-full">
                  <span>Copied field text</span>
                  <textarea
                    name="sourceText"
                    rows={14}
                    defaultValue={sourceText || sampleImportText}
                    placeholder={
                      "Student Name\nDate of Birth\nStreet Address\nMailing Address\nEmergency Contact Phone"
                    }
                    required
                  />
                </label>
                <div className="field-full button-row">
                  <button type="submit" className="button button-secondary">
                    Preview mapping
                  </button>
                </div>
              </form>
            ) : null}

            {activeMethod === "webpage" ? (
              <form action={prepareImportSourceAction} className="form-grid">
                <input type="hidden" name="method" value="webpage" />
                <label className="field field-full">
                  <span>Public form URL</span>
                  <input
                    name="pageUrl"
                    type="url"
                    defaultValue={params.sourceLabel?.startsWith("http") ? params.sourceLabel : ""}
                    placeholder="https://example.com/enrollment-form"
                    required
                  />
                </label>
                <label className="field field-full">
                  <span>Fallback copied text</span>
                  <textarea
                    name="sourceText"
                    rows={8}
                    defaultValue={params.usedFallbackText === "1" ? sourceText : ""}
                    placeholder="Paste visible field labels here if the webpage is login-protected or app-rendered."
                  />
                </label>
                <div className="field-full button-row">
                  <button type="submit" className="button button-secondary">
                    Fetch and preview
                  </button>
                </div>
              </form>
            ) : null}

            {activeMethod === "file" ? (
              <form action={prepareImportSourceAction} className="form-grid">
                <input type="hidden" name="method" value="file" />
                <label className="field field-full">
                  <span>Upload a document</span>
                  <input
                    name="sourceFile"
                    type="file"
                    accept=".txt,.csv,.json,.xml,.html,.htm,.md,application/json,text/*,application/pdf,image/*"
                  />
                </label>
                <label className="field field-full">
                  <span>Companion text if native extraction misses anything</span>
                  <textarea
                    name="sourceText"
                    rows={8}
                    defaultValue={params.usedFallbackText === "1" ? sourceText : ""}
                    placeholder="Optional: paste OCR or copied text only if the built-in extraction misses labels from a PDF, screenshot, or exported form."
                  />
                </label>
                <div className="field-full button-row">
                  <button type="submit" className="button button-secondary">
                    Preview upload
                  </button>
                </div>
              </form>
            ) : null}

            {activeMethod === "camera" ? (
              <form action={prepareImportSourceAction} className="form-grid">
                <input type="hidden" name="method" value="camera" />
                <label className="field field-full">
                  <span>Capture or upload a scan</span>
                  <input
                    name="sourceFile"
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                  />
                </label>
                <label className="field field-full">
                  <span>Optional OCR backup text</span>
                  <textarea
                    name="sourceText"
                    rows={8}
                    defaultValue={params.usedFallbackText === "1" ? sourceText : ""}
                    placeholder="The app will try OCR first. Use this only if you want to paste extra text from CamScanner, Live Text, or another scanner app."
                  />
                </label>
                <div className="field-full button-row">
                  <button type="submit" className="button button-secondary">
                    Preview scan
                  </button>
                </div>
              </form>
            ) : null}

            <div style={{ marginTop: "1rem" }}>
              <span className="eyebrow">Step 2</span>
              <h2 style={{ marginTop: "0.85rem" }}>Create the imported form</h2>
              <p style={{ marginTop: "0.6rem" }}>
                Once the mapping looks good, save it as a real form. You can still edit sections,
                rename fields, and trim imported custom sections afterward.
              </p>
            </div>

            {sourceText ? (
              <form action={importFormAction} className="form-grid">
                <input type="hidden" name="sourceText" value={sourceText} />
                <label className="field">
                  <span>Form name</span>
                  <input name="name" type="text" defaultValue={defaultName} required />
                </label>
                <label className="field">
                  <span>Public slug</span>
                  <input name="slug" type="text" defaultValue={defaultSlug} required />
                </label>
                <label className="field field-full">
                  <span>Headline</span>
                  <input
                    name="headline"
                    type="text"
                    defaultValue={`Complete the ${defaultName.toLowerCase()} without retyping every section.`}
                    required
                  />
                </label>
                <label className="field field-full">
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={`This form was imported from ${summary.methodLabel.toLowerCase()} and grouped into reusable sections where possible.`}
                    required
                  />
                </label>
                <label className="field">
                  <span>Accent color</span>
                  <input name="accent" type="text" defaultValue="#5b6ee1" required />
                </label>
                <div className="field-full button-row">
                  <button type="submit" className="button button-primary">
                    Create imported form
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-state">
                <strong>No prepared source yet</strong>
                <p>
                  Prepare the outside form first so the importer can generate a mapped draft.
                </p>
              </div>
            )}
          </section>

          <aside className="surface-card import-sidebar">
            <span className="eyebrow">Source snapshot</span>
            <h2>{summary.sourceTitle}</h2>
            <div className="import-source-meta">
              <div className="section-chip">
                <strong>Method</strong>
                <p>{summary.methodLabel}</p>
              </div>
              <div className="section-chip">
                <strong>Source</strong>
                <p>{summary.sourceLabel}</p>
              </div>
              <div className="section-chip">
                <strong>Type</strong>
                <p>{summary.sourceType}</p>
              </div>
            </div>

            <div className="stack-list">
              <div>
                <span className="eyebrow">Compatibility</span>
                <div className="compatibility-grid">
                  {summary.compatibility.map((item) => (
                    <article key={item.title} className="compatibility-item">
                      <div className="list-row">
                        <strong>{item.title}</strong>
                        <span className={`status-pill status-${item.status}`}>
                          {item.status.replace("-", " ")}
                        </span>
                      </div>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="section-chip">
                <strong>Recommended next step</strong>
                <p>{summary.recommendedNextStep}</p>
              </div>

              {summary.blueprint ? (
                <>
                  <div className="section-chip">
                    <strong>Mapped category</strong>
                    <p>{getTemplateCategoryLabel(summary.blueprint.category)} import</p>
                  </div>
                  <div className="section-chip">
                    <strong>Recognized reusable sections</strong>
                    <p>
                      {summary.blueprint.matchedSections.length} section(s) matched from the source.
                    </p>
                  </div>
                  {summary.blueprint.matchedSections.map((section) => (
                    <div key={section.id} className="section-chip">
                      <strong>{section.title}</strong>
                      <p>{section.description}</p>
                    </div>
                  ))}
                  {summary.blueprint.customSection ? (
                    <div className="section-chip">
                      <strong>{summary.blueprint.customSection.title}</strong>
                      <p>
                        {summary.blueprint.customSection.fields.length} field(s) will stay custom
                        after import.
                      </p>
                    </div>
                  ) : null}
                  {summary.blueprint.unmappedLabels.length > 0 ? (
                    <div className="section-chip">
                      <strong>Unmapped labels</strong>
                      <p>{summary.blueprint.unmappedLabels.join(", ")}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">
                  <strong>Preview will appear here</strong>
                  <p>
                    Once the source is prepared, the importer will show which reusable sections
                    match and what still needs custom handling.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
