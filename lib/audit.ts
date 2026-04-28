import { headers } from "next/headers";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentUserContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export type AuditLogFilters = {
  action?: string;
  from?: string;
  to?: string;
};

function isMissingTable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export async function getRequestAuditMetadata() {
  const headerList = await headers();

  return {
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    userAgent: headerList.get("user-agent") ?? null,
  };
}

export async function logAuditEvent(input: {
  action: string;
  metadata?: Record<string, unknown>;
  targetId?: string | null;
  targetType: string;
  userId?: string | null;
}) {
  try {
    const [requestMetadata, currentUser] = await Promise.all([
      getRequestAuditMetadata(),
      input.userId === undefined ? getCurrentUserContext() : Promise.resolve(null),
    ]);

    await prisma.auditLog.create({
      data: {
        action: input.action,
        ip: requestMetadata.ip,
        metadata: JSON.parse(JSON.stringify(input.metadata ?? {})) as Prisma.InputJsonValue,
        targetId: input.targetId ?? null,
        targetType: input.targetType,
        userAgent: requestMetadata.userAgent,
        userId: input.userId === undefined ? currentUser?.userId ?? null : input.userId,
      },
    });
  } catch (error) {
    if (!isMissingTable(error)) {
      console.error("Unable to write audit log", error);
    }
  }
}

export async function getCurrentUserAuditLog(filters: AuditLogFilters = {}) {
  const user = await getCurrentUserContext();

  try {
    return await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      where: {
        action: filters.action || undefined,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
        userId: user.userId ?? null,
      },
    });
  } catch (error) {
    if (!isMissingTable(error)) {
      console.error("Unable to load audit log", error);
    }
    return [];
  }
}

export async function getAdminAuditLog(filters: AuditLogFilters = {}) {
  try {
    return await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      where: {
        action: filters.action || undefined,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
    });
  } catch (error) {
    if (!isMissingTable(error)) {
      console.error("Unable to load admin audit log", error);
    }
    return [];
  }
}
