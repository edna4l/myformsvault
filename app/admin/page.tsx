import Link from "next/link";

import { getAdminDashboardData } from "@/lib/admin";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    action?: string;
    from?: string;
    status?: string;
    to?: string;
  }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const result = await getAdminDashboardData({
    action: params.action,
    from: params.from,
    subscriptionStatus: params.status,
    to: params.to,
  });

  if (!result.isAdmin || !result.stats) {
    return (
      <main className="app-shell workbench-shell">
        <div className="dashboard-shell">
          <div className="surface-card">
            <span className="eyebrow">Admin</span>
            <h1>Admin access is restricted.</h1>
            <p style={{ marginTop: "0.8rem" }}>
              Sign in with an approved admin email or add your email to the admins table or
              ADMIN_EMAILS environment variable.
            </p>
            <Link href="/dashboard" className="button button-secondary" style={{ marginTop: "1rem" }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { stats } = result;

  return (
    <main className="app-shell workbench-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Admin</span>
            <h1>Business and security control center.</h1>
            <p>Monitor usage, subscription health, recent signups, and audited account activity.</p>
          </div>
          <div className="button-row">
            <Link href="/dashboard" className="button button-secondary">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="metric-grid metric-grid-wide">
          <div className="metric-card">
            <span className="metric-label">Users</span>
            <strong className="metric-value">{stats.totalUsers}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Templates</span>
            <strong className="metric-value">{stats.totalTemplates}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Pro subscribers</span>
            <strong className="metric-value">{stats.proSubscribers}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">MRR</span>
            <strong className="metric-value">{formatMoney(stats.mrrCents)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Recent signups</span>
            <strong className="metric-value">{stats.recentSignups.length}</strong>
          </div>
        </div>

        <div className="detail-grid">
          <section className="surface-card admin-table-card">
            <div className="list-row">
              <div>
                <span className="eyebrow">Subscriptions</span>
                <h2>Status and revenue</h2>
              </div>
              <form className="admin-filter-row">
                <select name="status" defaultValue={params.status ?? ""} aria-label="Subscription status">
                  <option value="">All statuses</option>
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past due</option>
                  <option value="canceled">Canceled</option>
                </select>
                <button type="submit" className="button button-secondary">
                  Filter
                </button>
              </form>
            </div>
            <div className="admin-table">
              <div className="admin-table-row is-heading">
                <span>Email</span>
                <span>Status</span>
                <span>Plan</span>
                <span>Amount</span>
              </div>
              {stats.subscriptions.length === 0 ? (
                <div className="empty-state">
                  <strong>No subscriptions yet</strong>
                  <p>Subscription records will appear here after billing is connected.</p>
                </div>
              ) : (
                stats.subscriptions.map((subscription) => (
                  <div key={subscription.id} className="admin-table-row">
                    <span>{subscription.profile?.email ?? subscription.userId}</span>
                    <span>{subscription.status}</span>
                    <span>{subscription.plan}</span>
                    <span>{formatMoney(subscription.amountCents)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Recent signups</span>
            <h2>New profiles</h2>
            <div className="detail-stack" style={{ marginTop: "1rem" }}>
              {stats.recentSignups.map((profile) => (
                <article key={profile.id} className="list-card compact-card">
                  <strong>{profile.email}</strong>
                  <p className="list-copy">{formatDate(profile.createdAt)}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>

        <section className="surface-card admin-audit-panel">
          <div className="list-row">
            <div>
              <span className="eyebrow">Audit log</span>
              <h2>Security-sensitive events</h2>
            </div>
            <form className="activity-filters">
              <select name="action" defaultValue={params.action ?? ""} aria-label="Audit action">
                <option value="">All actions</option>
                <option value="sign-in">Sign in</option>
                <option value="template_created">Template created</option>
                <option value="template_completed">Template completed</option>
                <option value="vault_field_updated">Vault updated</option>
                <option value="invite_sent">Invite sent</option>
                <option value="subscription_started">Subscription started</option>
                <option value="2fa_enabled">2FA enabled</option>
              </select>
              <input name="from" type="date" defaultValue={params.from ?? ""} aria-label="From date" />
              <input name="to" type="date" defaultValue={params.to ?? ""} aria-label="To date" />
              <button type="submit" className="button button-secondary">
                Filter
              </button>
            </form>
          </div>
          <div className="activity-list">
            {stats.auditLogs.length === 0 ? (
              <div className="empty-state">
                <strong>No audit events yet</strong>
                <p>The audit table is ready for sign-in, vault, template, subscription, and 2FA events.</p>
              </div>
            ) : (
              stats.auditLogs.map((log) => (
                <article key={log.id} className="activity-item">
                  <div>
                    <strong>{log.action.replaceAll("_", " ")}</strong>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                  <p>
                    {log.userId ?? "system"} · {log.targetType}
                    {log.targetId ? ` · ${log.targetId}` : ""}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
