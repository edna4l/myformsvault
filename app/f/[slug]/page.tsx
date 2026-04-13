import Link from "next/link";
import { notFound } from "next/navigation";

import { submitPublicFormAction } from "@/app/actions";
import { getFamilyMembers, getFormBySlug, getFormPrefillValues, parseSections } from "@/lib/forms";

export const dynamic = "force-dynamic";

type PublicFormPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    member?: string;
  }>;
};

export default async function PublicFormPage({ params, searchParams }: PublicFormPageProps) {
  const route = await params;
  const query = await searchParams;
  const [form, familyMembers] = await Promise.all([getFormBySlug(route.slug), getFamilyMembers()]);

  if (!form) {
    notFound();
  }

  const familyMember = query.member
    ? familyMembers.find((member) => member.id === query.member) ?? null
    : null;
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
            Prefill preview is using the saved record for <strong>{familyMember.fullName}</strong>.
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
        {familyMembers.length > 0 ? (
          <div className="surface-card" style={{ marginBottom: "1.25rem", boxShadow: "none" }}>
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <span className="eyebrow">Vault autofill</span>
                <h2 style={{ marginTop: "0.85rem" }}>Load a saved family profile</h2>
                <p style={{ marginTop: "0.6rem" }}>
                  Choose a saved family member to prefill the sections this form already knows how
                  to reuse. You can switch profiles or clear the autofill at any time.
                </p>
              </div>
              {familyMember ? (
                <Link href={`/f/${form.slug}`} className="button button-ghost">
                  Clear autofill
                </Link>
              ) : null}
            </div>

            <form method="GET" className="form-grid" style={{ marginTop: "1rem" }}>
              <label className="field field-full">
                <span>Saved family member</span>
                <select name="member" defaultValue={familyMember?.id ?? ""}>
                  <option value="">Start with a blank form</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} · {member.householdName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-full button-row">
                <button type="submit" className="button button-secondary">
                  {familyMember ? "Switch autofill profile" : "Load saved profile"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="surface-card" style={{ marginBottom: "1.25rem", boxShadow: "none" }}>
            <span className="eyebrow">Vault autofill</span>
            <h2 style={{ marginTop: "0.85rem" }}>No saved family profiles yet</h2>
            <p style={{ marginTop: "0.6rem" }}>
              Add a family member once in the vault, then come back here to load their basic,
              school, medical, and emergency details into any matching form.
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
