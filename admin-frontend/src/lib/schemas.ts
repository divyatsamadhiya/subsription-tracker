import { z } from "zod";
import type {
  AdminOverviewAnalytics,
  AdminSession,
  AdminUserDetail,
  AdminUserListResponse,
  AuthUser,
  UserProfile
} from "../types";

const userProfileSchema: z.ZodType<UserProfile> = z
  .object({
    fullName: z.string().optional(),
    country: z.string().optional(),
    timeZone: z.string().optional(),
    phone: z.string().optional(),
    bio: z.string().optional()
  })
  .strict();

const authUserSchema: z.ZodType<AuthUser> = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["user", "admin"]),
    profile: userProfileSchema,
    profileComplete: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export const authResponseSchema = z
  .object({
    user: authUserSchema
  })
  .strict();

export const adminSessionSchema: z.ZodType<AdminSession> = z
  .object({
    user: authUserSchema
  })
  .strict();

export const adminUserListSchema: z.ZodType<AdminUserListResponse> = z
  .object({
    users: z.array(
      z
        .object({
          id: z.string().min(1),
          email: z.string().email(),
          role: z.enum(["user", "admin"]),
          status: z.enum(["active", "deleted"]),
          fullName: z.string().optional(),
          country: z.string().optional(),
          createdAt: z.string().datetime(),
          deletedAt: z.string().datetime().optional(),
          subscriptionCount: z.number().int().nonnegative(),
          activeSubscriptionCount: z.number().int().nonnegative()
        })
        .strict()
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive()
  })
  .strict();

export const adminUserDetailSchema: z.ZodType<AdminUserDetail> = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["user", "admin"]),
    status: z.enum(["active", "deleted"]),
    profile: userProfileSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().optional(),
    deletedByAdminId: z.string().optional(),
    deleteReason: z.string().optional(),
    subscriptionSummary: z
      .object({
        totalSubscriptions: z.number().int().nonnegative(),
        activeSubscriptions: z.number().int().nonnegative(),
        monthlySpendByCurrency: z.array(
          z
            .object({
              currency: z.string().length(3),
              amountMinor: z.number().int()
            })
            .strict()
        )
      })
      .strict()
  })
  .strict();

export const adminAnalyticsSchema: z.ZodType<AdminOverviewAnalytics> = z
  .object({
    users: z
      .object({
        active: z.number().int().nonnegative(),
        deleted: z.number().int().nonnegative(),
        newLast30Days: z.number().int().nonnegative()
      })
      .strict(),
    subscriptions: z
      .object({
        activeTotal: z.number().int().nonnegative(),
        totalByCategory: z
          .object({
            entertainment: z.number().int().nonnegative(),
            productivity: z.number().int().nonnegative(),
            utilities: z.number().int().nonnegative(),
            health: z.number().int().nonnegative(),
            other: z.number().int().nonnegative()
          })
          .strict()
      })
      .strict(),
    monthlySpendByCurrency: z.array(
      z
        .object({
          currency: z.string().length(3),
          amountMinor: z.number().int()
        })
        .strict()
    ),
    signupTrend: z.array(
      z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          count: z.number().int().nonnegative()
        })
        .strict()
    )
  })
  .strict();
