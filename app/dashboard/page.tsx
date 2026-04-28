import Link from "next/link";

import { DashboardSearchPanel } from "@/app/dashboard/dashboard-search-panel";
import { getCurrentUserAuditLog } from "@/lib/audit";
import { getBaseUrl, getDashboardData, getTemplateCategoryLabel } from "@/lib/forms";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    created?: string;
    action?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
};

type CalendarEvent = {
  color: string;
  day: number;
  familyMemberName: string;
  href: string;
  id: string;
  templateName: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDay.getDay();

  return {
    days: Array.from({ length: daysInMonth }, (_, index) => index + 1),
    leadingDays: Array.from({ length: leadingDays }, (_, index) => index),
    label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(firstDay),
  };
}

function memberColor(index: number) {
  const colors = ["#5b6ee1", "#0f9f6e", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

  return colors[index % colors.length];
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const data = await getDashboardData();
  const activeView =
    params.view === "calendar" || params.view === "activity" ? params.view : "overview";
  const activityLogs =
    activeView === "activity"
      ? await getCurrentUserAuditLog({
          action: params.action,
          from: params.from,
          to: params.to,
        })
      : [];
  const currentMonth = getMonthDays(new Date());
  const calendarMembers = data.familyMembers.length > 0 ? data.familyMembers : null;
  const calendarEvents: CalendarEvent[] = data.templates.map((template, index) => {
    const member = calendarMembers?.[index % calendarMembers.length] ?? null;
    const day = ((index * 5 + 3) % currentMonth.days.length) + 1;

    return {
      color: member ? memberColor(index % calendarMembers!.length) : template.accent,
      day,
      familyMemberName: member?.fullName ?? "General",
      href: `/dashboard/forms/new?template=${template.slug}`,
      id: template.id,
      templateName: template.name,
    };
  });
  const eventsByDay = new Map<number, CalendarEvent[]>();

  for (const event of calendarEvents) {
    const existing = eventsByDay.get(event.day) ?? [];
    existing.push(event);
    eventsByDay.set(event.day, existing);
  }

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Dashboard</span>
            <h1>Build reusable family-ready forms, not one-off paperwork.</h1>
            <p>
              The app now has a template library, a family vault, and editable section-based forms
              so the same core details can be reused across school, medical, care, and intake
              workflows.
            </p>
          </div>
          <div className="dashboard-header-tools">
            <DashboardSearchPanel />
            <div className="button-row">
              <Link href="/dashboard/templates" className="button button-primary">
                Browse templates
              </Link>
              <Link href="/dashboard/import" className="button button-secondary">
                Import outside form
              </Link>
              <Link href="/dashboard/vault" className="button button-secondary">
                Open family vault
              </Link>
              <Link href="/dashboard/security" className="button button-secondary">
                Security
              </Link>
              <Link href="/" className="button button-ghost">
                View homepage
              </Link>
            </div>
          </div>
        </div>

        {params.created === "1" ? (
          <div className="notice success">Your form is ready. Share it or start collecting responses.</div>
        ) : null}

        <div className="dashboard-view-tabs" role="tablist" aria-label="Dashboard views">
          <Link
            href="/dashboard"
            role="tab"
            aria-selected={activeView === "overview"}
            className={`dashboard-view-tab${activeView === "overview" ? " is-active" : ""}`}
          >
            Overview
          </Link>
          <Link
            href="/dashboard?view=calendar"
            role="tab"
            aria-selected={activeView === "calendar"}
            className={`dashboard-view-tab${activeView === "calendar" ? " is-active" : ""}`}
          >
            Calendar
          </Link>
          <Link
            href="/dashboard?view=activity"
            role="tab"
            aria-selected={activeView === "activity"}
            className={`dashboard-view-tab${activeView === "activity" ? " is-active" : ""}`}
          >
            Activity
          </Link>
        </div>

        {activeView === "calendar" ? (
          <section className="surface-card dashboard-calendar-panel">
            <div className="list-row">
              <div>
                <span className="eyebrow">Calendar</span>
                <h2>{currentMonth.label}</h2>
              </div>
              <Link href="/dashboard/templates" className="button button-ghost">
                View templates
              </Link>
            </div>
            <div className="calendar-legend">
              {(calendarMembers ?? []).map((member, index) => (
                <span key={member.id} className="calendar-legend-item">
                  <span style={{ background: memberColor(index) }} />
                  {member.fullName}
                </span>
              ))}
              {!calendarMembers ? (
                <span className="calendar-legend-item">
                  <span style={{ background: "#5b6ee1" }} />
                  General
                </span>
              ) : null}
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {currentMonth.leadingDays.map((day) => (
                <div key={`empty-${day}`} className="calendar-cell is-empty" />
              ))}
              {currentMonth.days.map((day) => {
                const events = eventsByDay.get(day) ?? [];

                return (
                  <details key={day} className="calendar-cell">
                    <summary>
                      <span>{day}</span>
                      {events.length > 0 ? (
                        <strong>
                          {events.length} due
                        </strong>
                      ) : null}
                    </summary>
                    {events.length > 0 ? (
                      <div className="calendar-events">
                        {events.map((event) => (
                          <Link
                            key={event.id}
                            href={event.href}
                            className="calendar-event"
                            style={{ borderColor: event.color }}
                          >
                            <span style={{ background: event.color }} />
                            <strong>{event.templateName}</strong>
                            <small>{event.familyMemberName}</small>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p>No forms due.</p>
                    )}
                  </details>
                );
              })}
            </div>
          </section>
        ) : activeView === "activity" ? (
          <section className="surface-card activity-panel">
            <div className="list-row">
              <div>
                <span className="eyebrow">Activity</span>
                <h2>Your recent vault and template events</h2>
              </div>
              <form className="activity-filters">
                <input type="hidden" name="view" value="activity" />
                <select name="action" defaultValue={params.action ?? ""} aria-label="Filter by action">
                  <option value="">All actions</option>
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
              {activityLogs.length === 0 ? (
                <div className="empty-state">
                  <strong>No activity yet</strong>
                  <p>Template completions and vault updates will appear here once the audit table is live.</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <article key={log.id} className="activity-item">
                    <div>
                      <strong>{log.action.replaceAll("_", " ")}</strong>
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                    <p>
                      {log.targetType}
                      {log.targetId ? ` · ${log.targetId}` : ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <>
        <div className="metric-grid metric-grid-wide">
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
          <div className="metric-card">
            <span className="metric-label">Templates</span>
            <strong className="metric-value">{data.metrics.templates}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Family members</span>
            <strong className="metric-value">{data.metrics.familyMembers}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Households</span>
            <strong className="metric-value">{data.metrics.households}</strong>
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
                <div className="button-row">
                  <Link href="/dashboard/import" className="button button-ghost">
                    Import form
                  </Link>
                  <Link href="/dashboard/forms/new" className="button button-ghost">
                    Build from template
                  </Link>
                </div>
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
                      <Link href={`/dashboard/forms/${form.id}/edit`} className="button button-ghost">
                        Edit form
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

          <aside className="dashboard-column dashboard-side-column">
            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Template index</span>
                  <h2>Common form types</h2>
                </div>
                <Link href="/dashboard/templates" className="button button-ghost">
                  See all
                </Link>
              </div>
              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {data.templates.slice(0, 3).map((template) => (
                  <article key={template.id} className="list-card compact-card">
                    <div className="list-row">
                      <strong>{template.name}</strong>
                      <span
                        className="status-pill"
                        style={{
                          background: `${template.accent}20`,
                          color: template.accent,
                        }}
                      >
                        {getTemplateCategoryLabel(template.category)}
                      </span>
                    </div>
                    <p className="list-copy">{template.overview}</p>
                    <Link href={`/dashboard/forms/new?template=${template.slug}`} className="button button-secondary">
                      Use template
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Family vault</span>
                  <h2>Household groups</h2>
                </div>
                <Link href="/dashboard/vault" className="button button-ghost">
                  Open vault
                </Link>
              </div>
              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {data.households.length === 0 ? (
                  <div className="empty-state">
                    <strong>No households yet</strong>
                    <p>Add one member and the vault will start organizing the family records automatically.</p>
                  </div>
                ) : (
                  data.households.map((household) => (
                    <article key={household.slug} className="list-card compact-card">
                      <div className="list-row">
                        <strong>{household.householdName}</strong>
                        <span className="meta-item">
                          {household.memberCount} member{household.memberCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="list-copy">
                        {household.stats.schoolProfiles} school, {household.stats.medicalProfiles} medical, and{" "}
                        {household.stats.emergencyProfiles} emergency profile
                        {household.memberCount === 1 ? "" : "s"} ready to reuse.
                      </p>
                      <Link
                        href={`/dashboard/vault/households/${household.slug}`}
                        className="button button-secondary"
                      >
                        View household
                      </Link>
                    </article>
                  ))
                )}
              </div>
            </div>

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
                    <article key={lead.id} className="list-card compact-card">
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
          </>
        )}
      </div>
    </main>
  );
}
