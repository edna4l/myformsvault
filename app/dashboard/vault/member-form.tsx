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

type FamilyMemberFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: FamilyMemberFormDefaults;
  memberId?: string;
};

export function FamilyMemberForm({
  action,
  submitLabel,
  defaults = emptyFamilyMemberDefaults,
  memberId,
}: FamilyMemberFormProps) {
  return (
    <form action={action} className="form-grid">
      {memberId ? <input type="hidden" name="id" value={memberId} /> : null}
      <label className="field">
        <span>Household name</span>
        <input
          name="householdName"
          type="text"
          placeholder="Johnson family"
          defaultValue={defaults.householdName}
          required
        />
      </label>
      <label className="field">
        <span>Full name</span>
        <input
          name="fullName"
          type="text"
          placeholder="Mia Johnson"
          defaultValue={defaults.fullName}
          required
        />
      </label>
      <label className="field">
        <span>Relationship</span>
        <input
          name="relationship"
          type="text"
          placeholder="Child, guardian, sibling..."
          defaultValue={defaults.relationship}
        />
      </label>
      <label className="field">
        <span>Date of birth</span>
        <input name="dateOfBirth" type="date" defaultValue={defaults.dateOfBirth} />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          placeholder="guardian@example.com"
          defaultValue={defaults.email}
        />
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          name="phone"
          type="tel"
          placeholder="(555) 555-0140"
          defaultValue={defaults.phone}
        />
      </label>
      <label className="field field-full">
        <span>Street address</span>
        <textarea
          name="streetAddress"
          rows={3}
          placeholder="123 Main St, Apartment 5"
          defaultValue={defaults.streetAddress}
        />
      </label>
      <label className="field field-full">
        <span>Mailing address</span>
        <textarea
          name="mailingAddress"
          rows={3}
          placeholder="PO Box 321, Oakland, CA 94612"
          defaultValue={defaults.mailingAddress}
        />
      </label>
      <label className="field">
        <span>Primary language</span>
        <input
          name="primaryLanguage"
          type="text"
          placeholder="English"
          defaultValue={defaults.primaryLanguage}
        />
      </label>
      <label className="field">
        <span>School name</span>
        <input
          name="schoolName"
          type="text"
          placeholder="Lakeside Elementary"
          defaultValue={defaults.schoolName}
        />
      </label>
      <label className="field">
        <span>Grade level</span>
        <input
          name="gradeLevel"
          type="text"
          placeholder="4th grade"
          defaultValue={defaults.gradeLevel}
        />
      </label>
      <label className="field">
        <span>Student ID</span>
        <input
          name="studentId"
          type="text"
          placeholder="204155"
          defaultValue={defaults.studentId}
        />
      </label>
      <label className="field">
        <span>Teacher or counselor</span>
        <input
          name="teacher"
          type="text"
          placeholder="Ms. Adams"
          defaultValue={defaults.teacher}
        />
      </label>
      <label className="field field-full">
        <span>Allergies</span>
        <textarea
          name="allergies"
          rows={3}
          placeholder="Peanuts, shellfish..."
          defaultValue={defaults.allergies}
        />
      </label>
      <label className="field field-full">
        <span>Medications</span>
        <textarea
          name="medications"
          rows={3}
          placeholder="Medication names and dosage details"
          defaultValue={defaults.medications}
        />
      </label>
      <label className="field field-full">
        <span>Conditions or medical notes</span>
        <textarea
          name="conditions"
          rows={3}
          placeholder="Asthma action plan on file"
          defaultValue={defaults.conditions}
        />
      </label>
      <label className="field">
        <span>Primary physician</span>
        <input
          name="physician"
          type="text"
          placeholder="Dr. Nguyen"
          defaultValue={defaults.physician}
        />
      </label>
      <label className="field">
        <span>Insurance provider</span>
        <input
          name="insuranceProvider"
          type="text"
          placeholder="Blue Shield"
          defaultValue={defaults.insuranceProvider}
        />
      </label>
      <label className="field">
        <span>Member ID</span>
        <input
          name="insuranceMemberId"
          type="text"
          placeholder="XZW-2209431"
          defaultValue={defaults.insuranceMemberId}
        />
      </label>
      <label className="field">
        <span>Group number</span>
        <input
          name="insuranceGroupNumber"
          type="text"
          placeholder="A44291"
          defaultValue={defaults.insuranceGroupNumber}
        />
      </label>
      <label className="field">
        <span>Emergency contact name</span>
        <input
          name="emergencyContactName"
          type="text"
          placeholder="Dana Johnson"
          defaultValue={defaults.emergencyContactName}
        />
      </label>
      <label className="field">
        <span>Emergency relationship</span>
        <input
          name="emergencyContactRelationship"
          type="text"
          placeholder="Parent"
          defaultValue={defaults.emergencyContactRelationship}
        />
      </label>
      <label className="field">
        <span>Emergency phone</span>
        <input
          name="emergencyContactPhone"
          type="tel"
          placeholder="(555) 555-0111"
          defaultValue={defaults.emergencyContactPhone}
        />
      </label>
      <label className="field field-full">
        <span>Authorized pickup notes</span>
        <textarea
          name="authorizedPickup"
          rows={3}
          placeholder="List approved adults or pickup instructions"
          defaultValue={defaults.authorizedPickup}
        />
      </label>
      <label className="field field-full">
        <span>Additional household notes</span>
        <textarea
          name="pickupNotes"
          rows={3}
          placeholder="Anything staff, administrators, or providers should know"
          defaultValue={defaults.pickupNotes}
        />
      </label>
      <div className="field-full button-row">
        <button type="submit" className="button button-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
