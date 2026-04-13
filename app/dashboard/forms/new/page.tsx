import Link from "next/link";

import { createFormAction } from "@/app/actions";
import { getTemplateCatalog, getTemplateCategoryLabel, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

type NewFormPageProps = {
  searchParams: Promise<{
    error?: string;
    template?: string;
  }>;
};

export default async function NewFormPage({ searchParams }: NewFormPageProps) {
  const params = await searchParams;
  const templates = await getTemplateCatalog();
  const selectedTemplate =
    templates.find((template) => template.slug === params.template) ?? templates[0];
  const sections = selectedTemplate ? parseSections(selectedTemplate.sections) : [];

  const errorMessage =
    params.error === "slug"
      ? "That slug is already taken. Try a different public URL."
      : params.error === "validation"
        ? "A few fields or sections still need attention."
        : null;

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Create form</span>
            <h1>Start from a strong template, then keep only the sections you need.</h1>
            <p>
              This is the first version of the form editing framework: choose a template, adjust
              the metadata, and launch a form with reusable section blocks instead of a one-off
              field list.
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
            {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

            <div className="template-tab-row">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  href={`/dashboard/forms/new?template=${template.slug}`}
                  className={`template-tab${template.slug === selectedTemplate?.slug ? " is-active" : ""}`}
                >
                  <strong>{template.name}</strong>
                  <span>{getTemplateCategoryLabel(template.category)}</span>
                </Link>
              ))}
            </div>

            {selectedTemplate ? (
              <form action={createFormAction} className="form-grid" style={{ marginTop: "1.4rem" }}>
                <input type="hidden" name="templateSlug" value={selectedTemplate.slug} />
                <label className="field">
                  <span>Form name</span>
                  <input name="name" type="text" defaultValue={selectedTemplate.name} required />
                </label>
                <label className="field">
                  <span>Public slug</span>
                  <input name="slug" type="text" defaultValue={selectedTemplate.slug} required />
                </label>
                <label className="field field-full">
                  <span>Headline</span>
                  <input
                    name="headline"
                    type="text"
                    defaultValue={`Complete the ${selectedTemplate.name.toLowerCase()} in one pass.`}
                    required
                  />
                </label>
                <label className="field field-full">
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={selectedTemplate.description}
                    required
                  />
                </label>
                <label className="field">
                  <span>Accent color</span>
                  <input name="accent" type="text" defaultValue={selectedTemplate.accent} required />
                </label>
                <div className="field field-full">
                  <span>Included sections</span>
                  <div className="section-selector-grid">
                    {sections.map((section) => (
                      <label key={section.id} className="section-toggle">
                        <input type="checkbox" name="sectionIds" value={section.id} defaultChecked />
                        <div>
                          <strong>{section.title}</strong>
                          <p>{section.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field-full button-row">
                  <button type="submit" className="button button-primary">
                    Create and publish
                  </button>
                  <Link href="/dashboard/templates" className="button button-ghost">
                    Switch template
                  </Link>
                </div>
              </form>
            ) : null}
          </section>

          {selectedTemplate ? (
            <aside className="surface-card">
              <span className="eyebrow">Selected template</span>
              <h2>{selectedTemplate.name}</h2>
              <p style={{ marginTop: "0.8rem" }}>{selectedTemplate.overview}</p>
              <div className="stack-list" style={{ marginTop: "1rem" }}>
                {sections.map((section) => (
                  <div key={section.id} className="section-chip">
                    <strong>{section.title}</strong>
                    <p>{section.fields.length} mapped fields</p>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}
