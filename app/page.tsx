import Link from "next/link";

import { captureLeadAction } from "./actions";

type HomePageProps = {
  searchParams: Promise<{
    submitted?: string;
  }>;
};

const launchStats = [
  { value: "01", label: "Template library" },
  { value: "02", label: "Family vault" },
  { value: "03", label: "Editable public forms" },
];

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const submitted = params.submitted === "1";

  return (
    <main className="app-shell">
      <section className="hero-surface">
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark">MF</span>
            <span>myformsvault</span>
          </Link>
          <nav className="topbar-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/templates">Templates</Link>
            <Link href="/dashboard/vault">Family vault</Link>
            <Link href="/dashboard/import">Import</Link>
            <Link href="/dashboard/forms/new" className="button button-secondary">
              Create form
            </Link>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Form operations, designed for momentum</span>
            <h1>Launch a polished intake flow before your coffee gets cold.</h1>
            <p className="lede">
              myformsvault now gives you a template library, a reusable family-information vault,
              and editable public forms so the same school, medical, and household details do not
              have to be re-entered every time a new packet shows up.
            </p>
            <div className="button-row">
              <Link href="/dashboard" className="button button-primary">
                Open dashboard
              </Link>
              <Link href="/dashboard/templates" className="button button-secondary">
                Browse templates
              </Link>
              <Link href="/dashboard/import" className="button button-secondary">
                Import a form
              </Link>
              <Link href="/dashboard/forms/new" className="button button-ghost">
                Start a new form
              </Link>
            </div>
            <div className="stat-grid">
              {launchStats.map((item) => (
                <div key={item.label} className="stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-glow" />
            <div className="surface-card">
              <span className="eyebrow">Launch stack</span>
              <h2>From template library to reusable family data in one app.</h2>
              <ul className="feature-list">
                <li>Indexed templates for school, medical, care, and intake workflows</li>
                <li>Family member records with reusable basic, school, and medical info</li>
                <li>Public share links with editable section-based form layouts</li>
              </ul>
            </div>
            <div className="surface-card offset-card">
              <span className="chip">MVP focus</span>
              <p>
                The app now runs on Supabase-backed Prisma with a first-pass form builder, so the
                homepage, dashboard, template library, and public forms all share the same live data
                foundation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-grid">
        <div className="surface-card">
          <span className="eyebrow">What this first pass includes</span>
          <h2>A homepage, a dashboard, a template library, and reusable family records.</h2>
          <p>
            This is the right moment to shape the product around reusable information blocks. The
            app can now store family data once and project it into more than one form structure.
          </p>
        </div>
        <div className="surface-card">
          <span className="eyebrow">Default workflow</span>
          <div className="stack-list">
            <div>
              <strong>1. Save family data</strong>
              <p>Use the family vault to capture the most repeated information once.</p>
            </div>
            <div>
              <strong>2. Choose a template</strong>
              <p>Start from school, medical, care, or intake templates instead of a blank page.</p>
            </div>
            <div>
              <strong>3. Import outside forms</strong>
              <p>Paste OCR or downloaded field text and map it into reusable sections.</p>
            </div>
            <div>
              <strong>4. Publish and review</strong>
              <p>Share the public form, then review submissions and autofill previews from one place.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-grid">
        <div className="surface-card">
          <span className="eyebrow">Capture a launch request</span>
          <h2>Start collecting leads on day one.</h2>
          <p>
            This form writes straight into the live Supabase-backed datastore so the dashboard can
            reflect real submissions immediately.
          </p>
        </div>

        <div className="form-surface">
          {submitted ? (
            <div className="notice success">
              Your request is saved. The dashboard will show it in the recent leads feed.
            </div>
          ) : null}
          <form action={captureLeadAction} className="form-grid">
            <label className="field">
              <span>Name</span>
              <input name="name" type="text" placeholder="Edna" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label className="field">
              <span>Company</span>
              <input name="company" type="text" placeholder="Studio name" />
            </label>
            <label className="field">
              <span>Team size</span>
              <select name="teamSize" defaultValue="1-3">
                <option value="1-3">1-3 people</option>
                <option value="4-10">4-10 people</option>
                <option value="11-25">11-25 people</option>
                <option value="26+">26+ people</option>
              </select>
            </label>
            <label className="field field-full">
              <span>What should myformsvault help you organize?</span>
              <textarea
                name="message"
                rows={5}
                placeholder="Lead capture, onboarding, vendor requests, client intake..."
                required
              />
            </label>
            <div className="field-full button-row">
              <button type="submit" className="button button-primary">
                Save request
              </button>
              <Link href="/dashboard" className="button button-ghost">
                See dashboard
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
