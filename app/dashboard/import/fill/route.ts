import { NextResponse } from "next/server";

import {
  MAX_ORIGINAL_FILL_UPLOAD_BYTES,
  createOriginalPdfCopy,
  fillOriginalPdf,
  getFilledDocumentFilename,
  getOriginalFileKind,
  type OriginalFillPlacement,
  type OriginalFillPlacementKind,
} from "@/lib/document-fill";
import { fillProfileKeys } from "@/lib/fill-profile-fields";
import { getFamilyMemberById } from "@/lib/forms";
import {
  createOriginalFormLayout,
  getOriginalFormLayoutById,
  updateOriginalFormLayout,
} from "@/lib/original-form-layouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRedirectBase(request: Request) {
  return new URL(request.url).origin;
}

function redirectWithRequest(request: Request, error: string) {
  const redirectUrl = new URL(`/dashboard/import?method=fill&error=${error}`, getRedirectBase(request));

  return NextResponse.json(
    {
      error,
      ok: false,
      redirect: `${redirectUrl.pathname}${redirectUrl.search}`,
    },
    { status: 400 },
  );
}

function getManualFieldMappings(formData: FormData) {
  const pdfFieldNames = formData.getAll("pdfFieldName").map((value) => `${value}`.trim());
  const profileKeys = formData.getAll("profileKey").map((value) => `${value}`.trim());
  const fieldMappings: Record<string, string> = {};

  pdfFieldNames.forEach((fieldName, index) => {
    const profileKey = profileKeys[index] ?? "";

    if (fieldName && fillProfileKeys.has(profileKey)) {
      fieldMappings[fieldName] = profileKey;
    }
  });

  return fieldMappings;
}

function getSubmittedPlacementKind(value: unknown): OriginalFillPlacementKind {
  if (value === "check" || value === "highlight" || value === "x") {
    return value;
  }

  return "text";
}

function getOriginalPlacements(formData: FormData): OriginalFillPlacement[] {
  const rawPlacementData = `${formData.get("placementData") ?? ""}`.trim();

  if (!rawPlacementData) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPlacementData);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const placements: OriginalFillPlacement[] = [];

    for (const placement of parsed) {
      if (!placement || typeof placement !== "object") {
        continue;
      }

      const candidate = placement as Record<string, unknown>;
      const kind = getSubmittedPlacementKind(candidate.kind);
      const profileKey = `${candidate.profileKey ?? ""}`.trim();

      if (kind === "text" && !fillProfileKeys.has(profileKey)) {
        continue;
      }

      placements.push({
        fontSize: Number(candidate.fontSize),
        height: Number(candidate.height),
        kind,
        pageIndex: Number(candidate.pageIndex),
        profileKey: fillProfileKeys.has(profileKey) ? profileKey : undefined,
        width: Number(candidate.width),
        x: Number(candidate.x),
        y: Number(candidate.y),
      });
    }

    return placements;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const memberId = `${formData.get("memberId") ?? ""}`.trim();
  const layoutId = `${formData.get("layoutId") ?? ""}`.trim();
  const layoutName = `${formData.get("layoutName") ?? ""}`.trim();
  const layoutSaveMode = formData.get("layoutSaveMode") === "update" ? "update" : "create";
  const shouldSaveLayout = formData.get("saveLayout") === "1";
  const fileValue = formData.get("sourceFile");
  const file = fileValue instanceof File ? fileValue : null;

  if (!file || file.size === 0) {
    return redirectWithRequest(request, "validation");
  }

  if (file.size > MAX_ORIGINAL_FILL_UPLOAD_BYTES) {
    return redirectWithRequest(request, "file-too-large");
  }

  const sourceKind = getOriginalFileKind(file);

  if (sourceKind === "unsupported") {
    return redirectWithRequest(request, "unsupported-type");
  }

  const submittedFieldMappings = getManualFieldMappings(formData);
  const submittedPlacements = getOriginalPlacements(formData);
  const placementDataWasSubmitted = `${formData.get("placementData") ?? ""}`.trim().length > 0;
  const hasSubmittedFillWork = submittedPlacements.length > 0 || Object.keys(submittedFieldMappings).length > 0 || Boolean(layoutId);

  if (!memberId && !hasSubmittedFillWork) {
    const originalBytes = await createOriginalPdfCopy(file, sourceKind);

    if (!originalBytes) {
      return redirectWithRequest(request, "unsupported-type");
    }

    return new Response(Buffer.from(originalBytes), {
      headers: {
        "Content-Disposition": `attachment; filename="${getFilledDocumentFilename(file.name)}"`,
        "Content-Length": `${originalBytes.byteLength}`,
        "Content-Type": "application/pdf",
        "X-MyFormsVault-Filled-Fields": "0",
        "X-MyFormsVault-Layout-Action": "none",
        "X-MyFormsVault-Layout-Saved": "0",
        "X-MyFormsVault-Total-Fields": "0",
      },
    });
  }

  if (!memberId) {
    return redirectWithRequest(request, "profile");
  }

  let member: Awaited<ReturnType<typeof getFamilyMemberById>>;

  try {
    member = await getFamilyMemberById(memberId);
  } catch (error) {
    console.error("Unable to load family profile for original fill workflow", error);
    return redirectWithRequest(request, "db");
  }

  if (!member) {
    return redirectWithRequest(request, "profile");
  }

  let savedLayout: Awaited<ReturnType<typeof getOriginalFormLayoutById>> = null;

  if (layoutId) {
    try {
      savedLayout = await getOriginalFormLayoutById(layoutId);
    } catch (error) {
      console.error("Unable to load reusable original form layout", error);
    }
  }

  const fieldMappings = {
    ...(savedLayout?.fieldMappings ?? {}),
    ...submittedFieldMappings,
  };
  const placements = placementDataWasSubmitted ? submittedPlacements : (savedLayout?.placements ?? []);

  const result = await fillOriginalPdf(file, member, {
    fieldMappings,
    placements,
  });

  if (!result.ok) {
    return redirectWithRequest(request, result.error);
  }

  let layoutSaveAction: "created" | "none" | "updated" = "none";

  if (shouldSaveLayout && (placements.length > 0 || Object.keys(fieldMappings).length > 0)) {
    const layoutPayload = {
      fieldMappings,
      name: layoutName,
      placements,
      sourceFileName: file.name,
      sourceKind,
    };

    try {
      if (layoutSaveMode === "update" && savedLayout) {
        await updateOriginalFormLayout(savedLayout.id, layoutPayload);
        layoutSaveAction = "updated";
      } else {
        await createOriginalFormLayout(layoutPayload);
        layoutSaveAction = "created";
      }
    } catch (error) {
      console.error("Unable to save reusable original form layout", error);
    }
  }

  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Disposition": `attachment; filename="${getFilledDocumentFilename(file.name)}"`,
      "Content-Length": `${result.bytes.byteLength}`,
      "Content-Type": "application/pdf",
      "X-MyFormsVault-Filled-Fields": `${result.filledCount}`,
      "X-MyFormsVault-Layout-Action": layoutSaveAction,
      "X-MyFormsVault-Layout-Saved": layoutSaveAction === "none" ? "0" : "1",
      "X-MyFormsVault-Total-Fields": `${result.totalFields}`,
    },
  });
}
