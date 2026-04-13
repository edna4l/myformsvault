import Link from "next/link";

import { importFormAction } from "@/app/actions";
import { buildImportedFormBlueprint, getTemplateCategoryLabel } from "@/lib/forms";

export const dynamic = "force-dynamic";

const sampleImportText = `Student Name
Date of Birth
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

type ImportPageProps = {
  searchParams: Promise<{
    error?: string;
    draft?: string;
  }>;
};

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const sourceText = params.draft?.trim() ? params.draft : sampleImportText;
  const blueprint = buildImportedFormBlueprint(sourceText);
  const errorMessage =
    params.error === "slug"
      ? "That slug is already taken. Try a different public URL."
      : params.error === "validation"
        ? "Paste the source fields and add the form details before importing."
        : null;

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Import form</span>
            <h1>Turn a downloaded or scanned form into a reusable vault-ready blueprint.</h1>
            <p>
              This first pass accepts pasted field text from OCR, PDFs, or copied forms. The app
              maps what it recognizes into reusable sections and keeps unmatched prompts in an
              imported custom section.
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

        <div className="detail-grid">
          <section className="form-surface">
            <div>
              <span className="eyebrow">Step 1</span>
              <h2 style={{ marginTop: "0.85rem" }}>Paste field text to preview the mapping</h2>
              <p style={{ marginTop: "0.6rem" }}>
                Use field labels from a downloaded PDF, copied webpage, or OCR output from a scan.
                One line per field works best.
              </p>
            </div>

            <form method="GET" className="form-grid">
              <label className="field field-full">
                <span>Source field text</span>
                <textarea
                  name="draft"
                  rows={14}
                  defaultValue={sourceText}
                  placeholder="Student Name&#10;Date of Birth&#10;School Name&#10;Allergies&#10;Emergency Contact Phone"
                  required
                />
              </label>
              <div className="field-full button-row">
                <button type="submit" className="button button-secondary">
                  Preview mapping
                </button>
              </div>
            </form>

            {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

            <div style={{ marginTop: "1rem" }}>
              <span className="eyebrow">Step 2</span>
              <h2 style={{ marginTop: "0.85rem" }}>Create the imported form</h2>
              <p style={{ marginTop: "0.6rem" }}>
                Once the mapping looks good, save it as a real form. You can edit sections after
                import if you want to tighten the final public flow.
              </p>
            </div>

            <form action={importFormAction} className="form-grid">
              <input type="hidden" name="sourceText" value={sourceText} />
              <label className="field">
                <span>Form name</span>
                <input name="name" type="text" defaultValue="Imported family intake" required />
              </label>
              <label className="field">
                <span>Public slug</span>
                <input name="slug" type="text" defaultValue="imported-family-intake" required />
              </label>
              <label className="field field-full">
                <span>Headline</span>
                <input
                  name="headline"
                  type="text"
                  defaultValue="Complete the imported intake form without retyping every section."
                  required
                />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue="This imported form was mapped from an outside source and grouped into reusable sections where possible."
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
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Mapping preview</span>
            <h2>{getTemplateCategoryLabel(blueprint.category)} import</h2>
            <div className="stack-list">
              <div className="section-chip">
                <strong>Recognized reusable sections</strong>
                <p>{blueprint.matchedSections.length} section(s) matched from the source text.</p>
              </div>
              {blueprint.matchedSections.map((section) => (
                <div key={section.id} className="section-chip">
                  <strong>{section.title}</strong>
                  <p>{section.description}</p>
                </div>
              ))}
              {blueprint.customSection ? (
                <div className="section-chip">
                  <strong>{blueprint.customSection.title}</strong>
                  <p>{blueprint.customSection.fields.length} imported field(s) stayed custom.</p>
                </div>
              ) : null}
              {blueprint.unmappedLabels.length > 0 ? (
                <div className="section-chip">
                  <strong>Unmapped field labels</strong>
                  <p>{blueprint.unmappedLabels.join(", ")}</p>
                </div>
              ) : null}
              <div className="section-chip">
                <strong>Current limitation</strong>
                <p>
                  This importer maps pasted field text. Direct PDF upload, OCR extraction, and scan
                  parsing are the next layer we can build on top of this.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
