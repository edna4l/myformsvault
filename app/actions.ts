"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  type FormSection,
  createFamilyMember,
  createForm,
  createImportedForm,
  createLead,
  createSubmission,
  deleteFamilyMember,
  getFormBySlug,
  normalizeSlug,
  parseSections,
  updateForm,
  updateFamilyMember,
} from "@/lib/forms";
import { prepareImportQueryState } from "@/lib/import-sources";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  teamSize: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().min(12).max(600),
});

const createFormSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(60),
  headline: z.string().trim().min(8).max(120),
  description: z.string().trim().min(12).max(240),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  templateSlug: z.string().trim().min(3).max(80),
});

const importFormSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(60),
  headline: z.string().trim().min(8).max(120),
  description: z.string().trim().min(12).max(240),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  sourceText: z.string().trim().min(20).max(12000),
});

const customFieldSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["text", "email", "url", "textarea", "date", "tel"]),
  placeholder: z.string().trim().max(240).optional().or(z.literal("")),
  required: z.boolean(),
});

const customSectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240),
  fields: z.array(customFieldSchema).min(1).max(20),
});

const familyMemberSchema = z.object({
  householdName: z.string().trim().min(2).max(80),
  fullName: z.string().trim().min(2).max(80),
  relationship: z.string().trim().max(40).optional().or(z.literal("")),
  dateOfBirth: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  streetAddress: z.string().trim().max(240).optional().or(z.literal("")),
  mailingAddress: z.string().trim().max(240).optional().or(z.literal("")),
  primaryLanguage: z.string().trim().max(40).optional().or(z.literal("")),
  schoolName: z.string().trim().max(80).optional().or(z.literal("")),
  gradeLevel: z.string().trim().max(40).optional().or(z.literal("")),
  studentId: z.string().trim().max(40).optional().or(z.literal("")),
  teacher: z.string().trim().max(80).optional().or(z.literal("")),
  allergies: z.string().trim().max(600).optional().or(z.literal("")),
  medications: z.string().trim().max(600).optional().or(z.literal("")),
  conditions: z.string().trim().max(600).optional().or(z.literal("")),
  physician: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceProvider: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceMemberId: z.string().trim().max(80).optional().or(z.literal("")),
  insuranceGroupNumber: z.string().trim().max(80).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(80).optional().or(z.literal("")),
  emergencyContactRelationship: z.string().trim().max(40).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  authorizedPickup: z.string().trim().max(600).optional().or(z.literal("")),
  pickupNotes: z.string().trim().max(600).optional().or(z.literal("")),
});

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isMissingRecord(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function getSectionIds(formData: FormData) {
  return formData
    .getAll("sectionIds")
    .map((value) => `${value}`.trim())
    .filter(Boolean);
}

function normalizeCustomToken(value: string, fallback: string) {
  return normalizeSlug(value.replace(/\./g, "-")) || fallback;
}

function getCustomSections(formData: FormData): FormSection[] | null {
  const raw = `${formData.get("customSections") ?? "[]"}`.trim();

  if (!raw) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = z.array(customSectionSchema).max(12).safeParse(parsedValue);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((section, sectionIndex) => {
    const baseSectionId = normalizeCustomToken(section.id || section.title, `custom-section-${sectionIndex + 1}`);
    const sectionId = baseSectionId.startsWith("custom-") ? baseSectionId : `custom-${baseSectionId}`;

    return {
      id: sectionId,
      title: section.title,
      description: section.description,
      fields: section.fields.map((field, fieldIndex) => {
        const fieldId = normalizeCustomToken(field.id || field.label, `field-${fieldIndex + 1}`);

        return {
          key: `custom.${sectionId}.${fieldId}`,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder || "",
          required: field.required,
        };
      }),
    };
  });
}

function validateFieldValue(type: string, value: string) {
  if (!value) {
    return true;
  }

  if (type === "email") {
    return z.string().email().safeParse(value).success;
  }

  if (type === "url") {
    return z.string().url().safeParse(value).success;
  }

  return true;
}

function buildFamilyMemberPayload(data: z.infer<typeof familyMemberSchema>) {
  return {
    householdName: data.householdName,
    fullName: data.fullName,
    relationship: data.relationship || undefined,
    basicInfo: {
      dateOfBirth: data.dateOfBirth || "",
      email: data.email || "",
      phone: data.phone || "",
      streetAddress: data.streetAddress || "",
      mailingAddress: data.mailingAddress || "",
      primaryLanguage: data.primaryLanguage || "",
    },
    schoolInfo: {
      schoolName: data.schoolName || "",
      gradeLevel: data.gradeLevel || "",
      studentId: data.studentId || "",
      teacher: data.teacher || "",
    },
    medicalInfo: {
      allergies: data.allergies || "",
      medications: data.medications || "",
      conditions: data.conditions || "",
      physician: data.physician || "",
    },
    insuranceInfo: {
      provider: data.insuranceProvider || "",
      memberId: data.insuranceMemberId || "",
      groupNumber: data.insuranceGroupNumber || "",
    },
    emergencyInfo: {
      contactName: data.emergencyContactName || "",
      contactRelationship: data.emergencyContactRelationship || "",
      contactPhone: data.emergencyContactPhone || "",
      authorizedPickup: data.authorizedPickup || "",
      pickupNotes: data.pickupNotes || "",
    },
  };
}

function redirectToPreparedImport(
  state: Partial<{
    method: string;
    draft: string;
    sourceLabel: string;
    sourceTitle: string;
    sourceKind: string;
    sourceType: string;
    usedFallbackText: boolean;
  }>,
  error?: string,
) {
  const params = new URLSearchParams();

  if (state.method) {
    params.set("method", state.method);
  }

  if (state.draft) {
    params.set("draft", state.draft);
  }

  if (state.sourceLabel) {
    params.set("sourceLabel", state.sourceLabel);
  }

  if (state.sourceTitle) {
    params.set("sourceTitle", state.sourceTitle);
  }

  if (state.sourceKind) {
    params.set("sourceKind", state.sourceKind);
  }

  if (state.sourceType) {
    params.set("sourceType", state.sourceType);
  }

  if (state.usedFallbackText) {
    params.set("usedFallbackText", "1");
  }

  if (error) {
    params.set("error", error);
  }

  const query = params.toString();
  redirect(query ? `/dashboard/import?${query}` : "/dashboard/import");
}

export async function captureLeadAction(formData: FormData) {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    teamSize: formData.get("teamSize"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect("/?error=lead");
  }

  await createLead({
    ...parsed.data,
    company: parsed.data.company || undefined,
    teamSize: parsed.data.teamSize || undefined,
  });

  revalidatePath("/dashboard");
  redirect("/?submitted=1");
}

export async function createFormAction(formData: FormData) {
  const templateSlug = `${formData.get("templateSlug") ?? ""}`.trim();
  const rawSlug = `${formData.get("slug") ?? ""}`;
  const sectionIds = getSectionIds(formData);
  const customSections = getCustomSections(formData);
  const parsed = createFormSchema.safeParse({
    name: formData.get("name"),
    slug: normalizeSlug(rawSlug),
    headline: formData.get("headline"),
    description: formData.get("description"),
    accent: formData.get("accent"),
    templateSlug,
  });

  if (!parsed.success || !customSections || sectionIds.length + customSections.length === 0) {
    redirect(`/dashboard/forms/new?template=${encodeURIComponent(templateSlug)}&error=validation`);
  }

  try {
    const form = await createForm({
      ...parsed.data,
      sectionIds,
      customSections,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/templates");
    redirect(`/dashboard/forms/${form.id}?created=1`);
  } catch (error) {
    if (isUniqueViolation(error)) {
      redirect(`/dashboard/forms/new?template=${encodeURIComponent(templateSlug)}&error=slug`);
    }

    throw error;
  }
}

export async function updateFormAction(formData: FormData) {
  const templateSlug = `${formData.get("templateSlug") ?? ""}`.trim();
  const rawSlug = `${formData.get("slug") ?? ""}`;
  const id = `${formData.get("id") ?? ""}`.trim();
  const sectionIds = getSectionIds(formData);
  const customSections = getCustomSections(formData);
  const parsed = createFormSchema.safeParse({
    name: formData.get("name"),
    slug: normalizeSlug(rawSlug),
    headline: formData.get("headline"),
    description: formData.get("description"),
    accent: formData.get("accent"),
    templateSlug,
  });

  if (!id || !parsed.success || !customSections || sectionIds.length + customSections.length === 0) {
    redirect(`/dashboard/forms/${id}/edit?error=validation`);
  }

  try {
    const form = await updateForm({
      id,
      ...parsed.data,
      sectionIds,
      customSections,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/forms/${form.id}`);
    revalidatePath(`/dashboard/forms/${form.id}/edit`);
    revalidatePath(`/f/${form.slug}`);
    redirect(`/dashboard/forms/${form.id}?updated=1`);
  } catch (error) {
    if (isUniqueViolation(error)) {
      redirect(`/dashboard/forms/${id}/edit?error=slug`);
    }

    throw error;
  }
}

export async function prepareImportSourceAction(formData: FormData) {
  const prepared = await prepareImportQueryState(formData);

  if (prepared.ok) {
    redirectToPreparedImport(prepared.state);
  } else {
    redirectToPreparedImport(
      prepared.state ?? { method: `${formData.get("method") ?? "application"}` },
      prepared.error,
    );
  }
}

export async function importFormAction(formData: FormData) {
  const parsed = importFormSchema.safeParse({
    name: formData.get("name"),
    slug: normalizeSlug(`${formData.get("slug") ?? ""}`),
    headline: formData.get("headline"),
    description: formData.get("description"),
    accent: formData.get("accent"),
    sourceText: formData.get("sourceText"),
  });

  if (!parsed.success) {
    redirect("/dashboard/import?error=validation");
  }

  try {
    const form = await createImportedForm(parsed.data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/import");
    redirect(`/dashboard/forms/${form.id}?created=1`);
  } catch (error) {
    if (isUniqueViolation(error)) {
      redirect("/dashboard/import?error=slug");
    }

    throw error;
  }
}

export async function createFamilyMemberAction(formData: FormData) {
  const parsed = familyMemberSchema.safeParse({
    householdName: formData.get("householdName"),
    fullName: formData.get("fullName"),
    relationship: formData.get("relationship"),
    dateOfBirth: formData.get("dateOfBirth"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    streetAddress: formData.get("streetAddress"),
    mailingAddress: formData.get("mailingAddress"),
    primaryLanguage: formData.get("primaryLanguage"),
    schoolName: formData.get("schoolName"),
    gradeLevel: formData.get("gradeLevel"),
    studentId: formData.get("studentId"),
    teacher: formData.get("teacher"),
    allergies: formData.get("allergies"),
    medications: formData.get("medications"),
    conditions: formData.get("conditions"),
    physician: formData.get("physician"),
    insuranceProvider: formData.get("insuranceProvider"),
    insuranceMemberId: formData.get("insuranceMemberId"),
    insuranceGroupNumber: formData.get("insuranceGroupNumber"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactRelationship: formData.get("emergencyContactRelationship"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    authorizedPickup: formData.get("authorizedPickup"),
    pickupNotes: formData.get("pickupNotes"),
  });

  if (!parsed.success) {
    redirect("/dashboard/vault?error=validation");
  }

  await createFamilyMember(buildFamilyMemberPayload(parsed.data));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vault");
  redirect("/dashboard/vault?created=1");
}

export async function updateFamilyMemberAction(formData: FormData) {
  const id = `${formData.get("id") ?? ""}`.trim();
  const parsed = familyMemberSchema.safeParse({
    householdName: formData.get("householdName"),
    fullName: formData.get("fullName"),
    relationship: formData.get("relationship"),
    dateOfBirth: formData.get("dateOfBirth"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    streetAddress: formData.get("streetAddress"),
    mailingAddress: formData.get("mailingAddress"),
    primaryLanguage: formData.get("primaryLanguage"),
    schoolName: formData.get("schoolName"),
    gradeLevel: formData.get("gradeLevel"),
    studentId: formData.get("studentId"),
    teacher: formData.get("teacher"),
    allergies: formData.get("allergies"),
    medications: formData.get("medications"),
    conditions: formData.get("conditions"),
    physician: formData.get("physician"),
    insuranceProvider: formData.get("insuranceProvider"),
    insuranceMemberId: formData.get("insuranceMemberId"),
    insuranceGroupNumber: formData.get("insuranceGroupNumber"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactRelationship: formData.get("emergencyContactRelationship"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    authorizedPickup: formData.get("authorizedPickup"),
    pickupNotes: formData.get("pickupNotes"),
  });

  if (!id || !parsed.success) {
    redirect(id ? `/dashboard/vault/${id}/edit?error=validation` : "/dashboard/vault?error=validation");
  }

  try {
    await updateFamilyMember({
      id,
      ...buildFamilyMemberPayload(parsed.data),
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      redirect("/dashboard/vault");
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vault");
  revalidatePath(`/dashboard/vault/${id}/edit`);
  redirect("/dashboard/vault?updated=1");
}

export async function deleteFamilyMemberAction(formData: FormData) {
  const id = `${formData.get("id") ?? ""}`.trim();

  if (!id) {
    redirect("/dashboard/vault");
  }

  try {
    await deleteFamilyMember(id);
  } catch (error) {
    if (isMissingRecord(error)) {
      redirect("/dashboard/vault");
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/vault");
  redirect("/dashboard/vault?deleted=1");
}

export async function submitPublicFormAction(formData: FormData) {
  const slug = normalizeSlug(`${formData.get("slug") ?? ""}`);
  const form = await getFormBySlug(slug);

  if (!form) {
    redirect("/");
  }

  const sections = parseSections(form.sections ?? form.fields);
  const values: Record<string, string> = {};

  for (const field of sections.flatMap((section) => section.fields)) {
    const value = `${formData.get(field.key) ?? ""}`.trim();

    if (field.required && value.length === 0) {
      redirect(`/f/${slug}?error=submission`);
    }

    if (!validateFieldValue(field.type, value)) {
      redirect(`/f/${slug}?error=submission`);
    }

    values[field.key] = value;
  }

  await createSubmission(form, values);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/forms/${form.id}`);
  redirect(`/f/${slug}?submitted=1`);
}
