import { createHash, randomBytes } from "crypto";

import { getCurrentUserContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKeyForCurrentUser(name: string) {
  const user = await getCurrentUserContext();

  if (!user.userId) {
    throw new Error("Sign in before creating an API key.");
  }

  const rawKey = `mfv_${randomBytes(32).toString("base64url")}`;
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash: hashApiKey(rawKey),
      keyPrefix,
      name: name.trim() || "Default API key",
      userId: user.userId,
    },
  });

  return {
    apiKey,
    rawKey,
  };
}

export async function getCurrentUserApiKeys() {
  const user = await getCurrentUserContext();

  if (!user.userId) {
    return [];
  }

  try {
    return prisma.apiKey.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        userId: user.userId,
      },
    });
  } catch (error) {
    console.error("Unable to load API keys", error);
    return [];
  }
}
