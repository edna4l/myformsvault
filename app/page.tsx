import Link from "next/link";

import { captureLeadAction } from "./actions";

type HomePageProps = {
  searchParams: Promise<{
    submitted?: string;
  }>;
};

const launchStats = [
  { value: "01", label: "Homepage + lead capture" },
  { value: "02", label: "Dashboard + form inventory" },
  { value: "03", label: "Public intake pages" },
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
              myformsvault gives you a public-facing homepage, a clean dashboard, and reusable
              forms that push submissions into one place so your team can move without spreadsheet
              sprawl.
            </p>
            <div className="button-row">
              <Link href="/dashboard" className="button button-primary">
                Open dashboard
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
              <h2>From homepage to submissions in one repo.</h2>
              <ul className="feature-list">
                <li>Branded homepage with a demo capture form</li>
                <li>Dashboard summaries for forms, leads, and recent submissions</li>
                <li>Public share links for client intake or lead capture</li>
              </ul>
            </div>
            <div className="surface-card offset-card">
              <span className="chip">MVP focus</span>
              <p>
                The app now runs on Prisma backed by Supabase Postgres, so the homepage, dashboard,
                and public forms all share the same live data foundation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-grid">
        <div className="surface-card">
          <span className="eyebrow">What this first pass includes</span>
          <h2>A homepage, a dashboard, and forms that already talk to a database.</h2>
          <p>
            This is the right moment to shape the product, not just wire infrastructure. The first
            meaningful commit should contain the real skeleton you are about to build on.
          </p>
        </div>
        <div className="surface-card">
          <span className="eyebrow">Default workflow</span>
          <div className="stack-list">
            <div>
              <strong>1. Capture interest</strong>
              <p>Use the homepage form to collect leads and inbound requests.</p>
            </div>
            <div>
              <strong>2. Publish forms</strong>
              <p>Create public intake pages from the dashboard.</p>
            </div>
            <div>
              <strong>3. Review submissions</strong>
              <p>Track form performance and recent responses from one place.</p>
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
