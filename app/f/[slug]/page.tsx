import Link from "next/link";
import { notFound } from "next/navigation";

import { submitPublicFormAction } from "@/app/actions";
import { getFormBySlug, getFormPrefillValues, getHouseholdSummaries, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

type PublicFormPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    household?: string;
    member?: string;
  }>;
};

export default async function PublicFormPage({ params, searchParams }: PublicFormPageProps) {
  const route = await params;
  const query = await searchParams;
  const [form, households] = await Promise.all([getFormBySlug(route.slug), getHouseholdSummaries()]);

  if (!form) {
    notFound();
  }

  const allMembers = households.flatMap((household) => household.members);
  const familyMember = query.member
    ? allMembers.find((member) => member.id === query.member) ?? null
    : null;
  const selectedHousehold =
    households.find((household) => household.slug === query.household) ??
    households.find((household) => household.members.some((member) => member.id === familyMember?.id)) ??
    null;
  const householdMembers = selectedHousehold?.members ?? [];
  const sections = parseSections(form.sections ?? form.fields);
  const prefill = getFormPrefillValues(form, familyMember);
  const hasError = query.error === "submission";
  const isSubmitted = query.submitted === "1";

  return (
    <main className="public-form-shell">
      <header className="public-form-hero">
        <div className="pill-row">
          <Link href="/" className="brand">
            <span className="brand-mark">MF</span>
            <span>myformsvault</span>
          </Link>
          <span
            className="status-pill"
            style={{
              background: `${form.accent}20`,
              color: form.accent,
            }}
          >
            public form
          </span>
        </div>
        <div style={{ marginTop: "1.1rem" }}>
          <h1>{form.headline}</h1>
          <p style={{ marginTop: "0.9rem", maxWidth: "60ch" }}>{form.description}</p>
        </div>
        {familyMember ? (
          <div className="notice" style={{ marginTop: "1rem" }}>
            Prefill preview is using <strong>{familyMember.fullName}</strong> from the{" "}
            <strong>{selectedHousehold?.householdName ?? familyMember.householdName}</strong> household.
          </div>
        ) : selectedHousehold ? (
          <div className="notice" style={{ marginTop: "1rem" }}>
            <strong>{selectedHousehold.householdName}</strong> is selected. Choose a member profile
            below to load their saved details into this form.
          </div>
        ) : null}
      </header>

      <section className="public-form-card">
        {isSubmitted ? (
          <div className="notice success">
            Submission received. Head back to the dashboard to review it.
          </div>
        ) : null}
        {hasError ? (
          <div className="notice warning">A couple of required fields still need attention.</div>
        ) : null}
        {households.length > 0 ? (
          <div className="surface-card" style={{ marginBottom: "1.25rem", boxShadow: "none" }}>
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <span className="eyebrow">Vault autofill</span>
                <h2 style={{ marginTop: "0.85rem" }}>Choose a household, then a saved member</h2>
                <p style={{ marginTop: "0.6rem" }}>
                  Pick the household first so the member picker stays focused on the right family.
                  Once you choose a person, the form will prefill any matching basic, school,
                  medical, insurance, or emergency fields.
                </p>
              </div>
              {selectedHousehold || familyMember ? (
                <Link href={`/f/${form.slug}`} className="button button-ghost">
                  Clear autofill
                </Link>
              ) : null}
            </div>

            <form method="GET" className="form-grid" style={{ marginTop: "1rem" }}>
              <label className="field">
                <span>Household</span>
                <select name="household" defaultValue={selectedHousehold?.slug ?? ""}>
                  <option value="">Choose a household</option>
                  {households.map((household) => (
                    <option key={household.slug} value={household.slug}>
                      {household.householdName} · {household.memberCount} member
                      {household.memberCount === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Family member</span>
                <select
                  name="member"
                  defaultValue={familyMember?.id ?? ""}
                  disabled={!selectedHousehold}
                >
                  <option value="">
                    {selectedHousehold ? "Choose a saved member" : "Select a household first"}
                  </option>
                  {householdMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                      {member.relationship ? ` · ${member.relationship}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {selectedHousehold ? (
                <div className="field field-full">
                  <div className="section-chip">
                    <strong>{selectedHousehold.householdName}</strong>
                    <p>
                      {selectedHousehold.memberCount} saved member
                      {selectedHousehold.memberCount === 1 ? "" : "s"} ·{" "}
                      {selectedHousehold.stats.schoolProfiles} school-ready ·{" "}
                      {selectedHousehold.stats.medicalProfiles} medical-ready
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="field-full button-row">
                <button type="submit" className="button button-secondary">
                  {familyMember
                    ? "Switch autofill profile"
                    : selectedHousehold
                      ? "Load saved member"
                      : "Continue to member selection"}
                </button>
                {selectedHousehold ? (
                  <Link
                    href={`/dashboard/vault/households/${selectedHousehold.slug}`}
                    className="button button-ghost"
                  >
                    View household
                  </Link>
                ) : null}
              </div>
            </form>

            {selectedHousehold && !familyMember ? (
              <div className="notice" style={{ marginTop: "1rem" }}>
                Choose a member from <strong>{selectedHousehold.householdName}</strong> to prefill
                this form.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="surface-card" style={{ marginBottom: "1.25rem", boxShadow: "none" }}>
            <span className="eyebrow">Vault autofill</span>
            <h2 style={{ marginTop: "0.85rem" }}>No saved family profiles yet</h2>
            <p style={{ marginTop: "0.6rem" }}>
              Add a family member once in the vault, then come back here to choose their household
              and load matching basic, school, medical, and emergency details into this form.
            </p>
            <div className="button-row" style={{ marginTop: "1rem" }}>
              <Link href="/dashboard/vault" className="button button-secondary">
                Open family vault
              </Link>
            </div>
          </div>
        )}

        <form action={submitPublicFormAction} className="public-form">
          <input type="hidden" name="slug" value={form.slug} />
          {sections.map((section) => (
            <div key={section.id} className="public-section">
              <div className="public-section-copy">
                <span className="eyebrow">{section.title}</span>
                <p>{section.description}</p>
              </div>
              <div className="public-section-grid">
                {section.fields.map((field) => {
                  const defaultValue = prefill[field.autofillKey ?? field.key] ?? prefill[field.key] ?? "";

                  return (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.key}
                          rows={6}
                          placeholder={field.placeholder}
                          required={field.required}
                          defaultValue={defaultValue}
                        />
                      ) : (
                        <input
                          name={field.key}
                          type={field.type}
                          placeholder={field.placeholder}
                          required={field.required}
                          defaultValue={defaultValue}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="button-row">
            <button type="submit" className="button button-primary">
              Submit form
            </button>
            <Link href="/dashboard" className="button button-ghost">
              View dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
