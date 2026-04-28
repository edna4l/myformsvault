"use client";

import { useMemo, useState } from "react";

import type { VaultAnswerHistoryEntry } from "@/lib/forms";

export type FamilyMemberFormDefaults = {
  householdName: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  streetAddress: string;
  mailingAddress: string;
  primaryLanguage: string;
  schoolName: string;
  gradeLevel: string;
  studentId: string;
  teacher: string;
  allergies: string;
  medications: string;
  conditions: string;
  physician: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  authorizedPickup: string;
  pickupNotes: string;
};

export const emptyFamilyMemberDefaults: FamilyMemberFormDefaults = {
  householdName: "",
  fullName: "",
  relationship: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  streetAddress: "",
  mailingAddress: "",
  primaryLanguage: "",
  schoolName: "",
  gradeLevel: "",
  studentId: "",
  teacher: "",
  allergies: "",
  medications: "",
  conditions: "",
  physician: "",
  insuranceProvider: "",
  insuranceMemberId: "",
  insuranceGroupNumber: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  authorizedPickup: "",
  pickupNotes: "",
};

type FamilyMemberFieldName = keyof FamilyMemberFormDefaults;

type FieldConfig = {
  full?: boolean;
  label: string;
  name: FamilyMemberFieldName;
  placeholder?: string;
  rows?: number;
  type?: "date" | "email" | "tel" | "text" | "textarea";
};

type FamilyMemberFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: FamilyMemberFormDefaults;
  histories?: VaultAnswerHistoryEntry[];
  memberId?: string;
};

const fieldConfigs: FieldConfig[] = [
  { label: "Household name", name: "householdName", placeholder: "Johnson family" },
  { label: "Full name", name: "fullName", placeholder: "Mia Johnson" },
  { label: "Relationship", name: "relationship", placeholder: "Child, guardian, sibling..." },
  { label: "Date of birth", name: "dateOfBirth", type: "date" },
  { label: "Email", name: "email", placeholder: "guardian@example.com", type: "email" },
  { label: "Phone", name: "phone", placeholder: "(555) 555-0140", type: "tel" },
  {
    full: true,
    label: "Street address",
    name: "streetAddress",
    placeholder: "123 Main St, Apartment 5",
    rows: 3,
    type: "textarea",
  },
  {
    full: true,
    label: "Mailing address",
    name: "mailingAddress",
    placeholder: "PO Box 321, Oakland, CA 94612",
    rows: 3,
    type: "textarea",
  },
  { label: "Primary language", name: "primaryLanguage", placeholder: "English" },
  { label: "School name", name: "schoolName", placeholder: "Lakeside Elementary" },
  { label: "Grade level", name: "gradeLevel", placeholder: "4th grade" },
  { label: "Student ID", name: "studentId", placeholder: "204155" },
  { label: "Teacher or counselor", name: "teacher", placeholder: "Ms. Adams" },
  {
    full: true,
    label: "Allergies",
    name: "allergies",
    placeholder: "Peanuts, shellfish...",
    rows: 3,
    type: "textarea",
  },
  {
    full: true,
    label: "Medications",
    name: "medications",
    placeholder: "Medication names and dosage details",
    rows: 3,
    type: "textarea",
  },
  {
    full: true,
    label: "Conditions or medical notes",
    name: "conditions",
    placeholder: "Asthma action plan on file",
    rows: 3,
    type: "textarea",
  },
  { label: "Primary physician", name: "physician", placeholder: "Dr. Nguyen" },
  { label: "Insurance provider", name: "insuranceProvider", placeholder: "Blue Shield" },
  { label: "Member ID", name: "insuranceMemberId", placeholder: "XZW-2209431" },
  { label: "Group number", name: "insuranceGroupNumber", placeholder: "A44291" },
  { label: "Emergency contact name", name: "emergencyContactName", placeholder: "Dana Johnson" },
  { label: "Emergency relationship", name: "emergencyContactRelationship", placeholder: "Parent" },
  { label: "Emergency phone", name: "emergencyContactPhone", placeholder: "(555) 555-0111", type: "tel" },
  {
    full: true,
    label: "Authorized pickup notes",
    name: "authorizedPickup",
    placeholder: "List approved adults or pickup instructions",
    rows: 3,
    type: "textarea",
  },
  {
    full: true,
    label: "Additional household notes",
    name: "pickupNotes",
    placeholder: "Anything staff, administrators, or providers should know",
    rows: 3,
    type: "textarea",
  },
];

function formatHistoryDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function FamilyMemberForm({
  action,
  submitLabel,
  defaults = emptyFamilyMemberDefaults,
  histories = [],
  memberId,
}: FamilyMemberFormProps) {
  const [values, setValues] = useState(defaults);
  const historiesByField = useMemo(() => {
    const groups = new Map<string, VaultAnswerHistoryEntry[]>();

    for (const history of histories) {
      if (!history.formFieldName) {
        continue;
      }

      const existing = groups.get(history.formFieldName) ?? [];
      existing.push(history);
      groups.set(history.formFieldName, existing);
    }

    return groups;
  }, [histories]);

  function setField(name: FamilyMemberFieldName, value: string) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function renderHistory(name: FamilyMemberFieldName) {
    const entries = historiesByField.get(name) ?? [];

    if (entries.length === 0) {
      return null;
    }

    return (
      <details className="field-history">
        <summary>History</summary>
        <div className="field-history-list">
          {entries.slice(0, 6).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="field-history-option"
              onClick={() => setField(name, entry.value)}
            >
              <strong>{entry.value}</strong>
              <span>
                {entry.templateName} · {formatHistoryDate(entry.createdAt)}
              </span>
            </button>
          ))}
        </div>
      </details>
    );
  }

  return (
    <form action={action} className="form-grid">
      {memberId ? <input type="hidden" name="id" value={memberId} /> : null}
      {fieldConfigs.map((field) => (
        <label key={field.name} className={`field${field.full ? " field-full" : ""}`}>
          <span>{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              rows={field.rows ?? 3}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(event) => setField(field.name, event.target.value)}
            />
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              value={values[field.name]}
              required={field.name === "householdName" || field.name === "fullName"}
              onChange={(event) => setField(field.name, event.target.value)}
            />
          )}
          {renderHistory(field.name)}
        </label>
      ))}
      <div className="field-full button-row">
        <button type="submit" className="button button-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
