import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getOptionalSupabaseEnv } from "./shared";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const config = getOptionalSupabaseEnv();

  if (!config) {
    return response;
  }

  const { supabaseUrl, supabasePublishableKey } = config;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
