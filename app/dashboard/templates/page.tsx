import Link from "next/link";

import { getTemplateCatalog, getTemplateCategoryLabel, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function TemplateLibraryPage() {
  const templates = await getTemplateCatalog();

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Template library</span>
            <h1>Indexed form templates for the workflows people use most.</h1>
            <p>
              Start from a reusable school, medical, care, or intake template, then edit sections
              instead of rebuilding each form from scratch.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/vault" className="button button-secondary">
              Open family vault
            </Link>
            <Link href="/dashboard" className="button button-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="template-grid">
          {templates.map((template) => {
            const sections = parseSections(template.sections);

            return (
              <article key={template.id} className="surface-card template-card">
                <div className="list-row">
                  <div>
                    <span className="eyebrow">{getTemplateCategoryLabel(template.category)}</span>
                    <h2 style={{ marginTop: "0.85rem" }}>{template.name}</h2>
                  </div>
                  <span
                    className="status-pill"
                    style={{
                      background: `${template.accent}20`,
                      color: template.accent,
                    }}
                  >
                    {sections.length} sections
                  </span>
                </div>
                <p style={{ marginTop: "1rem" }}>{template.overview}</p>
                <div className="stack-list" style={{ marginTop: "1rem" }}>
                  {sections.map((section) => (
                    <div key={section.id} className="section-chip">
                      <strong>{section.title}</strong>
                      <p>{section.description}</p>
                    </div>
                  ))}
                </div>
                <div className="button-row" style={{ marginTop: "1.2rem" }}>
                  <Link href={`/dashboard/forms/new?template=${template.slug}`} className="button button-primary">
                    Use template
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
