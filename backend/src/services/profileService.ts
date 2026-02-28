import { profileResponseSchema, userProfilePatchSchema } from "../domain/schemas.js";
import type { ProfileResponse } from "../domain/types.js";
import type { User } from "../generated/prisma/client.js";
import { logger } from "../logger/logger.js";
import { prisma } from "../prisma.js";
import { HttpError } from "../utils/http.js";
import { isProfileComplete, toUserProfile } from "../utils/serializers.js";

const toProfileResponse = (user: User | null): ProfileResponse => {
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const profileResponse = toProfileResponse(user);
  logger.info("Profile fetched", { userId, profileComplete: profileResponse.profileComplete });
  return profileResponse;
};

export const updateProfileForUser = async (
  userId: string,
  patchInput: unknown
): Promise<ProfileResponse> => {
  const patch = userProfilePatchSchema.parse(patchInput);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    logger.warn("Profile update failed: user account no longer exists", { userId });
    throw new HttpError(401, "User account no longer exists");
  }

  const data: Record<string, unknown> = {};
  if (patch.fullName !== undefined) data.fullName = patch.fullName;
  if (patch.country !== undefined) data.country = patch.country;
  if (patch.timeZone !== undefined) data.timeZone = patch.timeZone;
  if ("phone" in patch) data.phone = patch.phone;
  if ("bio" in patch) data.bio = patch.bio;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data
  });

  const profileResponse = toProfileResponse(updatedUser);
  logger.info("Profile updated", { userId, profileComplete: profileResponse.profileComplete });
  return profileResponse;
};
