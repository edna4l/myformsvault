import { NextResponse } from "next/server";

import { createApiKeyForCurrentUser } from "@/lib/api-keys";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const { apiKey, rawKey } = await createApiKeyForCurrentUser(`${body?.name ?? "Browser extension"}`);

    return NextResponse.json({
      id: apiKey.id,
      key: rawKey,
      prefix: apiKey.keyPrefix,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create API key.",
      },
      { status: 401 },
    );
  }
}
