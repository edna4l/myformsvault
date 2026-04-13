import Link from "next/link";
import { notFound } from "next/navigation";

import { getBaseUrl, getFamilyMembers, getFormById, getSubmissionPreview, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

type FormDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
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
  const [form, familyMembers] = await Promise.all([getFormById(route.id), getFamilyMembers()]);

  if (!form) {
    notFound();
  }

  const publicUrl = `${getBaseUrl()}/f/${form.slug}`;
  const sections = parseSections(form.sections ?? form.fields);

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
            <Link href={`/dashboard/forms/${form.id}/edit`} className="button button-secondary">
              Edit form
            </Link>
            <Link href="/dashboard" className="button button-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>

        {query.created === "1" ? (
          <div className="notice success">The form is created and ready to share.</div>
        ) : null}
        {query.updated === "1" ? (
          <div className="notice success">The form changes are live and ready to use.</div>
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
              <div className="list-row">
                <div>
                  <span className="eyebrow">Sections</span>
                  <h2>What this form collects</h2>
                </div>
                <span className="meta-item">{sections.length} sections</span>
              </div>
              <div className="stack-list" style={{ marginTop: "1rem" }}>
                {sections.map((section) => (
                  <div key={section.id} className="section-chip">
                    <strong>{section.title}</strong>
                    <p>{section.description}</p>
                    <div className="field-pill-row">
                      {section.fields.map((field) => (
                        <span key={field.key} className="field-pill">
                          {field.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Autofill preview</span>
                  <h2>Try this form with saved family data</h2>
                </div>
                <Link href="/dashboard/vault" className="button button-ghost">
                  Manage vault
                </Link>
              </div>
              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {familyMembers.length === 0 ? (
                  <div className="empty-state">
                    <strong>No family profiles saved yet</strong>
                    <p>Add a family member record and preview how their saved details map into this form.</p>
                  </div>
                ) : (
                  familyMembers.map((member) => (
                    <article key={member.id} className="list-card compact-card">
                      <div className="list-row">
                        <strong>{member.fullName}</strong>
                        <span className="meta-item">{member.householdName}</span>
                      </div>
                      <p className="list-copy">{member.relationship || "Reusable family profile"}</p>
                      <Link href={`/f/${form.slug}?member=${member.id}`} className="button button-secondary">
                        Preview with saved data
                      </Link>
                    </article>
                  ))
                )}
              </div>
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
                form.submissions.map((submission) => {
                  const preview = getSubmissionPreview(submission);

                  return (
                    <article key={submission.id} className="submission-item">
                      <div className="list-row">
                        <strong>{preview.title}</strong>
                        <span className="meta-item">{formatDate(submission.createdAt)}</span>
                      </div>
                      {preview.subtitle ? <div className="list-copy">{preview.subtitle}</div> : null}
                      {preview.summary ? (
                        <p className="submission-copy" style={{ marginTop: "0.6rem" }}>
                          {preview.summary}
                        </p>
                      ) : null}
                      {preview.responses.length > 0 ? (
                        <div className="response-grid">
                          {preview.responses.map((response) => (
                            <div key={`${submission.id}-${response.key}`} className="response-item">
                              <span>{response.label}</span>
                              <strong>{response.value}</strong>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
