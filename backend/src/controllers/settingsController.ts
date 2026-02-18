import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import { getSettingsForUser, updateSettingsForUser } from "../services/settingsService.js";
import { handleControllerError } from "../utils/controllerError.js";

export const settingsController = {
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const settings = await getSettingsForUser(userId);
      res.status(200).json({ settings });
    } catch (error) {
      handleControllerError(res, error, { scope: "Settings", action: "get" });
    }
  },

  patch: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const settings = await updateSettingsForUser(userId, req.body);
      res.status(200).json({ settings });
    } catch (error) {
      handleControllerError(res, error, { scope: "Settings", action: "patch" });
    }
  }
};
