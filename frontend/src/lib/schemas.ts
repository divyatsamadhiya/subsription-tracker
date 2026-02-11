import { z } from "zod";
import {
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  type AppSettings,
  type AuthUser,
  type BackupFileV1,
  type Subscription,
  type SubscriptionInput
} from "../types";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const authResponseSchema = z.object({
  user: authUserSchema
});

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
});

export const appSettingsSchema = z.object({
  defaultCurrency: z.string().length(3),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  notificationsEnabled: z.boolean()
}) satisfies z.ZodType<AppSettings>;

export const updateSettingsSchema = appSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one settings field is required" }
);

export const backupFileSchema: z.ZodType<BackupFileV1> = z.object({
  version: z.literal("1.0"),
  exportedAt: z.string().datetime(),
  settings: appSettingsSchema,
  subscriptions: z.array(subscriptionSchema)
});

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
