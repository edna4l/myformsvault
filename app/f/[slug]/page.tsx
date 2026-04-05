import Link from "next/link";
import { notFound } from "next/navigation";

import { submitPublicFormAction } from "@/app/actions";
import { getFormBySlug, parseFields } from "@/lib/forms";

export const dynamic = "force-dynamic";

type PublicFormPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function PublicFormPage({ params, searchParams }: PublicFormPageProps) {
  const route = await params;
  const query = await searchParams;
  const form = await getFormBySlug(route.slug);

  if (!form) {
    notFound();
  }

  const fields = parseFields(form.fields);
  const hasError = query.error === "submission";
  const isSubmitted = query.submitted === "1";

  return (
    <main className="public-form-shell">
      <header className="public-form-hero">
        <div className="pill-row">
          <Link href="/" className="brand">
            <span className="brand-mark">MF</span>
            <span>myformsvault</span>
          </Link>
          <span
            className="status-pill"
            style={{
              background: `${form.accent}20`,
              color: form.accent,
            }}
          >
            public form
          </span>
        </div>
        <div style={{ marginTop: "1.1rem" }}>
          <h1>{form.headline}</h1>
          <p style={{ marginTop: "0.9rem", maxWidth: "60ch" }}>{form.description}</p>
        </div>
      </header>

      <section className="public-form-card">
        {isSubmitted ? (
          <div className="notice success">
            Submission received. Head back to the dashboard to review it.
          </div>
        ) : null}
        {hasError ? (
          <div className="notice warning">A couple of required fields still need attention.</div>
        ) : null}

        <form action={submitPublicFormAction} className="public-form">
          <input type="hidden" name="slug" value={form.slug} />
          {fields.map((field) => (
            <label className="field" key={field.name}>
              <span>{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  rows={6}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </label>
          ))}

          <div className="button-row">
            <button type="submit" className="button button-primary">
              Submit form
            </button>
            <Link href="/dashboard" className="button button-ghost">
              View dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
