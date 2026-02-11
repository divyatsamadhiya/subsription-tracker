import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import { getSettingsForUser, updateSettingsForUser } from "../services/settingsService.js";

export const settingsController = {
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const settings = await getSettingsForUser(userId);
    res.status(200).json({ settings });
  },

  patch: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const settings = await updateSettingsForUser(userId, req.body);
    res.status(200).json({ settings });
  }
};
