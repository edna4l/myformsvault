export type FillProfileDescriptor = {
  key: string;
  label: string;
  aliases: string[];
};

export const fillProfileDescriptors: FillProfileDescriptor[] = [
  {
    key: "basic.fullName",
    label: "Full name",
    aliases: ["full name", "student name", "child name", "participant name", "patient name", "applicant name", "name"],
  },
  {
    key: "basic.dateOfBirth",
    label: "Date of birth",
    aliases: ["date of birth", "birth date", "dob", "student dob", "child dob", "patient dob"],
  },
  {
    key: "basic.email",
    label: "Email",
    aliases: ["email", "email address", "parent email", "guardian email", "contact email"],
  },
  {
    key: "basic.phone",
    label: "Phone",
    aliases: ["phone", "phone number", "telephone", "mobile", "cell", "contact phone"],
  },
  {
    key: "basic.streetAddress",
    label: "Street address",
    aliases: ["street address", "home address", "residential address", "address"],
  },
  {
    key: "basic.mailingAddress",
    label: "Mailing address",
    aliases: ["mailing address", "postal address"],
  },
  {
    key: "school.schoolName",
    label: "School name",
    aliases: ["school", "school name", "current school", "student school"],
  },
  {
    key: "school.gradeLevel",
    label: "Grade level",
    aliases: ["grade", "grade level", "current grade"],
  },
  {
    key: "school.studentId",
    label: "Student ID",
    aliases: ["student id", "student number", "school id"],
  },
  {
    key: "school.teacher",
    label: "Teacher",
    aliases: ["teacher", "teacher name", "counselor", "counselor name"],
  },
  {
    key: "medical.allergies",
    label: "Allergies",
    aliases: ["allergies", "allergy", "known allergies"],
  },
  {
    key: "medical.medications",
    label: "Medications",
    aliases: ["medications", "medication", "current medications", "medicine"],
  },
  {
    key: "medical.conditions",
    label: "Medical conditions",
    aliases: ["conditions", "medical conditions", "medical notes", "health conditions"],
  },
  {
    key: "medical.physician",
    label: "Physician",
    aliases: ["physician", "doctor", "primary physician", "primary doctor", "provider"],
  },
  {
    key: "insurance.provider",
    label: "Insurance provider",
    aliases: ["insurance provider", "insurance company", "insurance carrier", "carrier"],
  },
  {
    key: "insurance.memberId",
    label: "Insurance member ID",
    aliases: ["member id", "insurance id", "policy number", "subscriber id"],
  },
  {
    key: "insurance.groupNumber",
    label: "Insurance group number",
    aliases: ["group number", "insurance group", "group id"],
  },
  {
    key: "emergency.contactName",
    label: "Emergency contact name",
    aliases: ["emergency contact", "emergency contact name", "emergency name"],
  },
  {
    key: "emergency.contactRelationship",
    label: "Emergency contact relationship",
    aliases: ["emergency relationship", "relationship to child", "contact relationship"],
  },
  {
    key: "emergency.contactPhone",
    label: "Emergency contact phone",
    aliases: ["emergency phone", "emergency contact phone", "emergency telephone"],
  },
  {
    key: "household.primaryLanguage",
    label: "Primary language",
    aliases: ["primary language", "home language", "language"],
  },
  {
    key: "household.authorizedPickup",
    label: "Authorized pickup",
    aliases: ["authorized pickup", "pickup authorization", "approved pickup"],
  },
  {
    key: "household.pickupNotes",
    label: "Pickup notes",
    aliases: ["pickup notes", "additional notes", "special instructions"],
  },
  {
    key: "household.name",
    label: "Household name",
    aliases: ["household", "household name", "family name"],
  },
  {
    key: "basic.relationship",
    label: "Relationship",
    aliases: ["relationship", "relationship to student", "relationship to patient"],
  },
];

export const fillProfileKeys = new Set(fillProfileDescriptors.map((descriptor) => descriptor.key));

export function normalizeFillText(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[._-]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function compactFillText(value: string) {
  return normalizeFillText(value).replace(/\s+/g, "");
}

function includesAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function getAliasMap() {
  const entries = fillProfileDescriptors.flatMap((descriptor) => [
    [compactFillText(descriptor.label), descriptor.key] as const,
    [compactFillText(descriptor.key), descriptor.key] as const,
    ...descriptor.aliases.map((alias) => [compactFillText(alias), descriptor.key] as const),
  ]);

  return new Map(entries);
}

const aliasMap = getAliasMap();

export function getHeuristicFillProfileKey(fieldName: string) {
  const normalized = normalizeFillText(fieldName);
  const compact = compactFillText(fieldName);
  const emergency = normalized.includes("emergency");
  const insurance = normalized.includes("insurance") || normalized.includes("policy") || normalized.includes("subscriber");

  if (emergency && includesAny(normalized, ["phone", "telephone", "mobile", "cell"])) {
    return "emergency.contactPhone";
  }

  if (emergency && includesAny(normalized, ["relationship", "relation"])) {
    return "emergency.contactRelationship";
  }

  if (emergency && includesAny(normalized, ["name", "contact"])) {
    return "emergency.contactName";
  }

  if (insurance && includesAny(normalized, ["group"])) {
    return "insurance.groupNumber";
  }

  if (insurance && includesAny(normalized, ["member", "id", "policy", "subscriber"])) {
    return "insurance.memberId";
  }

  if (insurance && includesAny(normalized, ["provider", "company", "carrier", "plan"])) {
    return "insurance.provider";
  }

  if (includesAny(normalized, ["date of birth", "birth date"]) || compact.includes("dob")) {
    return "basic.dateOfBirth";
  }

  if (includesAny(normalized, ["allergy", "allergies"])) {
    return "medical.allergies";
  }

  if (includesAny(normalized, ["medication", "medicine"])) {
    return "medical.medications";
  }

  if (includesAny(normalized, ["medical condition", "health condition", "medical notes"])) {
    return "medical.conditions";
  }

  if (includesAny(normalized, ["physician", "doctor"])) {
    return "medical.physician";
  }

  if (includesAny(normalized, ["student id", "student number", "school id"])) {
    return "school.studentId";
  }

  if (includesAny(normalized, ["grade"])) {
    return "school.gradeLevel";
  }

  if (includesAny(normalized, ["teacher", "counselor"])) {
    return "school.teacher";
  }

  if (includesAny(normalized, ["school"])) {
    return "school.schoolName";
  }

  if (includesAny(normalized, ["mailing address", "postal address"])) {
    return "basic.mailingAddress";
  }

  if (includesAny(normalized, ["street address", "home address", "residential address", "address"])) {
    return "basic.streetAddress";
  }

  if (includesAny(normalized, ["email"])) {
    return "basic.email";
  }

  if (includesAny(normalized, ["phone", "telephone", "mobile", "cell"])) {
    return "basic.phone";
  }

  if (includesAny(normalized, ["student name", "child name", "patient name", "participant name", "full name"])) {
    return "basic.fullName";
  }

  return null;
}

export function resolveFillProfileKey(fieldName: string, availableValues?: Record<string, string>) {
  const compact = compactFillText(fieldName);
  const exactKey = aliasMap.get(compact);

  if (exactKey && (!availableValues || availableValues[exactKey])) {
    return exactKey;
  }

  const heuristicKey = getHeuristicFillProfileKey(fieldName);

  if (heuristicKey && (!availableValues || availableValues[heuristicKey])) {
    return heuristicKey;
  }

  return null;
}
