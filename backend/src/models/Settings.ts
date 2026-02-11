import { Schema, model, type Types } from "mongoose";

export interface SettingsDocument {
  userId: Types.ObjectId;
  defaultCurrency: string;
  weekStartsOn: 0 | 1;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    defaultCurrency: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    weekStartsOn: {
      type: Number,
      required: true,
      enum: [0, 1],
      default: 0
    },
    notificationsEnabled: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

settingsSchema.index({ userId: 1 }, { unique: true });

export const SettingsModel = model<SettingsDocument>("Settings", settingsSchema);
