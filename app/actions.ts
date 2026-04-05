"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { createForm, createLead, createSubmission, getFormBySlug, normalizeSlug } from "@/lib/forms";

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
  preset: z.enum(["lead", "client"]),
});

const submissionSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  website: z.string().trim().url().optional().or(z.literal("")),
  goals: z.string().trim().min(12).max(1200),
});

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
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
  const rawSlug = `${formData.get("slug") ?? ""}`;
  const parsed = createFormSchema.safeParse({
    name: formData.get("name"),
    slug: normalizeSlug(rawSlug),
    headline: formData.get("headline"),
    description: formData.get("description"),
    accent: formData.get("accent"),
    preset: formData.get("preset"),
  });

  if (!parsed.success) {
    redirect("/dashboard/forms/new?error=validation");
  }

  try {
    const form = await createForm(parsed.data);
    revalidatePath("/dashboard");
    redirect(`/dashboard/forms/${form.id}?created=1`);
  } catch (error) {
    if (isUniqueViolation(error)) {
      redirect("/dashboard/forms/new?error=slug");
    }

    throw error;
  }
}

export async function submitPublicFormAction(formData: FormData) {
  const slug = normalizeSlug(`${formData.get("slug") ?? ""}`);
  const form = await getFormBySlug(slug);

  if (!form) {
    redirect("/");
  }

  const parsed = submissionSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    company: formData.get("company"),
    website: formData.get("website"),
    goals: formData.get("goals"),
  });

  if (!parsed.success) {
    redirect(`/f/${slug}?error=submission`);
  }

  await createSubmission(form, {
    ...parsed.data,
    company: parsed.data.company || undefined,
    website: parsed.data.website || undefined,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/forms/${form.id}`);
  redirect(`/f/${slug}?submitted=1`);
}
