import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getOptionalSupabaseEnv } from "@/utils/supabase/shared";

export type CurrentUserContext = {
  email: string | null;
  isAuthenticated: boolean;
  userId: string | null;
};

export function getConfiguredAdminEmails() {
  return new Set(
    `${process.env.ADMIN_EMAILS ?? ""}`
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  if (!getOptionalSupabaseEnv()) {
    return {
      email: null,
      isAuthenticated: false,
      userId: null,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      email: user?.email ?? null,
      isAuthenticated: Boolean(user),
      userId: user?.id ?? null,
    };
  } catch (error) {
    console.error("Unable to load Supabase user context", error);

    return {
      email: null,
      isAuthenticated: false,
      userId: null,
    };
  }
}

export async function ensureProfileForCurrentUser() {
  const user = await getCurrentUserContext();

  if (!user.userId || !user.email) {
    return {
      profile: null,
      user,
    };
  }

  const configuredAdmins = getConfiguredAdminEmails();
  const isConfiguredAdmin = configuredAdmins.has(user.email.toLowerCase());

  try {
    const profile = await prisma.profile.upsert({
      create: {
        email: user.email,
        isAdmin: isConfiguredAdmin,
        userId: user.userId,
      },
      update: {
        email: user.email,
        isAdmin: isConfiguredAdmin ? true : undefined,
      },
      where: {
        userId: user.userId,
      },
    });

    return {
      profile,
      user,
    };
  } catch (error) {
    console.error("Unable to sync profile from Supabase user", error);

    return {
      profile: null,
      user,
    };
  }
}

export async function isCurrentUserAdmin() {
  const { profile, user } = await ensureProfileForCurrentUser();
  const email = user.email?.toLowerCase() ?? "";

  if (!email) {
    return false;
  }

  if (profile?.isAdmin || getConfiguredAdminEmails().has(email)) {
    return true;
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: {
        email,
      },
    });

    return Boolean(admin?.isAdmin);
  } catch (error) {
    console.error("Unable to check admin table", error);
    return false;
  }
}
