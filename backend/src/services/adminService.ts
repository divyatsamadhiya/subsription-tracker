import { Prisma } from "../generated/prisma/client.js";
import {
  adminActionReasonSchema,
  adminOverviewAnalyticsSchema,
  adminSessionSchema,
  adminUserDetailSchema,
  adminUserListResponseSchema,
  adminUsersQuerySchema,
  authUserSchema
} from "../domain/schemas.js";
import {
  CATEGORY_OPTIONS,
  type AdminOverviewAnalytics,
  type AdminSession,
  type AdminUserDetail,
  type AdminUserListResponse,
  type CurrencySpend,
  type UserRole
} from "../domain/types.js";
import { prisma } from "../prisma.js";
import { HttpError } from "../utils/http.js";
import { toAuthUser } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

const msPerDay = 24 * 60 * 60 * 1000;

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const toMonthlyAmountMinor = (subscription: {
  amountMinor: number;
  billingCycle: "weekly" | "monthly" | "yearly" | "custom_days";
  customIntervalDays: number | null;
}): number => {
  switch (subscription.billingCycle) {
    case "weekly":
      return Math.round((subscription.amountMinor * 52) / 12);
    case "monthly":
      return subscription.amountMinor;
    case "yearly":
      return Math.round(subscription.amountMinor / 12);
    case "custom_days":
      if (!subscription.customIntervalDays || subscription.customIntervalDays < 1) {
        return 0;
      }
      return Math.round((subscription.amountMinor * 30.4375) / subscription.customIntervalDays);
    default:
      return 0;
  }
};

const aggregateMonthlySpendByCurrency = (
  subscriptions: Array<{
    currency: string;
    amountMinor: number;
    billingCycle: "weekly" | "monthly" | "yearly" | "custom_days";
    customIntervalDays: number | null;
  }>
): CurrencySpend[] => {
  const spend = new Map<string, number>();

  for (const subscription of subscriptions) {
    const monthlyAmount = toMonthlyAmountMinor(subscription);
    const currency = subscription.currency.toUpperCase();
    spend.set(currency, (spend.get(currency) ?? 0) + monthlyAmount);
  }

  return [...spend.entries()]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((first, second) => first.currency.localeCompare(second.currency));
};

const isUserDeleted = (deletedAt: Date | null): boolean => deletedAt instanceof Date;

const buildUserWhere = (status: "active" | "deleted" | "all", search?: string): Prisma.UserWhereInput => {
  const where: Prisma.UserWhereInput = {};

  if (status === "active") {
    where.deletedAt = null;
  } else if (status === "deleted") {
    where.deletedAt = { not: null };
  }

  if (search && search.length > 0) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } }
    ];
  }

  return where;
};

const createAudit = async (params: {
  adminUserId: string;
  targetUserId?: string;
  action:
    | "user_soft_deleted"
    | "user_restored"
    | "user_force_logged_out"
    | "user_role_granted"
    | "user_role_revoked";
  metadata?: Prisma.InputJsonValue;
}): Promise<void> => {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      targetUserId: params.targetUserId,
      action: params.action,
      metadata: params.metadata
    }
  });
};

export const getAdminSession = async (adminUserId: string): Promise<AdminSession> => {
  const user = await prisma.user.findUnique({ where: { id: adminUserId } });
  if (!user || user.deletedAt) {
    throw new HttpError(401, "User account no longer exists");
  }

  return adminSessionSchema.parse({ user: authUserSchema.parse(toAuthUser(user)) });
};

export const listAdminUsers = async (input: unknown): Promise<AdminUserListResponse> => {
  const query = adminUsersQuerySchema.parse(input);
  const status = query.status ?? "active";
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where = buildUserWhere(status, query.search);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        country: true,
        createdAt: true,
        deletedAt: true,
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    })
  ]);

  const userIds = users.map((user) => user.id);
  const activeCountsRaw = userIds.length
    ? await prisma.subscription.groupBy({
        by: ["userId"],
        where: {
          userId: { in: userIds },
          isActive: true
        },
        _count: { _all: true }
      })
    : [];

  const activeCountByUserId = new Map(
    activeCountsRaw.map((row) => [row.userId, row._count._all])
  );

  const response = {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: isUserDeleted(user.deletedAt) ? "deleted" : "active",
      fullName: user.fullName ?? undefined,
      country: user.country ?? undefined,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString(),
      subscriptionCount: user._count.subscriptions,
      activeSubscriptionCount: activeCountByUserId.get(user.id) ?? 0
    })),
    total,
    page,
    pageSize
  };

  logger.info("Admin users listed", { total, page, pageSize, status });
  return adminUserListResponseSchema.parse(response);
};

export const getAdminUserDetail = async (targetUserId: string): Promise<AdminUserDetail> => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      country: true,
      timeZone: true,
      phone: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      deletedByAdminId: true,
      deleteReason: true,
      subscriptions: {
        select: {
          currency: true,
          amountMinor: true,
          billingCycle: true,
          customIntervalDays: true,
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const activeSubscriptions = user.subscriptions.filter((subscription) => subscription.isActive);

  const response = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: isUserDeleted(user.deletedAt) ? "deleted" : "active",
    profile: {
      fullName: user.fullName ?? undefined,
      country: user.country ?? undefined,
      timeZone: user.timeZone ?? undefined,
      phone: user.phone ?? undefined,
      bio: user.bio ?? undefined
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString(),
    deletedByAdminId: user.deletedByAdminId ?? undefined,
    deleteReason: user.deleteReason ?? undefined,
    subscriptionSummary: {
      totalSubscriptions: user.subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      monthlySpendByCurrency: aggregateMonthlySpendByCurrency(activeSubscriptions)
    }
  };

  return adminUserDetailSchema.parse(response);
};

export const softDeleteUserByAdmin = async (
  adminUserId: string,
  targetUserId: string,
  input: unknown
): Promise<void> => {
  const payload = adminActionReasonSchema.parse(input);

  if (adminUserId === targetUserId) {
    throw new HttpError(400, "Admin cannot delete their own account");
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, deletedAt: true }
    });

    if (!target) {
      throw new HttpError(404, "User not found");
    }

    if (target.deletedAt) {
      throw new HttpError(400, "User account is already deleted");
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        deletedAt: new Date(),
        deletedByAdminId: adminUserId,
        deleteReason: payload.reason,
        sessionVersion: { increment: 1 },
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: "user_soft_deleted",
        metadata: {
          reason: payload.reason
        }
      }
    });
  });

  logger.info("Admin soft-deleted user", { adminUserId, targetUserId });
};

export const restoreUserByAdmin = async (
  adminUserId: string,
  targetUserId: string,
  input: unknown
): Promise<void> => {
  const payload = adminActionReasonSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, deletedAt: true }
    });

    if (!target) {
      throw new HttpError(404, "User not found");
    }

    if (!target.deletedAt) {
      throw new HttpError(400, "User account is not deleted");
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        deletedAt: null,
        deletedByAdminId: null,
        deleteReason: null,
        sessionVersion: { increment: 1 }
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: "user_restored",
        metadata: {
          reason: payload.reason
        }
      }
    });
  });

  logger.info("Admin restored user", { adminUserId, targetUserId });
};

export const forceLogoutUserByAdmin = async (
  adminUserId: string,
  targetUserId: string,
  input: unknown
): Promise<void> => {
  const payload = adminActionReasonSchema.parse(input);

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true }
  });

  if (!target) {
    throw new HttpError(404, "User not found");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        sessionVersion: { increment: 1 }
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: "user_force_logged_out",
        metadata: {
          reason: payload.reason
        }
      }
    })
  ]);

  logger.info("Admin forced user logout", { adminUserId, targetUserId });
};

const buildDefaultCategoryTotals = (): Record<(typeof CATEGORY_OPTIONS)[number], number> => ({
  entertainment: 0,
  productivity: 0,
  utilities: 0,
  health: 0,
  other: 0
});

export const getAdminOverviewAnalytics = async (): Promise<AdminOverviewAnalytics> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 29 * msPerDay);

  const [activeUsers, deletedUsers, newLast30Days, signupRows, activeSubscriptions] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true }
    }),
    prisma.subscription.findMany({
      where: {
        isActive: true,
        user: {
          deletedAt: null
        }
      },
      select: {
        category: true,
        currency: true,
        amountMinor: true,
        billingCycle: true,
        customIntervalDays: true
      }
    })
  ]);

  const signupCounts = new Map<string, number>();
  for (const row of signupRows) {
    const dateKey = toIsoDate(row.createdAt);
    signupCounts.set(dateKey, (signupCounts.get(dateKey) ?? 0) + 1);
  }

  const signupTrend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(windowStart.getTime() + index * msPerDay);
    const key = toIsoDate(date);
    return {
      date: key,
      count: signupCounts.get(key) ?? 0
    };
  });

  const totalByCategory = buildDefaultCategoryTotals();
  for (const subscription of activeSubscriptions) {
    totalByCategory[subscription.category] += 1;
  }

  const analytics = {
    users: {
      active: activeUsers,
      deleted: deletedUsers,
      newLast30Days
    },
    subscriptions: {
      activeTotal: activeSubscriptions.length,
      totalByCategory
    },
    monthlySpendByCurrency: aggregateMonthlySpendByCurrency(activeSubscriptions),
    signupTrend
  };

  return adminOverviewAnalyticsSchema.parse(analytics);
};

export const setUserRoleByEmail = async (
  actorAdminUserId: string,
  email: string,
  role: UserRole
): Promise<{ id: string; email: string; role: UserRole }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.role === role) {
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: { id: true, email: true, role: true }
  });

  await createAudit({
    adminUserId: actorAdminUserId,
    targetUserId: updated.id,
    action: role === "admin" ? "user_role_granted" : "user_role_revoked",
    metadata: {
      fromRole: user.role,
      toRole: role
    }
  });

  logger.info("User role changed", {
    actorAdminUserId,
    targetUserId: updated.id,
    role
  });

  return updated;
};

export const purgeDeletedUsersOlderThan = async (retentionDays = 30): Promise<number> => {
  const cutoff = new Date(Date.now() - retentionDays * msPerDay);
  const result = await prisma.user.deleteMany({
    where: {
      deletedAt: {
        lte: cutoff
      }
    }
  });

  logger.info("Deleted users purged", { retentionDays, purged: result.count });
  return result.count;
};
