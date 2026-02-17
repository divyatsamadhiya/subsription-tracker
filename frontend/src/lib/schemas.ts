import { z } from "zod";
import {
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  type AppSettings,
  type AuthUser,
  type BackupFileV1,
  type ForgotPasswordResponse,
  type Subscription,
  type SubscriptionInput,
  type UserProfile,
  type UserProfilePatch
} from "../types";

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

export const userProfileSchema: z.ZodType<UserProfile> = z.object({
  fullName: fullNameSchema.optional(),
  country: countrySchema.optional(),
  timeZone: timeZoneSchema.optional(),
  phone: phoneSchema.optional(),
  bio: bioSchema.optional()
}).strict();

export const userProfilePatchSchema: z.ZodType<UserProfilePatch> = z
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
  });

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  profile: userProfileSchema,
  profileComplete: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

export const authResponseSchema = z.object({
  user: authUserSchema
}).strict();

export const forgotPasswordResponseSchema: z.ZodType<ForgotPasswordResponse> = z.object({
  message: z.string().min(1)
}).strict();

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
        message: "Custom interval must be a positive integer",
        path: ["customIntervalDays"]
      });
    }
  }) satisfies z.ZodType<SubscriptionInput>;

export const subscriptionSchema: z.ZodType<Subscription> = z.object({
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
}).strict();

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

export const backupFileSchema: z.ZodType<BackupFileV1> = z.object({
  version: z.literal("1.0"),
  exportedAt: z.string().datetime(),
  settings: appSettingsSchema,
  subscriptions: z.array(subscriptionSchema)
}).strict();

export const profileResponseSchema = z.object({
  profile: userProfileSchema,
  profileComplete: z.boolean()
}).strict();

export const registerPayloadSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: fullNameSchema,
  country: countrySchema,
  timeZone: timeZoneSchema.optional()
}).strict();

const formBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: z.string().trim().min(1, "Amount is required"),
  billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
  customIntervalDays: z.string().trim().optional(),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  category: z.enum(CATEGORY_OPTIONS),
  reminderDaysBefore: z.array(z.number().int().nonnegative()),
  isActive: z.boolean(),
  notes: z.string().max(2000).optional()
});

export type SubscriptionFormInput = z.infer<typeof formBaseSchema>;

export const parseSubscriptionForm = (input: SubscriptionFormInput) => {
  const parsed = formBaseSchema
    .superRefine((value, context) => {
      const amount = Number(value.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be greater than 0",
          path: ["amount"]
        });
      }

      if (value.billingCycle === "custom_days") {
        const interval = Number(value.customIntervalDays);
        if (!Number.isInteger(interval) || interval <= 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Custom interval must be a positive integer",
            path: ["customIntervalDays"]
          });
        }
      }
    })
    .safeParse(input);

  if (!parsed.success) {
    return parsed;
  }

  const amountMajor = Number(parsed.data.amount);
  return {
    success: true as const,
    data: {
      ...parsed.data,
      amountMinor: Math.round(amountMajor * 100),
      customIntervalDays:
        parsed.data.billingCycle === "custom_days"
          ? Number(parsed.data.customIntervalDays)
          : undefined
    }
  };
};
