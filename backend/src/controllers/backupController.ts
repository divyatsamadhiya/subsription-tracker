import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import { exportBackupForUser, importBackupForUser } from "../services/backupService.js";

export const backupController = {
  export: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const backup = await exportBackupForUser(userId);
    res.status(200).json(backup);
  },

  import: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    await importBackupForUser(userId, req.body);
    res.status(204).send();
  }
};
