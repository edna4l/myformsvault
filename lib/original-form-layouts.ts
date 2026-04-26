import { Prisma } from "@/generated/prisma/client";
import type { OriginalFillPlacement, OriginalFillPlacementKind } from "@/lib/document-fill";
import { fillProfileKeys } from "@/lib/fill-profile-fields";
import { prisma } from "@/lib/prisma";

export type OriginalFormLayoutOption = {
  id: string;
  name: string;
  sourceFileName: string;
  sourceKind: string;
  fieldMappings: Record<string, string>;
  placements: OriginalFillPlacement[];
  updatedAt: string;
};

type LayoutPayload = {
  name: string;
  sourceFileName: string;
  sourceKind: string;
  fieldMappings: Record<string, string>;
  placements: OriginalFillPlacement[];
};

function normalizeFieldMappings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([fieldName, profileKey]) =>
        fieldName.trim() && typeof profileKey === "string" && fillProfileKeys.has(profileKey),
    ),
  );
}

function normalizePlacementNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizePlacementKind(value: unknown): OriginalFillPlacementKind {
  if (value === "check" || value === "highlight" || value === "x") {
    return value;
  }

  return "text";
}

export function normalizeOriginalPlacements(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const placements: OriginalFillPlacement[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const kind = normalizePlacementKind(candidate.kind);
    const profileKey = `${candidate.profileKey ?? ""}`.trim();

    if (kind === "text" && !fillProfileKeys.has(profileKey)) {
      continue;
    }

    placements.push({
      fontSize: normalizePlacementNumber(candidate.fontSize, 11),
      height: normalizePlacementNumber(candidate.height, kind === "highlight" ? 0.035 : 0.03),
      kind,
      pageIndex: normalizePlacementNumber(candidate.pageIndex, 0),
      profileKey: fillProfileKeys.has(profileKey) ? profileKey : undefined,
      width: normalizePlacementNumber(candidate.width, kind === "highlight" ? 0.18 : 0.03),
      x: normalizePlacementNumber(candidate.x, 0),
      y: normalizePlacementNumber(candidate.y, 0),
    });
  }

  return placements;
}

function serializeLayout(layout: {
  id: string;
  name: string;
  sourceFileName: string;
  sourceKind: string;
  fieldMappings: Prisma.JsonValue;
  placements: Prisma.JsonValue;
  updatedAt: Date;
}): OriginalFormLayoutOption {
  return {
    fieldMappings: normalizeFieldMappings(layout.fieldMappings),
    id: layout.id,
    name: layout.name,
    placements: normalizeOriginalPlacements(layout.placements),
    sourceFileName: layout.sourceFileName,
    sourceKind: layout.sourceKind,
    updatedAt: layout.updatedAt.toISOString(),
  };
}

export async function getOriginalFormLayouts() {
  const layouts = await prisma.originalFormLayout.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    take: 24,
  });

  return layouts.map(serializeLayout);
}

export async function getOriginalFormLayoutById(id: string) {
  const layout = await prisma.originalFormLayout.findUnique({
    where: { id },
  });

  return layout ? serializeLayout(layout) : null;
}

function getLayoutName(input: Pick<LayoutPayload, "name" | "sourceFileName">) {
  return input.name.trim().slice(0, 90) || input.sourceFileName.replace(/\.[^.]+$/, "") || "Original form layout";
}

export async function createOriginalFormLayout(input: LayoutPayload) {
  return prisma.originalFormLayout.create({
    data: {
      fieldMappings: input.fieldMappings,
      name: getLayoutName(input),
      placements: input.placements,
      sourceFileName: input.sourceFileName.slice(0, 180),
      sourceKind: input.sourceKind,
    },
  });
}

export async function updateOriginalFormLayout(id: string, input: LayoutPayload) {
  return prisma.originalFormLayout.update({
    data: {
      fieldMappings: input.fieldMappings,
      name: getLayoutName(input),
      placements: input.placements,
      sourceFileName: input.sourceFileName.slice(0, 180),
      sourceKind: input.sourceKind,
    },
    where: { id },
  });
}

export async function deleteOriginalFormLayout(id: string) {
  const layout = await prisma.originalFormLayout.findUnique({
    where: { id },
  });

  if (!layout) {
    return { count: 0 };
  }

  await prisma.originalFormLayout.delete({
    where: { id },
  });

  return { count: 1 };
}
