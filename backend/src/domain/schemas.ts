import { z } from "zod";
import {
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  type AppSettings,
  type AuthResponse,
  type AuthUser,
  type BackupFileV1,
  type LoginInput,
  type RegisterInput,
  type Subscription,
  type SubscriptionInput
} from "./types.js";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}) satisfies z.ZodType<AuthUser>;

export const authResponseSchema = z.object({
  user: authUserSchema
}) satisfies z.ZodType<AuthResponse>;

export const registerInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128)
}) satisfies z.ZodType<RegisterInput>;

export const loginInputSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128)
}) satisfies z.ZodType<LoginInput>;

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
}) satisfies z.ZodType<Subscription>;

export const appSettingsSchema = z.object({
  defaultCurrency: z.string().length(3),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  notificationsEnabled: z.boolean()
}) satisfies z.ZodType<AppSettings>;

export const updateSettingsSchema = appSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one settings field is required" }
);

export const backupFileSchema = z.object({
  version: z.literal("1.0"),
  exportedAt: z.string().datetime(),
  settings: appSettingsSchema,
  subscriptions: z.array(subscriptionSchema)
}) satisfies z.ZodType<BackupFileV1>;
