import Link from "next/link";

import { getBaseUrl, getDashboardData } from "@/lib/forms";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const data = await getDashboardData();

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Dashboard</span>
            <h1>Your form system is live enough to build on.</h1>
            <p>
              You now have a real local database, public form routes, and a homepage capture flow.
              This is a much better first commit than a starter template.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/forms/new" className="button button-primary">
              New form
            </Link>
            <Link href="/" className="button button-secondary">
              View homepage
            </Link>
          </div>
        </div>

        {params.created === "1" ? (
          <div className="notice success">Your form is ready. Share it or start collecting responses.</div>
        ) : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span className="metric-label">Forms</span>
            <strong className="metric-value">{data.metrics.forms}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Live forms</span>
            <strong className="metric-value">{data.metrics.liveForms}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Submissions</span>
            <strong className="metric-value">{data.metrics.submissions}</strong>
          </div>
        </div>

        <div className="dashboard-grid" style={{ marginTop: "1.25rem" }}>
          <section className="dashboard-column">
            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Forms</span>
                  <h2>Published intake pages</h2>
                </div>
                <Link href="/dashboard/forms/new" className="button button-ghost">
                  Add one
                </Link>
              </div>

              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {data.forms.map((form) => (
                  <article key={form.id} className="list-card">
                    <div className="list-row">
                      <div>
                        <div className="list-title">{form.name}</div>
                        <div className="list-copy">{form.description}</div>
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
                    <div className="list-meta">
                      <span>{form._count.submissions} submissions</span>
                      <span>Updated {formatDate(form.updatedAt)}</span>
                      <span className="mono">{getBaseUrl()}/f/{form.slug}</span>
                    </div>
                    <div className="button-row">
                      <Link href={`/dashboard/forms/${form.id}`} className="button button-secondary">
                        View detail
                      </Link>
                      <Link href={`/f/${form.slug}`} className="button button-ghost">
                        Open public form
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="dashboard-column">
            <div className="surface-card">
              <span className="eyebrow">Recent leads</span>
              <h2>Homepage requests</h2>
              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {data.leads.length === 0 ? (
                  <div className="empty-state">
                    <strong>No leads yet</strong>
                    <p>Use the homepage form to capture the first request.</p>
                  </div>
                ) : (
                  data.leads.map((lead) => (
                    <article key={lead.id} className="list-card">
                      <div className="list-row">
                        <strong>{lead.name}</strong>
                        <span className="meta-item">{lead.teamSize ?? "new lead"}</span>
                      </div>
                      <div className="list-copy">
                        {lead.email}
                        {lead.company ? ` · ${lead.company}` : ""}
                      </div>
                      <p className="submission-copy">{lead.message}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
