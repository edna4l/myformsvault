import { isCurrentUserAdmin } from "@/lib/auth-context";
import { getAdminAuditLog, type AuditLogFilters } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function getAdminDashboardData(filters: AuditLogFilters & { subscriptionStatus?: string }) {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return {
      isAdmin,
      stats: null,
    };
  }

  const [
    totalUsers,
    totalTemplates,
    proSubscribers,
    recentSignups,
    subscriptions,
    activeSubscriptions,
    auditLogs,
  ] = await Promise.all([
    prisma.profile.count().catch(() => 0),
    prisma.formTemplate.count().catch(() => 0),
    prisma.subscription.count({
      where: {
        status: {
          in: ["active", "trialing"],
        },
      },
    }).catch(() => 0),
    prisma.profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }).catch(() => []),
    prisma.subscription.findMany({
      include: {
        profile: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
      where: {
        status: filters.subscriptionStatus || undefined,
      },
    }).catch(() => []),
    prisma.subscription.findMany({
      where: {
        status: {
          in: ["active", "trialing"],
        },
      },
    }).catch(() => []),
    getAdminAuditLog(filters),
  ]);

  const mrrCents = activeSubscriptions.reduce((total, subscription) => {
    if (subscription.interval === "year") {
      return total + Math.round(subscription.amountCents / 12);
    }

    return total + subscription.amountCents;
  }, 0);

  return {
    isAdmin,
    stats: {
      auditLogs,
      mrrCents,
      proSubscribers,
      recentSignups,
      subscriptions,
      totalTemplates,
      totalUsers,
    },
  };
}
