import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

function getPathAfterFunction(url: URL) {
  const marker = "/api-vault";
  const index = url.pathname.indexOf(marker);

  return index >= 0 ? url.pathname.slice(index + marker.length) || "/" : url.pathname;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rawKey = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey) {
    return json({ error: "Missing API key." }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const keyHash = await sha256(rawKey);
  const { data: apiKey, error: keyError } = await supabase
    .schema("myformsvault")
    .from("ApiKey")
    .select("id,userId,revokedAt")
    .eq("keyHash", keyHash)
    .maybeSingle();

  if (keyError || !apiKey || apiKey.revokedAt) {
    return json({ error: "Invalid API key." }, { status: 401 });
  }

  await supabase
    .schema("myformsvault")
    .from("ApiKey")
    .update({ lastUsedAt: new Date().toISOString() })
    .eq("id", apiKey.id);

  const path = getPathAfterFunction(new URL(request.url));

  if (request.method === "GET" && path === "/vault") {
    const { data, error } = await supabase
      .schema("myformsvault")
      .from("FamilyMember")
      .select("id,fullName,householdName,basicInfo,schoolInfo,medicalInfo,insuranceInfo,emergencyInfo");

    if (error) {
      return json({ error: error.message }, { status: 500 });
    }

    const fields = (data ?? []).flatMap((member) => {
      const groups = [
        member.basicInfo,
        member.schoolInfo,
        member.medicalInfo,
        member.insuranceInfo,
        member.emergencyInfo,
      ];

      return groups.flatMap((group) =>
        Object.entries(group ?? {})
          .filter(([, value]) => `${value ?? ""}`.trim())
          .map(([key, value]) => ({
            key,
            label: key.replace(/([A-Z])/g, " $1").trim(),
            memberId: member.id,
            memberName: member.fullName,
            value,
          })),
      );
    });

    return json({ fields });
  }

  if (request.method === "GET" && path === "/templates") {
    const { data, error } = await supabase
      .schema("myformsvault")
      .from("FormTemplate")
      .select("id,name,slug,category,overview,description,sections")
      .order("name");

    if (error) {
      return json({ error: error.message }, { status: 500 });
    }

    return json({ templates: data ?? [] });
  }

  const fillMatch = path.match(/^\/templates\/([^/]+)\/fill$/);

  if (request.method === "POST" && fillMatch) {
    const templateId = decodeURIComponent(fillMatch[1]);
    const body = await request.json().catch(() => ({}));
    const { data: template, error } = await supabase
      .schema("myformsvault")
      .from("FormTemplate")
      .select("id,name,slug,sections")
      .or(`id.eq.${templateId},slug.eq.${templateId}`)
      .maybeSingle();

    if (error || !template) {
      return json({ error: error?.message ?? "Template not found." }, { status: 404 });
    }

    return json({
      filled: body?.values ?? {},
      template,
    });
  }

  return json({ error: "Route not found." }, { status: 404 });
});
