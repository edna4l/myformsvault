import { FormStatus, Prisma, type Form } from "@/generated/prisma/client";

import { prisma } from "./prisma";

export type FormField = {
  name: "fullName" | "email" | "company" | "website" | "goals";
  label: string;
  type: "text" | "email" | "url" | "textarea";
  placeholder: string;
  required: boolean;
};

type FormPreset = "lead" | "client";

const leadIntakeFields: FormField[] = [
  { name: "fullName", label: "Full name", type: "text", placeholder: "Jordan Lee", required: true },
  { name: "email", label: "Work email", type: "email", placeholder: "jordan@company.com", required: true },
  { name: "company", label: "Company", type: "text", placeholder: "Studio Nova", required: false },
  { name: "website", label: "Website", type: "url", placeholder: "https://", required: false },
  {
    name: "goals",
    label: "What do you need help with?",
    type: "textarea",
    placeholder: "Tell us about the project, timeline, and what success looks like.",
    required: true,
  },
];

const clientIntakeFields: FormField[] = [
  { name: "fullName", label: "Primary contact", type: "text", placeholder: "Taylor Morgan", required: true },
  { name: "email", label: "Best email", type: "email", placeholder: "taylor@brand.co", required: true },
  { name: "company", label: "Company or team", type: "text", placeholder: "Brand Studio", required: false },
  { name: "website", label: "Existing site", type: "url", placeholder: "https://", required: false },
  {
    name: "goals",
    label: "Project overview",
    type: "textarea",
    placeholder: "What are you building and what should this form help you collect?",
    required: true,
  },
];

function colorForPreset(preset: FormPreset) {
  return preset === "client" ? "#2d8b77" : "#ef6f34";
}

function headlineForPreset(name: string, preset: FormPreset) {
  return preset === "client"
    ? `Start your ${name.toLowerCase()} conversation`
    : `Tell us what ${name.toLowerCase()} should unlock next`;
}

function descriptionForPreset(name: string, preset: FormPreset) {
  return preset === "client"
    ? `Use ${name} to gather context before kickoff, approvals, and timeline planning.`
    : `Use ${name} to capture the right lead details, triage requests, and keep the next step obvious.`;
}

const starterForms = [
  { name: "Partnership Pipeline", slug: "partnership-pipeline", preset: "lead" as FormPreset, status: FormStatus.ACTIVE },
  { name: "Client Kickoff", slug: "client-kickoff", preset: "client" as FormPreset, status: FormStatus.ACTIVE },
];

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function getPresetFields(preset: FormPreset) {
  return preset === "client" ? clientIntakeFields : leadIntakeFields;
}

export function parseFields(value: Prisma.JsonValue): FormField[] {
  if (!Array.isArray(value)) {
    return leadIntakeFields;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const name = `${candidate.name ?? ""}` as FormField["name"];
      const type = `${candidate.type ?? ""}` as FormField["type"];

      if (!name || !type) {
        return null;
      }

      return {
        name,
        label: `${candidate.label ?? name}`,
        type,
        placeholder: `${candidate.placeholder ?? ""}`,
        required: Boolean(candidate.required),
      } satisfies FormField;
    })
    .filter((item): item is FormField => item !== null);
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

async function createStarterForm(input: { name: string; slug: string; preset: FormPreset; status: FormStatus }) {
  return prisma.form.create({
    data: {
      name: input.name,
      slug: input.slug,
      headline: headlineForPreset(input.name, input.preset),
      description: descriptionForPreset(input.name, input.preset),
      accent: colorForPreset(input.preset),
      status: input.status,
      fields: getPresetFields(input.preset),
    },
  });
}

export async function ensureSeedData() {
  const count = await prisma.form.count();

  if (count > 0) {
    return;
  }

  for (const form of starterForms) {
    await createStarterForm(form);
  }
}

export async function getDashboardData() {
  await ensureSeedData();

  const [forms, leads, submissionCount] = await Promise.all([
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
  ]);

  return {
    forms,
    leads,
    metrics: {
      forms: forms.length,
      liveForms: forms.filter((form) => form.status === FormStatus.ACTIVE).length,
      submissions: submissionCount,
    },
  };
}

export async function getFormById(id: string) {
  await ensureSeedData();

  return prisma.form.findUnique({
    where: { id },
    include: {
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
  preset: FormPreset;
}) {
  return prisma.form.create({
    data: {
      name: input.name,
      slug: input.slug,
      headline: input.headline,
      description: input.description,
      accent: input.accent,
      status: FormStatus.ACTIVE,
      fields: getPresetFields(input.preset),
    },
  });
}

export async function createSubmission(form: Form, input: {
  fullName: string;
  email: string;
  company?: string;
  website?: string;
  goals: string;
}) {
  return prisma.formSubmission.create({
    data: {
      formId: form.id,
      fullName: input.fullName,
      email: input.email,
      company: input.company,
      website: input.website,
      goals: input.goals,
    },
  });
}
