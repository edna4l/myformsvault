"use client";

import { useState } from "react";

import { saveVaultTextSelectionAction } from "@/app/actions";
import type { FillOriginalMemberOption } from "./fill/fill-original-form";

type VaultTextClipperProps = {
  familyMembers: FillOriginalMemberOption[];
  sourceText: string;
};

const vaultFields = [
  ["basic.email", "Email"],
  ["basic.phone", "Phone"],
  ["basic.streetAddress", "Street address"],
  ["basic.mailingAddress", "Mailing address"],
  ["basic.dateOfBirth", "Date of birth"],
  ["school.schoolName", "School name"],
  ["school.gradeLevel", "Grade level"],
  ["school.studentId", "Student ID"],
  ["school.teacher", "Teacher"],
  ["medical.allergies", "Allergies"],
  ["medical.medications", "Medications"],
  ["medical.conditions", "Medical notes"],
  ["medical.physician", "Primary physician"],
  ["insurance.provider", "Insurance provider"],
  ["insurance.memberId", "Insurance member ID"],
  ["insurance.groupNumber", "Insurance group number"],
  ["emergency.contactName", "Emergency contact"],
  ["emergency.contactRelationship", "Emergency relationship"],
  ["emergency.contactPhone", "Emergency phone"],
  ["household.primaryLanguage", "Primary language"],
  ["household.authorizedPickup", "Authorized pickup"],
  ["household.pickupNotes", "Household notes"],
] as const;

export function VaultTextClipper({ familyMembers, sourceText }: VaultTextClipperProps) {
  const [selectedText, setSelectedText] = useState("");

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim() ?? "";

    if (selection) {
      setSelectedText(selection.slice(0, 1200));
    }
  }

  return (
    <section className="field-full vault-text-clipper">
      <div>
        <span className="eyebrow">Vault clipper</span>
        <h2>Select text from this import and save it to the vault</h2>
        <p className="list-copy">
          Highlight text in the extracted document text, then choose where it should live in a saved profile.
        </p>
      </div>
      <div className="vault-text-source" onMouseUp={captureSelection} onTouchEnd={captureSelection}>
        {sourceText}
      </div>
      <form action={saveVaultTextSelectionAction} className="form-grid">
        <label className="field">
          <span>Selected text</span>
          <textarea
            name="sourceText"
            rows={3}
            value={selectedText}
            onChange={(event) => setSelectedText(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Saved profile</span>
          <select name="memberId" required>
            <option value="">Choose a profile</option>
            {familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName} · {member.householdName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Vault field</span>
          <select name="vaultField" required>
            {vaultFields.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="field button-row">
          <button type="submit" className="button button-secondary" disabled={!selectedText}>
            Save selected text
          </button>
        </div>
      </form>
    </section>
  );
}
