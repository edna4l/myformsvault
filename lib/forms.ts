import {
  FormStatus,
  Prisma,
  TemplateCategory,
  type FamilyMember,
  type Form,
  type FormTemplate,
} from "@/generated/prisma/client";

import { prisma } from "./prisma";

type FormPreset = "lead" | "client";
export type SupportedFieldType = "text" | "email" | "url" | "textarea" | "date" | "tel";

export type FormField = {
  key: string;
  label: string;
  type: SupportedFieldType;
  placeholder: string;
  required: boolean;
  autofillKey?: string;
};

export type FormSection = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
};

export type SubmissionResponse = {
  key: string;
  label: string;
  value: string;
};

export type ImportedFormBlueprint = {
  category: TemplateCategory;
  matchedSections: FormSection[];
  customSection: FormSection | null;
  sections: FormSection[];
  matchedSectionIds: string[];
  unmappedLabels: string[];
};

export type HouseholdSummary = {
  slug: string;
  householdName: string;
  memberCount: number;
  members: FamilyMember[];
  lastUpdated: Date;
  relationships: string[];
  schools: string[];
  emergencyContacts: string[];
  stats: {
    schoolProfiles: number;
    medicalProfiles: number;
    insuranceProfiles: number;
    emergencyProfiles: number;
  };
};

type FamilySectionRecord = Record<string, string>;

type TemplateSeed = {
  name: string;
  slug: string;
  category: TemplateCategory;
  overview: string;
  description: string;
  accent: string;
  featured: boolean;
  sections: string[];
};

type FieldKeywordMatcher = {
  sectionId: string;
  key: string;
  matcher: RegExp;
};

const supportedFieldTypes = new Set<SupportedFieldType>(["text", "email", "url", "textarea", "date", "tel"]);

const legacyLeadIntakeFields: FormField[] = [
  { key: "fullName", label: "Full name", type: "text", placeholder: "Jordan Lee", required: true },
  { key: "email", label: "Work email", type: "email", placeholder: "jordan@company.com", required: true },
  { key: "company", label: "Company", type: "text", placeholder: "Studio Nova", required: false },
  { key: "website", label: "Website", type: "url", placeholder: "https://", required: false },
  {
    key: "goals",
    label: "What do you need help with?",
    type: "textarea",
    placeholder: "Tell us about the project, timeline, and what success looks like.",
    required: true,
  },
];

const sectionLibrary: Record<string, FormSection> = {
  "lead-contact": {
    id: "lead-contact",
    title: "Basic info",
    description: "Start with the contact details most intake flows need first.",
    fields: [
      {
        key: "basic.fullName",
        label: "Full name",
        type: "text",
        placeholder: "Jordan Lee",
        required: true,
        autofillKey: "basic.fullName",
      },
      {
        key: "basic.email",
        label: "Email",
        type: "email",
        placeholder: "jordan@company.com",
        required: true,
        autofillKey: "basic.email",
      },
      {
        key: "basic.phone",
        label: "Phone",
        type: "tel",
        placeholder: "(555) 555-0199",
        required: false,
        autofillKey: "basic.phone",
      },
    ],
  },
  "organization-context": {
    id: "organization-context",
    title: "Organization info",
    description: "Capture business, school, or team context in one block.",
    fields: [
      {
        key: "org.name",
        label: "Organization name",
        type: "text",
        placeholder: "Studio Nova",
        required: false,
      },
      {
        key: "org.website",
        label: "Website",
        type: "url",
        placeholder: "https://",
        required: false,
      },
      {
        key: "org.role",
        label: "Role or title",
        type: "text",
        placeholder: "Operations lead",
        required: false,
      },
    ],
  },
  "project-needs": {
    id: "project-needs",
    title: "Goals and next steps",
    description: "Use one section to capture goals, timing, and the main ask.",
    fields: [
      {
        key: "needs.goals",
        label: "What do you need help with?",
        type: "textarea",
        placeholder: "Tell us about the project, timeline, or decision you are trying to make.",
        required: true,
      },
      {
        key: "needs.timeline",
        label: "Ideal timeline",
        type: "text",
        placeholder: "Before the next semester starts",
        required: false,
      },
    ],
  },
  "basic-info": {
    id: "basic-info",
    title: "Basic info",
    description: "Use the same person-level details across school, medical, and care forms.",
    fields: [
      {
        key: "basic.fullName",
        label: "Full name",
        type: "text",
        placeholder: "Mia Johnson",
        required: true,
        autofillKey: "basic.fullName",
      },
      {
        key: "basic.dateOfBirth",
        label: "Date of birth",
        type: "date",
        placeholder: "",
        required: false,
        autofillKey: "basic.dateOfBirth",
      },
      {
        key: "basic.email",
        label: "Email",
        type: "email",
        placeholder: "guardian@example.com",
        required: false,
        autofillKey: "basic.email",
      },
      {
        key: "basic.phone",
        label: "Phone",
        type: "tel",
        placeholder: "(555) 555-0140",
        required: false,
        autofillKey: "basic.phone",
      },
      {
        key: "basic.streetAddress",
        label: "Street address",
        type: "textarea",
        placeholder: "123 Main St, Apartment 5",
        required: false,
        autofillKey: "basic.streetAddress",
      },
      {
        key: "basic.mailingAddress",
        label: "Mailing address",
        type: "textarea",
        placeholder: "PO Box 321, Oakland, CA 94612",
        required: false,
        autofillKey: "basic.mailingAddress",
      },
    ],
  },
  "school-info": {
    id: "school-info",
    title: "School info",
    description: "Store classroom, student, and district details once and reuse them.",
    fields: [
      {
        key: "school.schoolName",
        label: "School name",
        type: "text",
        placeholder: "Lakeside Elementary",
        required: false,
        autofillKey: "school.schoolName",
      },
      {
        key: "school.gradeLevel",
        label: "Grade level",
        type: "text",
        placeholder: "4th grade",
        required: false,
        autofillKey: "school.gradeLevel",
      },
      {
        key: "school.studentId",
        label: "Student ID",
        type: "text",
        placeholder: "204155",
        required: false,
        autofillKey: "school.studentId",
      },
      {
        key: "school.teacher",
        label: "Teacher or counselor",
        type: "text",
        placeholder: "Ms. Adams",
        required: false,
        autofillKey: "school.teacher",
      },
    ],
  },
  "medical-info": {
    id: "medical-info",
    title: "Medical info",
    description: "Keep allergies, conditions, and provider details ready for intake packets.",
    fields: [
      {
        key: "medical.allergies",
        label: "Allergies",
        type: "textarea",
        placeholder: "Peanuts, penicillin",
        required: false,
        autofillKey: "medical.allergies",
      },
      {
        key: "medical.medications",
        label: "Medications",
        type: "textarea",
        placeholder: "List current medications and dosage information",
        required: false,
        autofillKey: "medical.medications",
      },
      {
        key: "medical.conditions",
        label: "Conditions or medical notes",
        type: "textarea",
        placeholder: "Asthma action plan on file",
        required: false,
        autofillKey: "medical.conditions",
      },
      {
        key: "medical.physician",
        label: "Primary physician",
        type: "text",
        placeholder: "Dr. Nguyen",
        required: false,
        autofillKey: "medical.physician",
      },
    ],
  },
  "insurance-info": {
    id: "insurance-info",
    title: "Insurance info",
    description: "Add carrier and membership details for forms that need coverage info.",
    fields: [
      {
        key: "insurance.provider",
        label: "Insurance provider",
        type: "text",
        placeholder: "Blue Shield",
        required: false,
        autofillKey: "insurance.provider",
      },
      {
        key: "insurance.memberId",
        label: "Member ID",
        type: "text",
        placeholder: "XZW-2209431",
        required: false,
        autofillKey: "insurance.memberId",
      },
      {
        key: "insurance.groupNumber",
        label: "Group number",
        type: "text",
        placeholder: "A44291",
        required: false,
        autofillKey: "insurance.groupNumber",
      },
    ],
  },
  "emergency-contacts": {
    id: "emergency-contacts",
    title: "Emergency contact",
    description: "Keep your backup contact details in a reusable block.",
    fields: [
      {
        key: "emergency.contactName",
        label: "Emergency contact name",
        type: "text",
        placeholder: "Dana Johnson",
        required: true,
        autofillKey: "emergency.contactName",
      },
      {
        key: "emergency.contactRelationship",
        label: "Relationship",
        type: "text",
        placeholder: "Parent",
        required: false,
        autofillKey: "emergency.contactRelationship",
      },
      {
        key: "emergency.contactPhone",
        label: "Emergency contact phone",
        type: "tel",
        placeholder: "(555) 555-0111",
        required: true,
        autofillKey: "emergency.contactPhone",
      },
    ],
  },
  "household-preferences": {
    id: "household-preferences",
    title: "Household and pickup notes",
    description: "Add the details that usually end up getting retyped across family paperwork.",
    fields: [
      {
        key: "household.primaryLanguage",
        label: "Primary language",
        type: "text",
        placeholder: "English",
        required: false,
        autofillKey: "household.primaryLanguage",
      },
      {
        key: "household.authorizedPickup",
        label: "Authorized pickup notes",
        type: "textarea",
        placeholder: "Grandmother and aunt may pick up after 3 PM",
        required: false,
        autofillKey: "household.authorizedPickup",
      },
      {
        key: "household.pickupNotes",
        label: "Additional household notes",
        type: "textarea",
        placeholder: "Include accommodations, routines, or anything staff should know",
        required: false,
        autofillKey: "household.pickupNotes",
      },
    ],
  },
};

const templateSeeds: TemplateSeed[] = [
  {
    name: "Partnership Pipeline",
    slug: "partnership-pipeline",
    category: TemplateCategory.LEAD_INTAKE,
    overview: "A strong lead intake for partnerships, demos, and inbound requests.",
    description: "Capture the right lead details, triage requests, and keep the next step obvious.",
    accent: "#ef6f34",
    featured: true,
    sections: ["lead-contact", "organization-context", "project-needs"],
  },
  {
    name: "Client Kickoff",
    slug: "client-kickoff",
    category: TemplateCategory.GENERAL,
    overview: "A client-facing kickoff intake you can share before the first working session.",
    description: "Gather the context you need before kickoff, approvals, and timeline planning.",
    accent: "#2d8b77",
    featured: true,
    sections: ["lead-contact", "organization-context", "project-needs"],
  },
  {
    name: "School Enrollment Packet",
    slug: "school-enrollment-packet",
    category: TemplateCategory.EDUCATION,
    overview: "Collect core student, school, medical, and emergency data in one pass.",
    description: "Great for admissions, annual packet refreshes, and after-school onboarding.",
    accent: "#3b61d1",
    featured: true,
    sections: ["basic-info", "school-info", "medical-info", "emergency-contacts"],
  },
  {
    name: "Pediatric Medical Intake",
    slug: "pediatric-medical-intake",
    category: TemplateCategory.MEDICAL,
    overview: "A reusable intake shell for pediatric specialists, therapists, and clinics.",
    description: "Store medical, insurance, and emergency details once and reuse them anywhere.",
    accent: "#c34869",
    featured: true,
    sections: ["basic-info", "medical-info", "insurance-info", "emergency-contacts"],
  },
  {
    name: "Family Care Binder",
    slug: "family-care-binder",
    category: TemplateCategory.FAMILY_CARE,
    overview: "A family-facing template for school, camp, or care teams who need a full snapshot.",
    description: "Bundle household, emergency, school, and medical sections into a single shareable form.",
    accent: "#6a4fd8",
    featured: true,
    sections: ["basic-info", "school-info", "medical-info", "insurance-info", "emergency-contacts", "household-preferences"],
  },
];

const starterFormSlugs = ["partnership-pipeline", "client-kickoff"];

const fieldKeywordMatchers: FieldKeywordMatcher[] = [
  { sectionId: "basic-info", key: "basic.fullName", matcher: /\b(full name|student name|patient name|child name|legal name)\b/i },
  { sectionId: "basic-info", key: "basic.dateOfBirth", matcher: /\b(date of birth|dob|birth date)\b/i },
  { sectionId: "basic-info", key: "basic.email", matcher: /\b(email|e-mail)\b/i },
  { sectionId: "basic-info", key: "basic.phone", matcher: /\b(phone|mobile|cell)\b/i },
  { sectionId: "basic-info", key: "basic.mailingAddress", matcher: /\b(mailing address|mail address|po box|postal address)\b/i },
  { sectionId: "basic-info", key: "basic.streetAddress", matcher: /\b(street address|home address|residential address|physical address|address)\b/i },
  { sectionId: "school-info", key: "school.schoolName", matcher: /\b(school name|school|campus)\b/i },
  { sectionId: "school-info", key: "school.gradeLevel", matcher: /\b(grade|grade level|class)\b/i },
  { sectionId: "school-info", key: "school.studentId", matcher: /\b(student id|student number|pupil id)\b/i },
  { sectionId: "school-info", key: "school.teacher", matcher: /\b(teacher|counselor|advisor)\b/i },
  { sectionId: "medical-info", key: "medical.allergies", matcher: /\b(allerg(y|ies))\b/i },
  { sectionId: "medical-info", key: "medical.medications", matcher: /\b(medication|medications|medicine)\b/i },
  { sectionId: "medical-info", key: "medical.conditions", matcher: /\b(condition|medical history|diagnosis|health concern)\b/i },
  { sectionId: "medical-info", key: "medical.physician", matcher: /\b(physician|doctor|provider|pediatrician)\b/i },
  { sectionId: "insurance-info", key: "insurance.provider", matcher: /\b(insurance provider|carrier|insurance company)\b/i },
  { sectionId: "insurance-info", key: "insurance.memberId", matcher: /\b(member id|subscriber id|policy id)\b/i },
  { sectionId: "insurance-info", key: "insurance.groupNumber", matcher: /\b(group number|group no)\b/i },
  { sectionId: "emergency-contacts", key: "emergency.contactName", matcher: /\b(emergency contact|contact name)\b/i },
  { sectionId: "emergency-contacts", key: "emergency.contactRelationship", matcher: /\b(relationship)\b/i },
  { sectionId: "emergency-contacts", key: "emergency.contactPhone", matcher: /\b(emergency phone|contact phone|emergency number)\b/i },
  { sectionId: "household-preferences", key: "household.primaryLanguage", matcher: /\b(primary language|language spoken|home language)\b/i },
  { sectionId: "household-preferences", key: "household.authorizedPickup", matcher: /\b(authorized pickup|pickup authorization|approved pickup)\b/i },
  { sectionId: "household-preferences", key: "household.pickupNotes", matcher: /\b(household notes|pickup notes|special instructions|additional notes)\b/i },
  { sectionId: "organization-context", key: "org.name", matcher: /\b(company|organization|agency|employer)\b/i },
  { sectionId: "organization-context", key: "org.website", matcher: /\b(website|url|site)\b/i },
  { sectionId: "organization-context", key: "org.role", matcher: /\b(role|title|position)\b/i },
  { sectionId: "project-needs", key: "needs.goals", matcher: /\b(goal|reason for visit|reason for request|project overview|notes)\b/i },
  { sectionId: "project-needs", key: "needs.timeline", matcher: /\b(timeline|deadline|date needed|start date)\b/i },
];

function titleCaseCategory(category: TemplateCategory) {
  return category.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isSupportedFieldType(value: string): value is SupportedFieldType {
  return supportedFieldTypes.has(value as SupportedFieldType);
}

function cloneSection(section: FormSection): FormSection {
  return {
    id: section.id,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field) => ({ ...field })),
  };
}

function sectionsFromIds(ids: string[]) {
  return ids.map((id) => sectionLibrary[id]).filter((section): section is FormSection => Boolean(section)).map(cloneSection);
}

function fieldTypeForLabel(label: string): SupportedFieldType {
  if (/\b(email|e-mail)\b/i.test(label)) {
    return "email";
  }

  if (/\b(phone|mobile|cell|fax)\b/i.test(label)) {
    return "tel";
  }

  if (/\b(date|dob|birth)\b/i.test(label)) {
    return "date";
  }

  if (/\b(url|website|web site|site)\b/i.test(label)) {
    return "url";
  }

  if (/\b(note|history|details|description|reason|allerg|condition|medication|instruction|address)\b/i.test(label)) {
    return "textarea";
  }

  return "text";
}

function placeholderForType(type: SupportedFieldType) {
  if (type === "url") {
    return "https://";
  }

  if (type === "email") {
    return "name@example.com";
  }

  if (type === "tel") {
    return "(555) 555-0101";
  }

  return "";
}

function cleanImportLine(line: string) {
  return line
    .replace(/^[\-\u2022*#\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFieldKeyFromLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function isRequiredLabel(label: string) {
  return /\brequired\b/i.test(label) || /\*/.test(label);
}

function splitImportedLines(sourceText: string) {
  return sourceText
    .split(/\r?\n|,/)
    .map(cleanImportLine)
    .filter((line) => line.length > 1);
}

function buildCustomImportSection(lines: string[]): FormSection | null {
  const fields = lines.map((line, index) => {
    const label = line.replace(/\((required|optional)\)/gi, "").replace(/\*/g, "").trim();
    const type = fieldTypeForLabel(label);

    return {
      key: `import.${normalizeFieldKeyFromLabel(label) || `field_${index + 1}`}`,
      label,
      type,
      placeholder: placeholderForType(type),
      required: isRequiredLabel(line),
    } satisfies FormField;
  });

  if (fields.length === 0) {
    return null;
  }

  return {
    id: "imported-fields",
    title: "Imported fields",
    description: "These fields were brought in from the source form and could not be mapped to an existing reusable section yet.",
    fields,
  };
}

function categoryFromText(sourceText: string) {
  if (/\b(school|student|teacher|classroom|district|enrollment)\b/i.test(sourceText)) {
    return TemplateCategory.EDUCATION;
  }

  if (/\b(medical|doctor|allerg|medication|insurance|patient|clinic)\b/i.test(sourceText)) {
    return TemplateCategory.MEDICAL;
  }

  if (/\b(family|guardian|pickup|household|camp|caregiver)\b/i.test(sourceText)) {
    return TemplateCategory.FAMILY_CARE;
  }

  if (/\b(partnership|project|company|client|vendor|demo)\b/i.test(sourceText)) {
    return TemplateCategory.LEAD_INTAKE;
  }

  return TemplateCategory.GENERAL;
}

function compactRecord(record: FamilySectionRecord) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value.trim().length > 0));
}

function normalizeRecord(value: Prisma.JsonValue | null | undefined): FamilySectionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, candidate]) => [key, `${candidate ?? ""}`]),
  );
}

function hasRecordContent(value: Prisma.JsonValue | null | undefined) {
  return Object.values(normalizeRecord(value)).some((candidate) => candidate.trim().length > 0);
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildHouseholdSummary(members: FamilyMember[]): HouseholdSummary {
  const householdName = members[0]?.householdName.trim() || "Untitled household";
  const slug = normalizeSlug(householdName) || `household-${members[0]?.id ?? "record"}`;
  const orderedMembers = [...members].sort((left, right) => {
    const dateDelta = right.updatedAt.getTime() - left.updatedAt.getTime();

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return left.fullName.localeCompare(right.fullName);
  });

  return {
    slug,
    householdName,
    memberCount: orderedMembers.length,
    members: orderedMembers,
    lastUpdated: orderedMembers[0]?.updatedAt ?? new Date(0),
    relationships: uniqueNonEmpty(orderedMembers.map((member) => member.relationship || "")),
    schools: uniqueNonEmpty(
      orderedMembers.map((member) => normalizeRecord(member.schoolInfo).schoolName || ""),
    ),
    emergencyContacts: uniqueNonEmpty(
      orderedMembers.map((member) => normalizeRecord(member.emergencyInfo).contactName || ""),
    ),
    stats: {
      schoolProfiles: orderedMembers.filter((member) => hasRecordContent(member.schoolInfo)).length,
      medicalProfiles: orderedMembers.filter((member) => hasRecordContent(member.medicalInfo)).length,
      insuranceProfiles: orderedMembers.filter((member) => hasRecordContent(member.insuranceInfo)).length,
      emergencyProfiles: orderedMembers.filter((member) => hasRecordContent(member.emergencyInfo)).length,
    },
  };
}

function groupHouseholds(members: FamilyMember[]) {
  const householdMap = new Map<string, FamilyMember[]>();

  for (const member of members) {
    const key = member.householdName.trim() || "Untitled household";
    const existing = householdMap.get(key);

    if (existing) {
      existing.push(member);
    } else {
      householdMap.set(key, [member]);
    }
  }

  return [...householdMap.values()]
    .map(buildHouseholdSummary)
    .sort((left, right) => {
      const updatedDelta = right.lastUpdated.getTime() - left.lastUpdated.getTime();

      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.householdName.localeCompare(right.householdName);
    });
}

function parseFieldCandidate(value: unknown): FormField | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const key = `${candidate.key ?? candidate.name ?? ""}`.trim();
  const type = `${candidate.type ?? ""}`.trim();

  if (!key || !isSupportedFieldType(type)) {
    return null;
  }

  return {
    key,
    label: `${candidate.label ?? key}`,
    type,
    placeholder: `${candidate.placeholder ?? ""}`,
    required: Boolean(candidate.required),
    autofillKey: candidate.autofillKey ? `${candidate.autofillKey}` : undefined,
  };
}

function parseSectionCandidate(value: unknown): FormSection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.fields)) {
    return null;
  }

  const fields = candidate.fields.map(parseFieldCandidate).filter((field): field is FormField => field !== null);

  if (fields.length === 0) {
    return null;
  }

  return {
    id: `${candidate.id ?? candidate.title ?? "section"}`.trim(),
    title: `${candidate.title ?? "Section"}`,
    description: `${candidate.description ?? ""}`,
    fields,
  };
}

function fallbackLegacySection() {
  return [
    {
      id: "general-intake",
      title: "Form fields",
      description: "This form still uses the original field layout.",
      fields: legacyLeadIntakeFields.map((field) => ({ ...field })),
    },
  ] satisfies FormSection[];
}

export function parseFields(value: Prisma.JsonValue | null | undefined): FormField[] {
  if (!Array.isArray(value)) {
    return legacyLeadIntakeFields.map((field) => ({ ...field }));
  }

  const directFields = value.map(parseFieldCandidate).filter((field): field is FormField => field !== null);

  if (directFields.length > 0) {
    return directFields;
  }

  return parseSections(value).flatMap((section) => section.fields);
}

export function parseSections(value: Prisma.JsonValue | null | undefined): FormSection[] {
  if (!Array.isArray(value)) {
    return fallbackLegacySection();
  }

  const parsedSections = value.map(parseSectionCandidate).filter((section): section is FormSection => section !== null);

  if (parsedSections.length > 0) {
    return parsedSections;
  }

  const parsedFields = value.map(parseFieldCandidate).filter((field): field is FormField => field !== null);

  if (parsedFields.length > 0) {
    return [
      {
        id: "general-intake",
        title: "Form fields",
        description: "This form uses a single grouped section.",
        fields: parsedFields,
      },
    ];
  }

  return fallbackLegacySection();
}

function buildFieldsFromSections(sections: FormSection[]) {
  return sections.flatMap((section) => section.fields);
}

function normalizeBaseUrl(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/g, "");

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getSectionCatalogInternal() {
  return Object.values(sectionLibrary).map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    fieldCount: section.fields.length,
  }));
}

function resolveTemplateSections(templateSections: Prisma.JsonValue, selectedSectionIds?: string[]) {
  if (!selectedSectionIds || selectedSectionIds.length === 0) {
    return parseSections(templateSections);
  }

  const selectedSections = sectionsFromIds(selectedSectionIds);

  return selectedSections.length > 0 ? selectedSections : parseSections(templateSections);
}

export function mergeFormSections(baseSections: FormSection[], customSections: FormSection[]) {
  if (customSections.length === 0) {
    return baseSections;
  }

  const seenSectionIds = new Set(baseSections.map((section) => section.id));
  const dedupedCustomSections = customSections.filter((section) => {
    if (seenSectionIds.has(section.id)) {
      return false;
    }

    seenSectionIds.add(section.id);
    return true;
  });

  return [...baseSections, ...dedupedCustomSections];
}

function serializeSectionRecord(record: FamilySectionRecord) {
  const compact = compactRecord(record);
  return Object.keys(compact).length > 0 ? compact : Prisma.JsonNull;
}

function deriveSummary(values: Record<string, string>, responses: SubmissionResponse[]) {
  const preferredKeys = ["needs.goals", "goals", "medical.conditions", "household.pickupNotes"];

  for (const key of preferredKeys) {
    if (values[key]) {
      return values[key];
    }
  }

  const longResponse = responses.find((response) => response.value.length > 40);
  return longResponse?.value ?? responses.map((response) => response.value).filter(Boolean).join(" · ").slice(0, 280);
}

function deriveSubmissionEnvelope(form: Form, input: Record<string, string>) {
  const sections = parseSections((form.sections as Prisma.JsonValue | null | undefined) ?? form.fields);
  const responses = buildFieldsFromSections(sections)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: `${input[field.key] ?? ""}`.trim(),
    }))
    .filter((response) => response.value.length > 0);

  const values = Object.fromEntries(responses.map((response) => [response.key, response.value]));
  const submitterName = values["basic.fullName"] ?? values.fullName ?? values["emergency.contactName"] ?? null;
  const submitterEmail = values["basic.email"] ?? values.email ?? null;
  const company = values["org.name"] ?? values.company ?? null;
  const website = values["org.website"] ?? values.website ?? null;
  const summary = deriveSummary(values, responses) || null;

  return {
    responses,
    submitterName,
    submitterEmail,
    company,
    website,
    summary,
    legacyFullName: submitterName,
    legacyEmail: submitterEmail,
    legacyGoals: values["needs.goals"] ?? values.goals ?? summary,
  };
}

function parseResponseCandidate(value: unknown): SubmissionResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const key = `${candidate.key ?? ""}`.trim();
  const label = `${candidate.label ?? key}`.trim();
  const responseValue = `${candidate.value ?? ""}`.trim();

  if (!key || !responseValue) {
    return null;
  }

  return {
    key,
    label: label || key,
    value: responseValue,
  };
}

export function parseSubmissionResponses(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(parseResponseCandidate).filter((response): response is SubmissionResponse => response !== null);
}

export function getSubmissionPreview(submission: {
  submitterName: string | null;
  submitterEmail: string | null;
  summary: string | null;
  responses: Prisma.JsonValue | null;
  fullName: string | null;
  email: string | null;
  goals: string | null;
  company: string | null;
}) {
  const responses = parseSubmissionResponses(submission.responses);

  return {
    title: submission.submitterName ?? submission.fullName ?? "New response",
    subtitle: submission.submitterEmail ?? submission.email ?? submission.company ?? null,
    summary: submission.summary ?? submission.goals ?? null,
    responses,
  };
}

function buildFamilyAutofillValues(member: FamilyMember) {
  const basic = normalizeRecord(member.basicInfo);
  const school = normalizeRecord(member.schoolInfo);
  const medical = normalizeRecord(member.medicalInfo);
  const insurance = normalizeRecord(member.insuranceInfo);
  const emergency = normalizeRecord(member.emergencyInfo);
  const streetAddress = basic.streetAddress ?? basic.address ?? "";
  const mailingAddress = basic.mailingAddress ?? "";

  return {
    "basic.fullName": member.fullName,
    "basic.email": basic.email ?? "",
    "basic.phone": basic.phone ?? "",
    "basic.streetAddress": streetAddress,
    "basic.mailingAddress": mailingAddress,
    "basic.address": streetAddress || mailingAddress,
    "basic.dateOfBirth": basic.dateOfBirth ?? "",
    "school.schoolName": school.schoolName ?? "",
    "school.gradeLevel": school.gradeLevel ?? "",
    "school.studentId": school.studentId ?? "",
    "school.teacher": school.teacher ?? "",
    "medical.allergies": medical.allergies ?? "",
    "medical.medications": medical.medications ?? "",
    "medical.conditions": medical.conditions ?? "",
    "medical.physician": medical.physician ?? "",
    "insurance.provider": insurance.provider ?? "",
    "insurance.memberId": insurance.memberId ?? "",
    "insurance.groupNumber": insurance.groupNumber ?? "",
    "emergency.contactName": emergency.contactName ?? "",
    "emergency.contactRelationship": emergency.contactRelationship ?? "",
    "emergency.contactPhone": emergency.contactPhone ?? "",
    "household.primaryLanguage": basic.primaryLanguage ?? "",
    "household.authorizedPickup": emergency.authorizedPickup ?? "",
    "household.pickupNotes": emergency.pickupNotes ?? "",
  };
}

export function getBaseUrl() {
  const configuredUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.VERCEL_ENV === "production") {
    const productionUrl = normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);

    if (productionUrl) {
      return productionUrl;
    }
  }

  const branchUrl = normalizeBaseUrl(process.env.VERCEL_BRANCH_URL);

  if (branchUrl) {
    return branchUrl;
  }

  const deploymentUrl = normalizeBaseUrl(process.env.VERCEL_URL);

  if (deploymentUrl) {
    return deploymentUrl;
  }

  return "http://localhost:3000";
}

export function getSectionCatalog() {
  return getSectionCatalogInternal();
}

export function getTemplateCategoryLabel(category: TemplateCategory) {
  return titleCaseCategory(category);
}

export function buildImportedFormBlueprint(sourceText: string): ImportedFormBlueprint {
  const lines = splitImportedLines(sourceText);
  const matchedSectionIds = new Set<string>();
  const unmatchedLines: string[] = [];

  for (const line of lines) {
    const match = fieldKeywordMatchers.find((candidate) => candidate.matcher.test(line));

    if (match) {
      matchedSectionIds.add(match.sectionId);
      continue;
    }

    unmatchedLines.push(line);
  }

  const matchedSections = sectionsFromIds(Array.from(matchedSectionIds));
  const customSection = buildCustomImportSection(unmatchedLines);
  const sections = customSection ? [...matchedSections, customSection] : matchedSections;

  return {
    category: categoryFromText(sourceText),
    matchedSections,
    customSection,
    sections: sections.length > 0 ? sections : fallbackLegacySection(),
    matchedSectionIds: matchedSections.map((section) => section.id),
    unmappedLabels: unmatchedLines,
  };
}

export function getPresetFields(preset: FormPreset) {
  const templateSlug = preset === "client" ? "client-kickoff" : "partnership-pipeline";
  const seed = templateSeeds.find((item) => item.slug === templateSlug);

  if (!seed) {
    return legacyLeadIntakeFields.map((field) => ({ ...field }));
  }

  return buildFieldsFromSections(sectionsFromIds(seed.sections));
}

export async function ensureTemplateData() {
  for (const template of templateSeeds) {
    await prisma.formTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        category: template.category,
        overview: template.overview,
        description: template.description,
        accent: template.accent,
        sections: sectionsFromIds(template.sections),
        featured: template.featured,
      },
      create: {
        name: template.name,
        slug: template.slug,
        category: template.category,
        overview: template.overview,
        description: template.description,
        accent: template.accent,
        sections: sectionsFromIds(template.sections),
        featured: template.featured,
      },
    });
  }
}

async function createStarterForm(template: FormTemplate) {
  const sections = parseSections(template.sections);

  return prisma.form.create({
    data: {
      name: template.name,
      slug: template.slug,
      headline:
        template.category === TemplateCategory.LEAD_INTAKE
          ? `Tell us what ${template.name.toLowerCase()} should unlock next`
          : `Use ${template.name.toLowerCase()} without retyping every section`,
      description: template.description,
      accent: template.accent,
      status: FormStatus.ACTIVE,
      fields: buildFieldsFromSections(sections),
      sections,
      templateId: template.id,
    },
  });
}

async function backfillExistingForms() {
  const forms = (await prisma.form.findMany()).filter((form) => form.sections === null);

  if (forms.length === 0) {
    return;
  }

  const templates = await prisma.formTemplate.findMany();
  const templateBySlug = new Map(templates.map((template) => [template.slug, template]));

  for (const form of forms) {
    const template = templateBySlug.get(form.slug);
    const sections = template ? parseSections(template.sections) : parseSections(form.fields);

    await prisma.form.update({
      where: {
        id: form.id,
      },
      data: {
        sections,
        templateId: template?.id ?? null,
      },
    });
  }
}

export async function ensureSeedData() {
  await ensureTemplateData();
  await backfillExistingForms();

  const count = await prisma.form.count();

  if (count > 0) {
    return;
  }

  const templates = await prisma.formTemplate.findMany({
    where: {
      slug: {
        in: starterFormSlugs,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  for (const template of templates) {
    await createStarterForm(template);
  }
}

export async function getDashboardData() {
  await ensureSeedData();

  const [forms, leads, submissionCount, templateCount, familyMemberCount, templates, familyMembers, allFamilyMembers] =
    await Promise.all([
    prisma.form.findMany({
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.lead.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.formSubmission.count(),
    prisma.formTemplate.count(),
    prisma.familyMember.count(),
    prisma.formTemplate.findMany({
      where: {
        featured: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 3,
    }),
    prisma.familyMember.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 3,
    }),
    prisma.familyMember.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const households = groupHouseholds(allFamilyMembers);

  return {
    forms,
    leads,
    templates,
    familyMembers,
    households: households.slice(0, 3),
    metrics: {
      forms: forms.length,
      liveForms: forms.filter((form) => form.status === FormStatus.ACTIVE).length,
      submissions: submissionCount,
      templates: templateCount,
      familyMembers: familyMemberCount,
      households: households.length,
    },
  };
}

export async function getTemplateCatalog() {
  await ensureTemplateData();

  return prisma.formTemplate.findMany({
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
}

export async function getTemplateBySlug(slug: string) {
  await ensureTemplateData();

  return prisma.formTemplate.findUnique({
    where: { slug },
  });
}

export async function getFamilyMembers() {
  return prisma.familyMember.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getHouseholdSummaries() {
  const members = await getFamilyMembers();

  return groupHouseholds(members);
}

export async function getHouseholdSummaryBySlug(slug: string) {
  const households = await getHouseholdSummaries();

  return households.find((household) => household.slug === slug) ?? null;
}

export async function getFamilyMemberById(id: string) {
  return prisma.familyMember.findUnique({
    where: { id },
  });
}

export async function getFormById(id: string) {
  await ensureSeedData();

  return prisma.form.findUnique({
    where: { id },
    include: {
      template: true,
      submissions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function getFormBySlug(slug: string) {
  await ensureSeedData();

  return prisma.form.findUnique({
    where: { slug },
  });
}

export async function createLead(input: {
  name: string;
  email: string;
  company?: string;
  teamSize?: string;
  message: string;
}) {
  await prisma.lead.create({
    data: input,
  });
}

export async function createForm(input: {
  name: string;
  slug: string;
  headline: string;
  description: string;
  accent: string;
  templateSlug: string;
  sectionIds?: string[];
  customSections?: FormSection[];
}) {
  await ensureTemplateData();

  const template = await prisma.formTemplate.findUnique({
    where: { slug: input.templateSlug },
  });

  const baseSections = template
    ? resolveTemplateSections(template.sections, input.sectionIds)
    : sectionsFromIds(input.sectionIds ?? ["lead-contact", "project-needs"]);
  const sections = mergeFormSections(baseSections, input.customSections ?? []);

  return prisma.form.create({
    data: {
      name: input.name,
      slug: input.slug,
      headline: input.headline,
      description: input.description,
      accent: input.accent,
      status: FormStatus.ACTIVE,
      fields: buildFieldsFromSections(sections),
      sections,
      templateId: template?.id,
    },
  });
}

export async function createImportedForm(input: {
  name: string;
  slug: string;
  headline: string;
  description: string;
  accent: string;
  sourceText: string;
}) {
  const blueprint = buildImportedFormBlueprint(input.sourceText);

  return prisma.form.create({
    data: {
      name: input.name,
      slug: input.slug,
      headline: input.headline,
      description: input.description,
      accent: input.accent,
      status: FormStatus.ACTIVE,
      sections: blueprint.sections,
      fields: buildFieldsFromSections(blueprint.sections),
    },
  });
}

export async function updateForm(input: {
  id: string;
  name: string;
  slug: string;
  headline: string;
  description: string;
  accent: string;
  templateSlug?: string;
  sectionIds: string[];
  customSections?: FormSection[];
}) {
  await ensureTemplateData();

  const template = input.templateSlug
    ? await prisma.formTemplate.findUnique({
        where: { slug: input.templateSlug },
      })
    : null;

  const baseSections =
    template && input.sectionIds.length > 0
      ? resolveTemplateSections(template.sections, input.sectionIds)
      : sectionsFromIds(input.sectionIds);
  const sections = mergeFormSections(baseSections, input.customSections ?? []);

  return prisma.form.update({
    where: {
      id: input.id,
    },
    data: {
      name: input.name,
      slug: input.slug,
      headline: input.headline,
      description: input.description,
      accent: input.accent,
      templateId: template?.id ?? null,
      sections,
      fields: buildFieldsFromSections(sections),
    },
  });
}

export async function createFamilyMember(input: {
  householdName: string;
  fullName: string;
  relationship?: string;
  basicInfo: FamilySectionRecord;
  schoolInfo: FamilySectionRecord;
  medicalInfo: FamilySectionRecord;
  insuranceInfo: FamilySectionRecord;
  emergencyInfo: FamilySectionRecord;
}) {
  const data = {
    householdName: input.householdName,
    fullName: input.fullName,
    relationship: input.relationship || undefined,
    basicInfo: compactRecord(input.basicInfo),
    schoolInfo: serializeSectionRecord(input.schoolInfo),
    medicalInfo: serializeSectionRecord(input.medicalInfo),
    insuranceInfo: serializeSectionRecord(input.insuranceInfo),
    emergencyInfo: serializeSectionRecord(input.emergencyInfo),
  };

  return prisma.familyMember.create({
    data,
  });
}

export async function updateFamilyMember(input: {
  id: string;
  householdName: string;
  fullName: string;
  relationship?: string;
  basicInfo: FamilySectionRecord;
  schoolInfo: FamilySectionRecord;
  medicalInfo: FamilySectionRecord;
  insuranceInfo: FamilySectionRecord;
  emergencyInfo: FamilySectionRecord;
}) {
  const data = {
    householdName: input.householdName,
    fullName: input.fullName,
    relationship: input.relationship || undefined,
    basicInfo: compactRecord(input.basicInfo),
    schoolInfo: serializeSectionRecord(input.schoolInfo),
    medicalInfo: serializeSectionRecord(input.medicalInfo),
    insuranceInfo: serializeSectionRecord(input.insuranceInfo),
    emergencyInfo: serializeSectionRecord(input.emergencyInfo),
  };

  return prisma.familyMember.update({
    where: {
      id: input.id,
    },
    data,
  });
}

export async function deleteFamilyMember(id: string) {
  return prisma.familyMember.delete({
    where: {
      id,
    },
  });
}

export async function createSubmission(
  form: Form,
  input: Record<string, string>,
) {
  const envelope = deriveSubmissionEnvelope(form, input);

  return prisma.formSubmission.create({
    data: {
      formId: form.id,
      fullName: envelope.legacyFullName,
      email: envelope.legacyEmail,
      company: envelope.company,
      website: envelope.website,
      goals: envelope.legacyGoals,
      submitterName: envelope.submitterName,
      submitterEmail: envelope.submitterEmail,
      summary: envelope.summary,
      responses: envelope.responses,
    },
  });
}

export function getFormPrefillValues(form: Pick<Form, "fields" | "sections">, member: FamilyMember | null) {
  if (!member) {
    return {} as Record<string, string>;
  }

  const fieldKeys = new Set(
    parseSections(form.sections ?? form.fields)
      .flatMap((section) => section.fields)
      .map((field) => field.autofillKey ?? field.key),
  );

  const autofill = buildFamilyAutofillValues(member);

  return Object.fromEntries(Object.entries(autofill).filter(([key, value]) => fieldKeys.has(key) && value));
}
