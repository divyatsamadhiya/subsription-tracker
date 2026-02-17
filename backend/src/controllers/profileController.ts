import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import { getProfileForUser, updateProfileForUser } from "../services/profileService.js";

export const profileController = {
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const profile = await getProfileForUser(userId);
    res.status(200).json(profile);
  },

  patch: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const profile = await updateProfileForUser(userId, req.body);
    res.status(200).json(profile);
  }
};
