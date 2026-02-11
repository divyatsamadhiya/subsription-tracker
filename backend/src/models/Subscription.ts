import { Schema, model, type Types } from "mongoose";
import {
  BILLING_CYCLE_OPTIONS,
  CATEGORY_OPTIONS,
  DEFAULT_REMINDER_DAYS,
  type BillingCycle,
  type SubscriptionCategory
} from "../domain/types.js";

export interface SubscriptionDocument {
  userId: Types.ObjectId;
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  billingCycle: BillingCycle;
  customIntervalDays?: number;
  nextBillingDate: string;
  category: SubscriptionCategory;
  reminderDaysBefore: number[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    billingCycle: {
      type: String,
      required: true,
      enum: BILLING_CYCLE_OPTIONS
    },
    customIntervalDays: {
      type: Number,
      required: false,
      min: 1
    },
    nextBillingDate: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORY_OPTIONS
    },
    reminderDaysBefore: {
      type: [Number],
      required: true,
      default: DEFAULT_REMINDER_DAYS
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    notes: {
      type: String,
      required: false,
      maxlength: 2000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

subscriptionSchema.index({ userId: 1, id: 1 }, { unique: true });
subscriptionSchema.index({ userId: 1, nextBillingDate: 1 });

export const SubscriptionModel = model<SubscriptionDocument>("Subscription", subscriptionSchema);
