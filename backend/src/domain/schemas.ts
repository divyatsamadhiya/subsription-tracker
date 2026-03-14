import { z } from "zod";
import {
  type AdminOverviewAnalytics,
  type AdminSession,
  type AdminUserDetail,
  type AdminUserListResponse,
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  type AppSettings,
  type AuthResponse,
  type AuthUser,
  type BackupFileV1,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
  type LoginInput,
  type PriceHistoryEntry,
  type ProfileResponse,
  type RegisterInput,
  type ResetPasswordInput,
  type Subscription,
  type SubscriptionInput,
  type UserRole,
  type UserProfile,
  type UserProfilePatch
} from "./types.js";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const isValidTimeZone = (value: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const fullNameSchema = z.string().trim().min(2).max(80);
const countrySchema = z.string().trim().min(2).max(80);
const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isValidTimeZone(value), { message: "Invalid timezone" });
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one digit");

const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Invalid phone format");
const bioSchema = z.string().trim().max(280);
const avatarUrlSchema = z.string().trim().max(200_000).refine(
  (v) => v.startsWith("data:image/") || v.startsWith("https://"),
  { message: "Avatar must be a data URI or HTTPS URL" }
);

export const userProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  country: countrySchema.optional(),
  timeZone: timeZoneSchema.optional(),
  phone: phoneSchema.optional(),
  bio: bioSchema.optional(),
  avatarUrl: avatarUrlSchema.optional()
}).strict() satisfies z.ZodType<UserProfile>;

export const userProfilePatchSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    country: countrySchema.optional(),
    timeZone: z.union([timeZoneSchema, z.null()]).optional(),
    phone: z.union([phoneSchema, z.null()]).optional(),
    bio: z.union([bioSchema, z.null()]).optional(),
    avatarUrl: z.union([avatarUrlSchema, z.null()]).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required"
  }) satisfies z.ZodType<UserProfilePatch>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["user", "admin"]),
  profile: userProfileSchema,
  profileComplete: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict() satisfies z.ZodType<AuthUser>;

export const userRoleSchema = z.enum(["user", "admin"]) satisfies z.ZodType<UserRole>;

export const authResponseSchema = z.object({
  user: authUserSchema
}).strict() satisfies z.ZodType<AuthResponse>;

export const registerInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: passwordSchema,
  fullName: fullNameSchema,
  country: countrySchema,
  timeZone: timeZoneSchema.optional()
}).strict() satisfies z.ZodType<RegisterInput>;

export const loginInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128)
}).strict() satisfies z.ZodType<LoginInput>;

export const forgotPasswordInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase())
}).strict() satisfies z.ZodType<ForgotPasswordInput>;

export const forgotPasswordResponseSchema = z.object({
  message: z.string().min(1)
}).strict() satisfies z.ZodType<ForgotPasswordResponse>;

export const resetPasswordInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  resetToken: z.string().min(1),
  newPassword: passwordSchema
}).strict() satisfies z.ZodType<ResetPasswordInput>;

export const subscriptionInputSchema = z
  .object({
    name: z.string().trim().min(1),
    amountMinor: z.number().int().positive(),
    billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
    customIntervalDays: z.number().int().positive().optional(),
    nextBillingDate: isoDateSchema,
    category: z.enum(CATEGORY_OPTIONS),
    reminderDaysBefore: z.array(z.number().int().nonnegative()),
    isActive: z.boolean(),
    notes: z.string().max(2000).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.billingCycle === "custom_days" && !value.customIntervalDays) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customIntervalDays is required for custom_days billing",
        path: ["customIntervalDays"]
      });
    }
  }) satisfies z.ZodType<SubscriptionInput>;

export const priceHistoryEntrySchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
  customIntervalDays: z.number().int().positive().optional(),
  effectiveDate: isoDateSchema,
}).strict() satisfies z.ZodType<PriceHistoryEntry>;

export const subscriptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
  customIntervalDays: z.number().int().positive().optional(),
  nextBillingDate: isoDateSchema,
  category: z.enum(CATEGORY_OPTIONS),
  reminderDaysBefore: z.array(z.number().int().nonnegative()),
  isActive: z.boolean(),
  notes: z.string().max(2000).optional(),
  priceHistory: z.array(priceHistoryEntrySchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict() satisfies z.ZodType<Subscription>;

export const appSettingsSchema = z.object({
  defaultCurrency: z.string().length(3),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  notificationsEnabled: z.boolean(),
  themePreference: z.enum(["system", "light", "dark"])
}).strict() satisfies z.ZodType<AppSettings>;

export const updateSettingsSchema = z
  .object({
    defaultCurrency: z.string().length(3).optional(),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
    notificationsEnabled: z.boolean().optional(),
    themePreference: z.enum(["system", "light", "dark"]).optional()
  })
  .strict()
  .refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one settings field is required" }
);

export const backupFileSchema = z.object({
  version: z.literal("1.0"),
  exportedAt: z.string().datetime(),
  settings: appSettingsSchema,
  subscriptions: z.array(subscriptionSchema)
}).strict() satisfies z.ZodType<BackupFileV1>;

export const profileResponseSchema = z.object({
  profile: userProfileSchema,
  profileComplete: z.boolean()
}).strict() satisfies z.ZodType<ProfileResponse>;

export const adminActionReasonSchema = z
  .object({
    reason: z.string().trim().min(3).max(300)
  })
  .strict();

export const adminUsersQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(["active", "deleted", "all"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional()
  })
  .strict();

export const adminSessionSchema = z
  .object({
    user: authUserSchema
  })
  .strict() satisfies z.ZodType<AdminSession>;

const currencySpendSchema = z
  .object({
    currency: z.string().length(3),
    amountMinor: z.number().int()
  })
  .strict();

export const adminUserListResponseSchema = z
  .object({
    users: z.array(
      z
        .object({
          id: z.string().min(1),
          email: z.string().email(),
          role: userRoleSchema,
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
  .strict() satisfies z.ZodType<AdminUserListResponse>;

export const adminUserDetailSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    role: userRoleSchema,
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
        monthlySpendByCurrency: z.array(currencySpendSchema)
      })
      .strict()
  })
  .strict() satisfies z.ZodType<AdminUserDetail>;

export const adminOverviewAnalyticsSchema = z
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
        totalByCategory: z.object({
          entertainment: z.number().int().nonnegative(),
          productivity: z.number().int().nonnegative(),
          utilities: z.number().int().nonnegative(),
          health: z.number().int().nonnegative(),
          other: z.number().int().nonnegative()
        })
      })
      .strict(),
    monthlySpendByCurrency: z.array(currencySpendSchema),
    signupTrend: z.array(
      z
        .object({
          date: isoDateSchema,
          count: z.number().int().nonnegative()
        })
        .strict()
    )
  })
  .strict() satisfies z.ZodType<AdminOverviewAnalytics>;
