import { NextResponse } from "next/server";

import { deleteOriginalFormLayout } from "@/lib/original-form-layouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LayoutRouteContext = {
  params: Promise<{
    layoutId?: string;
  }>;
};

function isMissingRecordError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  const serializedError = String(error);

  return (
    candidate.code === "P2025" ||
    (typeof candidate.message === "string" && candidate.message.includes("required but not found")) ||
    serializedError.includes("P2025") ||
    serializedError.includes("No record was found for a delete")
  );
}

export async function DELETE(_request: Request, context: LayoutRouteContext) {
  const { layoutId = "" } = await context.params;
  const id = layoutId.trim();

  if (!id) {
    return NextResponse.json({ error: "missing-layout", ok: false }, { status: 400 });
  }

  try {
    const result = await deleteOriginalFormLayout(id);

    if (result.count === 0) {
      return NextResponse.json({ error: "layout-not-found", ok: false }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingRecordError(error)) {
      return NextResponse.json({ error: "layout-not-found", ok: false }, { status: 404 });
    }

    console.error("Unable to delete reusable original form layout", error);
    return NextResponse.json({ error: "delete-failed", ok: false }, { status: 500 });
  }
}
