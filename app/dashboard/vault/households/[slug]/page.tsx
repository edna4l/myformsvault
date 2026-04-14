import Link from "next/link";
import { notFound } from "next/navigation";

import { getHouseholdSummaryBySlug } from "@/lib/forms";

export const dynamic = "force-dynamic";

type HouseholdDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, candidate]) => [key, `${candidate ?? ""}`]),
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function HouseholdDetailPage({ params }: HouseholdDetailPageProps) {
  const route = await params;
  const household = await getHouseholdSummaryBySlug(route.slug);

  if (!household) {
    notFound();
  }

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Household view</span>
            <h1>{household.householdName}</h1>
            <p>
              Keep this household organized as one reusable unit, then jump into each member record
              whenever a school, medical, or care form needs a more specific update.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/vault" className="button button-secondary">
              Back to vault
            </Link>
            <Link href="/dashboard/templates" className="button button-secondary">
              Browse templates
            </Link>
            <Link href="/dashboard/import" className="button button-ghost">
              Import outside form
            </Link>
          </div>
        </div>

        <div className="metric-grid metric-grid-wide">
          <div className="metric-card">
            <span className="metric-label">Members</span>
            <strong className="metric-value">{household.memberCount}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">School Ready</span>
            <strong className="metric-value">{household.stats.schoolProfiles}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Medical Ready</span>
            <strong className="metric-value">{household.stats.medicalProfiles}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Emergency Ready</span>
            <strong className="metric-value">{household.stats.emergencyProfiles}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Updated</span>
            <strong className="metric-value" style={{ fontSize: "1.4rem" }}>
              {formatDate(household.lastUpdated)}
            </strong>
          </div>
        </div>

        <div className="detail-grid" style={{ marginTop: "1.25rem" }}>
          <section className="detail-stack">
            <div className="surface-card">
              <div className="list-row">
                <div>
                  <span className="eyebrow">Members</span>
                  <h2>Reusable profiles in this household</h2>
                </div>
                <span className="meta-item">
                  {household.memberCount} saved member{household.memberCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="detail-stack" style={{ marginTop: "1rem" }}>
                {household.members.map((member) => {
                  const basic = getRecord(member.basicInfo);
                  const school = getRecord(member.schoolInfo);
                  const medical = getRecord(member.medicalInfo);
                  const emergency = getRecord(member.emergencyInfo);

                  return (
                    <article key={member.id} className="list-card">
                      <div className="list-row">
                        <div>
                          <div className="list-title">{member.fullName}</div>
                          <div className="list-copy">{member.relationship || "Family member profile"}</div>
                        </div>
                        <span className="meta-item">Updated {formatDate(member.updatedAt)}</span>
                      </div>

                      <div className="stack-list compact-list">
                        {basic.dateOfBirth ? <p>Date of birth: {basic.dateOfBirth}</p> : null}
                        {school.schoolName ? <p>School: {school.schoolName}</p> : null}
                        {school.gradeLevel ? <p>Grade: {school.gradeLevel}</p> : null}
                        {medical.physician ? <p>Physician: {medical.physician}</p> : null}
                        {emergency.contactName ? <p>Emergency contact: {emergency.contactName}</p> : null}
                      </div>

                      <div className="button-row">
                        <Link href={`/dashboard/vault/${member.id}/edit`} className="button button-secondary">
                          Edit profile
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="detail-stack">
            <div className="surface-card">
              <span className="eyebrow">Shared signals</span>
              <h2>What this household already covers</h2>
              <div className="stack-list" style={{ marginTop: "1rem" }}>
                <div className="section-chip">
                  <strong>Relationships</strong>
                  <p>
                    {household.relationships.length > 0
                      ? household.relationships.join(", ")
                      : "Relationship labels will show up here as you save them."}
                  </p>
                </div>
                <div className="section-chip">
                  <strong>Schools</strong>
                  <p>
                    {household.schools.length > 0
                      ? household.schools.join(", ")
                      : "School details will appear here once one of the member profiles includes them."}
                  </p>
                </div>
                <div className="section-chip">
                  <strong>Emergency contacts</strong>
                  <p>
                    {household.emergencyContacts.length > 0
                      ? household.emergencyContacts.join(", ")
                      : "Emergency contact coverage will appear here after you save it on a member profile."}
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card">
              <span className="eyebrow">Next moves</span>
              <h2>Put this household to work</h2>
              <div className="stack-list" style={{ marginTop: "1rem" }}>
                <p>
                  Start a new form from the template library, or import outside paperwork and reuse
                  the profiles already saved for this household.
                </p>
                <div className="button-row">
                  <Link href="/dashboard/forms/new" className="button button-primary">
                    Build from template
                  </Link>
                  <Link href="/dashboard/import" className="button button-secondary">
                    Import outside form
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
