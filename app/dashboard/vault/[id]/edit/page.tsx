import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteFamilyMemberAction, updateFamilyMemberAction } from "@/app/actions";
import {
  FamilyMemberForm,
  type FamilyMemberFormDefaults,
} from "@/app/dashboard/vault/member-form";
import { getFamilyMemberById } from "@/lib/forms";

export const dynamic = "force-dynamic";

type EditFamilyMemberPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
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

function buildDefaults(member: NonNullable<Awaited<ReturnType<typeof getFamilyMemberById>>>): FamilyMemberFormDefaults {
  const basic = getRecord(member.basicInfo);
  const school = getRecord(member.schoolInfo);
  const medical = getRecord(member.medicalInfo);
  const insurance = getRecord(member.insuranceInfo);
  const emergency = getRecord(member.emergencyInfo);

  return {
    householdName: member.householdName,
    fullName: member.fullName,
    relationship: member.relationship ?? "",
    dateOfBirth: basic.dateOfBirth ?? "",
    email: basic.email ?? "",
    phone: basic.phone ?? "",
    address: basic.address ?? "",
    primaryLanguage: basic.primaryLanguage ?? "",
    schoolName: school.schoolName ?? "",
    gradeLevel: school.gradeLevel ?? "",
    studentId: school.studentId ?? "",
    teacher: school.teacher ?? "",
    allergies: medical.allergies ?? "",
    medications: medical.medications ?? "",
    conditions: medical.conditions ?? "",
    physician: medical.physician ?? "",
    insuranceProvider: insurance.provider ?? "",
    insuranceMemberId: insurance.memberId ?? "",
    insuranceGroupNumber: insurance.groupNumber ?? "",
    emergencyContactName: emergency.contactName ?? "",
    emergencyContactRelationship: emergency.contactRelationship ?? "",
    emergencyContactPhone: emergency.contactPhone ?? "",
    authorizedPickup: emergency.authorizedPickup ?? "",
    pickupNotes: emergency.pickupNotes ?? "",
  };
}

export default async function EditFamilyMemberPage({ params, searchParams }: EditFamilyMemberPageProps) {
  const route = await params;
  const query = await searchParams;
  const member = await getFamilyMemberById(route.id);

  if (!member) {
    notFound();
  }

  const defaults = buildDefaults(member);
  const errorMessage =
    query.error === "validation" ? "A few required details still need attention before saving." : null;

  return (
    <main className="app-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Edit family member</span>
            <h1>Keep reusable family details current without re-entering everything.</h1>
            <p>
              Update the same basic, school, medical, insurance, and emergency details that power
              vault autofill across your forms.
            </p>
          </div>
          <div className="button-row">
            <Link href="/dashboard/vault" className="button button-secondary">
              Back to vault
            </Link>
            <Link href="/dashboard" className="button button-ghost">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="detail-grid">
          <section className="form-surface">
            {errorMessage ? <div className="notice warning">{errorMessage}</div> : null}

            <div className="stack-list" style={{ marginBottom: "1rem" }}>
              <div>
                <span className="eyebrow">Editing record</span>
                <h2 style={{ marginTop: "0.85rem" }}>{member.fullName}</h2>
                <p>
                  Household: {member.householdName}
                  {member.relationship ? ` · ${member.relationship}` : ""}
                </p>
              </div>
            </div>

            <FamilyMemberForm
              action={updateFamilyMemberAction}
              submitLabel="Save profile changes"
              defaults={defaults}
              memberId={member.id}
            />
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Remove record</span>
            <h2>Delete this vault profile</h2>
            <p style={{ marginTop: "0.8rem" }}>
              Remove this person if you no longer want them available for public-form autofill or
              dashboard preview links. Existing submissions stay intact.
            </p>
            <form action={deleteFamilyMemberAction} style={{ marginTop: "1rem" }}>
              <input type="hidden" name="id" value={member.id} />
              <button type="submit" className="button button-danger">
                Delete profile
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
