import Link from "next/link";

import { createFamilyMemberAction } from "@/app/actions";
import { FamilyMemberForm } from "@/app/dashboard/vault/member-form";
import { getFamilyMembers, getHouseholdSummaries } from "@/lib/forms";

export const dynamic = "force-dynamic";

type FamilyVaultPageProps = {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
    updated?: string;
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

export default async function FamilyVaultPage({ searchParams }: FamilyVaultPageProps) {
  const params = await searchParams;
  const [members, households] = await Promise.all([getFamilyMembers(), getHouseholdSummaries()]);
  const errorMessage = params.error === "validation" ? "A few required details still need attention." : null;
  const created = params.created === "1";
  const updated = params.updated === "1";
  const deleted = params.deleted === "1";

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Family vault</span>
            <h1>Enter a family member once, then reuse their information everywhere.</h1>
            <p>
              Store the basic, school, medical, insurance, and emergency sections that most forms
              ask for repeatedly. Templates can then prefill from these records instead of asking
              users to start over.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/templates" className="button button-secondary">
              Browse templates
            </Link>
            <Link href="/dashboard" className="button button-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="detail-grid">
          <section className="form-surface">
            {created ? <div className="notice success">Family member saved and ready for autofill previews.</div> : null}
            {updated ? <div className="notice success">Family member updated and ready to reuse.</div> : null}
            {deleted ? <div className="notice success">Family member deleted from the vault.</div> : null}
            {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

            <div className="stack-list" style={{ marginBottom: "1rem" }}>
              <div>
                <span className="eyebrow">New record</span>
                <h2 style={{ marginTop: "0.85rem" }}>Add a reusable member profile</h2>
                <p>
                  This first pass is structured around the most repeated sections: basic info,
                  school info, medical info, insurance, and emergency contacts.
                </p>
              </div>
            </div>

            <FamilyMemberForm action={createFamilyMemberAction} submitLabel="Save member profile" />
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Households</span>
            <h2>Organized family records</h2>
            <div className="detail-stack" style={{ marginTop: "1rem" }}>
              {households.length === 0 ? (
                <div className="empty-state">
                  <strong>No households yet</strong>
                  <p>
                    The first profile you add here will be available in form detail previews, public
                    forms, and grouped into a household automatically.
                  </p>
                </div>
              ) : (
                households.map((household) => (
                  <article key={household.slug} className="list-card compact-card">
                    <div className="list-row">
                      <strong>{household.householdName}</strong>
                      <span className="meta-item">
                        {household.memberCount} member{household.memberCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="stack-list compact-list">
                      <p>
                        {household.stats.schoolProfiles} school, {household.stats.medicalProfiles} medical,{" "}
                        {household.stats.insuranceProfiles} insurance, and {household.stats.emergencyProfiles}{" "}
                        emergency-ready profile{household.memberCount === 1 ? "" : "s"}.
                      </p>
                      {household.schools.length > 0 ? <p>Schools: {household.schools.join(", ")}</p> : null}
                      {household.emergencyContacts.length > 0 ? (
                        <p>Emergency contacts: {household.emergencyContacts.join(", ")}</p>
                      ) : null}
                    </div>
                    <div className="button-row">
                      <Link
                        href={`/dashboard/vault/households/${household.slug}`}
                        className="button button-secondary"
                      >
                        Open household
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="detail-stack" style={{ marginTop: "1.5rem" }}>
              <div>
                <span className="eyebrow">Member profiles</span>
                <h2 style={{ marginTop: "0.85rem" }}>Ready for autofill</h2>
              </div>

              {members.length === 0 ? (
                <div className="empty-state">
                  <strong>No family members yet</strong>
                  <p>Saved profiles will appear here with quick links back into editing.</p>
                </div>
              ) : (
                members.map((member) => {
                  const basic = getRecord(member.basicInfo);
                  const school = getRecord(member.schoolInfo);
                  const emergency = getRecord(member.emergencyInfo);

                  return (
                    <article key={member.id} className="list-card compact-card">
                      <div className="list-row">
                        <strong>{member.fullName}</strong>
                        <span className="meta-item">{member.householdName}</span>
                      </div>
                      <div className="list-copy">{member.relationship || "Family profile"}</div>
                      <div className="stack-list compact-list">
                        {basic.dateOfBirth ? <p>Date of birth: {basic.dateOfBirth}</p> : null}
                        {school.schoolName ? <p>School: {school.schoolName}</p> : null}
                        {emergency.contactName ? <p>Emergency: {emergency.contactName}</p> : null}
                      </div>
                      <div className="button-row">
                        <Link href={`/dashboard/vault/${member.id}/edit`} className="button button-secondary">
                          Edit profile
                        </Link>
                      </div>
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
