import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = body?.action === "2fa_enabled" ? "2fa_enabled" : "security_updated";

  await logAuditEvent({
    action,
    metadata: {
      source: "security_panel",
    },
    targetType: "account_security",
  });

  return NextResponse.json({ ok: true });
}
