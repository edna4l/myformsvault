import Link from "next/link";

import { DashboardSearchPanel } from "@/app/dashboard/dashboard-search-panel";
import { SecurityMfaPanel } from "@/app/dashboard/security/security-mfa-panel";

export const dynamic = "force-dynamic";

export default function SecurityPage() {
  return (
    <main className="app-shell workbench-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Security</span>
            <h1>Protect account access with optional two-factor authentication.</h1>
            <p>
              Enroll an authenticator app, verify a TOTP challenge, keep recovery codes, or disable
              2FA when it is no longer needed.
            </p>
          </div>
          <div className="dashboard-header-tools">
            <DashboardSearchPanel />
            <div className="button-row">
              <Link href="/dashboard" className="button button-secondary">
                Dashboard
              </Link>
              <Link href="/dashboard?view=activity" className="button button-ghost">
                Activity
              </Link>
            </div>
          </div>
        </div>

        <section className="form-surface">
          <SecurityMfaPanel />
        </section>
      </div>
    </main>
  );
}
