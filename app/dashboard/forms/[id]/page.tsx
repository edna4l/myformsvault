import Link from "next/link";
import { notFound } from "next/navigation";

import { getBaseUrl, getFormById, parseFields } from "@/lib/forms";

export const dynamic = "force-dynamic";

type FormDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function FormDetailPage({ params, searchParams }: FormDetailPageProps) {
  const route = await params;
  const query = await searchParams;
  const form = await getFormById(route.id);

  if (!form) {
    notFound();
  }

  const publicUrl = `${getBaseUrl()}/f/${form.slug}`;
  const fields = parseFields(form.fields);

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Form detail</span>
            <h1>{form.name}</h1>
            <p>{form.description}</p>
          </div>
          <div className="button-row">
            <Link href={`/f/${form.slug}`} className="button button-primary">
              Open public form
            </Link>
            <Link href="/dashboard" className="button button-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>

        {query.created === "1" ? (
          <div className="notice success">The form is created and ready to share.</div>
        ) : null}

        <div className="detail-grid">
          <section className="detail-stack">
            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Share link</span>
                  <h2>Public URL</h2>
                </div>
                <span
                  className="status-pill"
                  style={{
                    background: `${form.accent}20`,
                    color: form.accent,
                  }}
                >
                  {form.status.toLowerCase()}
                </span>
              </div>
              <p className="mono" style={{ marginTop: "1rem" }}>
                {publicUrl}
              </p>
            </div>

            <div className="surface-card">
              <span className="eyebrow">Fields</span>
              <h2>What this form collects</h2>
              <ul className="field-list" style={{ marginTop: "1rem" }}>
                {fields.map((field) => (
                  <li key={field.name}>
                    <strong>{field.label}</strong>
                    <div className="field-hint">
                      {field.type} field
                      {field.required ? " · required" : " · optional"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Submissions</span>
            <h2>Recent responses</h2>
            <div className="detail-stack" style={{ marginTop: "1rem" }}>
              {form.submissions.length === 0 ? (
                <div className="empty-state">
                  <strong>No submissions yet</strong>
                  <p>Open the public form and send a test submission to populate this feed.</p>
                </div>
              ) : (
                form.submissions.map((submission) => (
                  <article key={submission.id} className="submission-item">
                    <div className="list-row">
                      <strong>{submission.fullName}</strong>
                      <span className="meta-item">{formatDate(submission.createdAt)}</span>
                    </div>
                    <div className="list-copy">
                      {submission.email}
                      {submission.company ? ` · ${submission.company}` : ""}
                    </div>
                    <p className="submission-copy" style={{ marginTop: "0.6rem" }}>
                      {submission.goals}
                    </p>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
