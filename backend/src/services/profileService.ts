import { profileResponseSchema, userProfilePatchSchema } from "../domain/schemas.js";
import type { ProfileResponse } from "../domain/types.js";
import { logger } from "../logger/logger.js";
import type { UserDocument } from "../models/User.js";
import { UserModel } from "../models/User.js";
import { HttpError } from "../utils/http.js";
import { isProfileComplete, toUserProfile } from "../utils/serializers.js";

type PersistedUser = UserDocument & { _id: { toString(): string } };

const toProfileResponse = (user: PersistedUser | null): ProfileResponse => {
  if (!user) {
    throw new HttpError(401, "User account no longer exists");
  }

  const profile = toUserProfile(user);
  return profileResponseSchema.parse({
    profile,
    profileComplete: isProfileComplete(profile)
  });
};

export const getProfileForUser = async (userId: string): Promise<ProfileResponse> => {
  const user = (await UserModel.findById(userId)) as PersistedUser | null;
  const profileResponse = toProfileResponse(user);
  logger.info("Profile fetched", { userId, profileComplete: profileResponse.profileComplete });
  return profileResponse;
};

export const updateProfileForUser = async (
  userId: string,
  patchInput: unknown
): Promise<ProfileResponse> => {
  const patch = userProfilePatchSchema.parse(patchInput);
  const user = (await UserModel.findById(userId)) as (PersistedUser & { save: () => Promise<unknown> }) | null;

  if (!user) {
    logger.warn("Profile update failed: user account no longer exists", { userId });
    throw new HttpError(401, "User account no longer exists");
  }

  if (patch.fullName !== undefined) {
    user.fullName = patch.fullName;
  }

  if (patch.country !== undefined) {
    user.country = patch.country;
  }

  if (patch.timeZone !== undefined) {
    user.timeZone = patch.timeZone ?? undefined;
  }

  if ("phone" in patch) {
    user.phone = patch.phone ?? undefined;
  }

  if ("bio" in patch) {
    user.bio = patch.bio ?? undefined;
  }

  await user.save();

  const profileResponse = toProfileResponse(user);
  logger.info("Profile updated", { userId, profileComplete: profileResponse.profileComplete });
  return profileResponse;
};
