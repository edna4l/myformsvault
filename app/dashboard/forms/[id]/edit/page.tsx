import Link from "next/link";
import { notFound } from "next/navigation";

import { updateFormAction } from "@/app/actions";
import { getFormById, getSectionCatalog, getTemplateCatalog, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

type EditFormPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditFormPage({ params, searchParams }: EditFormPageProps) {
  const route = await params;
  const query = await searchParams;
  const [form, templates] = await Promise.all([getFormById(route.id), getTemplateCatalog()]);

  if (!form) {
    notFound();
  }

  const activeSections = new Set(parseSections(form.sections ?? form.fields).map((section) => section.id));
  const sectionCatalog = getSectionCatalog();
  const errorMessage =
    query.error === "slug"
      ? "That slug is already taken. Try a different public URL."
      : query.error === "validation"
        ? "A few required fields or sections still need attention."
        : null;

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Edit form</span>
            <h1>Refine the sections and metadata without rebuilding the form.</h1>
            <p>
              Use this editor to keep the public URL stable while you change the template, trim
              sections, or reshape the information this form collects.
            </p>
          </div>
          <div className="button-row">
            <Link href={`/dashboard/forms/${form.id}`} className="button button-secondary">
              Back to detail
            </Link>
            <Link href="/dashboard/templates" className="button button-ghost">
              Browse templates
            </Link>
          </div>
        </div>

        <section className="form-surface">
          {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

          <form action={updateFormAction} className="form-grid">
            <input type="hidden" name="id" value={form.id} />
            <label className="field">
              <span>Form name</span>
              <input name="name" type="text" defaultValue={form.name} required />
            </label>
            <label className="field">
              <span>Public slug</span>
              <input name="slug" type="text" defaultValue={form.slug} required />
            </label>
            <label className="field field-full">
              <span>Headline</span>
              <input name="headline" type="text" defaultValue={form.headline} required />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea name="description" rows={4} defaultValue={form.description} required />
            </label>
            <label className="field">
              <span>Accent color</span>
              <input name="accent" type="text" defaultValue={form.accent} required />
            </label>
            <label className="field">
              <span>Source template</span>
              <select name="templateSlug" defaultValue={form.template?.slug ?? templates[0]?.slug}>
                {templates.map((template) => (
                  <option key={template.id} value={template.slug}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field field-full">
              <span>Active sections</span>
              <div className="section-selector-grid">
                {sectionCatalog.map((section) => (
                  <label key={section.id} className="section-toggle">
                    <input
                      type="checkbox"
                      name="sectionIds"
                      value={section.id}
                      defaultChecked={activeSections.has(section.id)}
                    />
                    <div>
                      <strong>{section.title}</strong>
                      <p>
                        {section.description} · {section.fieldCount} fields
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="field-full button-row">
              <button type="submit" className="button button-primary">
                Save form changes
              </button>
              <Link href={`/dashboard/forms/${form.id}`} className="button button-ghost">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
