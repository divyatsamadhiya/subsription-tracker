import { z } from "zod";
import {
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  type AppSettings,
  type AuthResponse,
  type AuthUser,
  type BackupFileV1,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
  type LoginInput,
  type ProfileResponse,
  type RegisterInput,
  type ResetPasswordInput,
  type Subscription,
  type SubscriptionInput,
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
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Invalid phone format");
const bioSchema = z.string().trim().max(280);

export const userProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  country: countrySchema.optional(),
  timeZone: timeZoneSchema.optional(),
  phone: phoneSchema.optional(),
  bio: bioSchema.optional()
}).strict() satisfies z.ZodType<UserProfile>;

export const userProfilePatchSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    country: countrySchema.optional(),
    timeZone: z.union([timeZoneSchema, z.null()]).optional(),
    phone: z.union([phoneSchema, z.null()]).optional(),
    bio: z.union([bioSchema, z.null()]).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required"
  }) satisfies z.ZodType<UserProfilePatch>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  profile: userProfileSchema,
  profileComplete: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict() satisfies z.ZodType<AuthUser>;

export const authResponseSchema = z.object({
  user: authUserSchema
}).strict() satisfies z.ZodType<AuthResponse>;

export const registerInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: fullNameSchema,
  country: countrySchema,
  timeZone: timeZoneSchema.optional()
}).strict() satisfies z.ZodType<RegisterInput>;

export const loginInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128)
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
  newPassword: z.string().min(8).max(128)
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
