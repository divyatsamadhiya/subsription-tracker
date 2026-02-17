import { Schema, model } from "mongoose";

export interface UserDocument {
  email: string;
  passwordHash: string;
  fullName?: string;
  country?: string;
  timeZone?: string;
  phone?: string;
  bio?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: false,
      trim: true
    },
    country: {
      type: String,
      required: false,
      trim: true
    },
    timeZone: {
      type: String,
      required: false,
      trim: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    bio: {
      type: String,
      required: false,
      trim: true
    },
    passwordResetTokenHash: {
      type: String,
      required: false
    },
    passwordResetExpiresAt: {
      type: Date,
      required: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const UserModel = model<UserDocument>("User", userSchema);
