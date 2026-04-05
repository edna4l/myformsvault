import Link from "next/link";

import { createFormAction } from "@/app/actions";

type NewFormPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewFormPage({ searchParams }: NewFormPageProps) {
  const params = await searchParams;
  const errorMessage =
    params.error === "slug"
      ? "That slug is already taken. Try a different public URL."
      : params.error === "validation"
        ? "A few fields still need attention."
        : null;

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Create form</span>
            <h1>Spin up a public intake page in one pass.</h1>
            <p>
              Start with a strong default. You can tune field sets and workflow rules after the
              first version is live.
            </p>
          </div>
          <Link href="/dashboard" className="button button-secondary">
            Back to dashboard
          </Link>
        </div>

        <div className="detail-grid">
          <section className="form-surface">
            {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}
            <form action={createFormAction} className="form-grid">
              <label className="field">
                <span>Form name</span>
                <input name="name" type="text" placeholder="Discovery call" required />
              </label>
              <label className="field">
                <span>Public slug</span>
                <input name="slug" type="text" placeholder="discovery-call" required />
              </label>
              <label className="field field-full">
                <span>Headline</span>
                <input
                  name="headline"
                  type="text"
                  placeholder="Tell us what the next project needs to accomplish."
                  required
                />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Explain what the form is for and what respondents should expect next."
                  required
                />
              </label>
              <label className="field">
                <span>Accent color</span>
                <input name="accent" type="text" defaultValue="#ef6f34" required />
              </label>
              <label className="field">
                <span>Preset</span>
                <select name="preset" defaultValue="lead">
                  <option value="lead">Lead intake</option>
                  <option value="client">Client onboarding</option>
                </select>
              </label>
              <div className="field-full button-row">
                <button type="submit" className="button button-primary">
                  Create and publish
                </button>
                <Link href="/dashboard" className="button button-ghost">
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <aside className="surface-card">
            <span className="eyebrow">What gets created</span>
            <h2>One public page, one share link, one dashboard record.</h2>
            <div className="stack-list">
              <div>
                <strong>Lead intake preset</strong>
                <p>Great for sales requests, partnerships, or demo inquiries.</p>
              </div>
              <div>
                <strong>Client onboarding preset</strong>
                <p>Better for kickoff context, project intake, and onboarding details.</p>
              </div>
              <div>
                <strong>Stored automatically</strong>
                <p>Every form and submission is written to the local Prisma database.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
