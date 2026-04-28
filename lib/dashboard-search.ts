import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSeedData, parseSections } from "@/lib/forms";

export type DashboardSearchGroup = "Answer History" | "Templates" | "Vault";

export type DashboardSearchItem = {
  id: string;
  group: DashboardSearchGroup;
  href: string;
  label: string;
  searchText: string;
  subtitle: string;
};

const vaultFieldLabels = {
  "basic.dateOfBirth": "Date of birth",
  "basic.email": "Email",
  "basic.phone": "Phone",
  "basic.streetAddress": "Street address",
  "basic.mailingAddress": "Mailing address",
  "household.primaryLanguage": "Primary language",
  "school.schoolName": "School name",
  "school.gradeLevel": "Grade level",
  "school.studentId": "Student ID",
  "school.teacher": "Teacher",
  "medical.allergies": "Allergies",
  "medical.medications": "Medications",
  "medical.conditions": "Medical conditions",
  "medical.physician": "Physician",
  "insurance.provider": "Insurance provider",
  "insurance.memberId": "Insurance member ID",
  "insurance.groupNumber": "Insurance group number",
  "emergency.contactName": "Emergency contact",
  "emergency.contactRelationship": "Emergency relationship",
  "emergency.contactPhone": "Emergency phone",
  "household.authorizedPickup": "Authorized pickup",
  "household.pickupNotes": "Pickup notes",
} satisfies Record<string, string>;

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, candidate]) => [key, `${candidate ?? ""}`]),
  );
}

function vaultEntries(member: {
  basicInfo: unknown;
  emergencyInfo: unknown;
  insuranceInfo: unknown;
  medicalInfo: unknown;
  schoolInfo: unknown;
}) {
  const basic = getRecord(member.basicInfo);
  const school = getRecord(member.schoolInfo);
  const medical = getRecord(member.medicalInfo);
  const insurance = getRecord(member.insuranceInfo);
  const emergency = getRecord(member.emergencyInfo);

  return [
    ["basic.dateOfBirth", basic.dateOfBirth],
    ["basic.email", basic.email],
    ["basic.phone", basic.phone],
    ["basic.streetAddress", basic.streetAddress ?? basic.address],
    ["basic.mailingAddress", basic.mailingAddress],
    ["household.primaryLanguage", basic.primaryLanguage],
    ["school.schoolName", school.schoolName],
    ["school.gradeLevel", school.gradeLevel],
    ["school.studentId", school.studentId],
    ["school.teacher", school.teacher],
    ["medical.allergies", medical.allergies],
    ["medical.medications", medical.medications],
    ["medical.conditions", medical.conditions],
    ["medical.physician", medical.physician],
    ["insurance.provider", insurance.provider],
    ["insurance.memberId", insurance.memberId],
    ["insurance.groupNumber", insurance.groupNumber],
    ["emergency.contactName", emergency.contactName],
    ["emergency.contactRelationship", emergency.contactRelationship],
    ["emergency.contactPhone", emergency.contactPhone],
    ["household.authorizedPickup", emergency.authorizedPickup],
    ["household.pickupNotes", emergency.pickupNotes],
  ].filter((entry): entry is [keyof typeof vaultFieldLabels, string] =>
    Boolean(entry[1]?.trim()),
  );
}

export async function getDashboardSearchIndex() {
  await ensureSeedData();

  const [templates, members] = await Promise.all([
    prisma.formTemplate.findMany({
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    }),
    prisma.familyMember.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);
  const items: DashboardSearchItem[] = [];

  for (const template of templates) {
    items.push({
      group: "Templates",
      href: `/dashboard/forms/new?template=${template.slug}`,
      id: `template-${template.id}`,
      label: template.name,
      searchText: `${template.name} ${template.overview} ${template.description}`,
      subtitle: "Template",
    });

    for (const section of parseSections(template.sections)) {
      for (const field of section.fields) {
        items.push({
          group: "Templates",
          href: `/dashboard/forms/new?template=${template.slug}`,
          id: `template-field-${template.id}-${field.key}`,
          label: field.label,
          searchText: `${field.label} ${section.title} ${template.name}`,
          subtitle: `${template.name} field`,
        });
      }
    }
  }

  for (const member of members) {
    for (const [fieldKey, value] of vaultEntries(member)) {
      const label = vaultFieldLabels[fieldKey];

      items.push({
        group: "Vault",
        href: `/dashboard/vault/${member.id}/edit`,
        id: `vault-${member.id}-${fieldKey}`,
        label,
        searchText: `${label} ${value} ${member.fullName} ${member.householdName}`,
        subtitle: `${member.fullName}: ${value}`,
      });
    }
  }

  try {
    const history = await prisma.answerHistory.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 250,
    });

    for (const entry of history) {
      items.push({
        group: "Answer History",
        href: `/dashboard/vault/${entry.familyMemberId}/edit`,
        id: `history-${entry.id}`,
        label: entry.fieldLabel,
        searchText: `${entry.fieldLabel} ${entry.value} ${entry.templateName} ${entry.formName}`,
        subtitle: `${entry.value} used in ${entry.templateName}`,
      });
    }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021")) {
      console.error("Unable to load dashboard answer history search index", error);
    }
  }

  return items;
}
