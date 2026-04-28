export type VaultFieldValue = {
  key: string;
  label: string;
  memberId: string;
  memberName: string;
  value: string;
};

export type TemplateSummary = {
  category: string;
  id: string;
  name: string;
  overview: string;
  slug: string;
};

export type DueDateReminder = {
  date: string;
  familyMemberId: string;
  templateId: string;
  title: string;
};

export const vaultFieldSearchAliases: Record<string, string[]> = {
  allergies: ["allergy", "medical allergies"],
  dateOfBirth: ["dob", "birth date"],
  email: ["email address"],
  fullName: ["name", "legal name"],
  groupNumber: ["insurance group", "group number"],
  memberId: ["insurance number", "insurance id", "member number"],
  phone: ["telephone", "mobile"],
  schoolName: ["school"],
  streetAddress: ["address", "home address"],
};

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
