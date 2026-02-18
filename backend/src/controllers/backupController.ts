import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import { exportBackupForUser, importBackupForUser } from "../services/backupService.js";
import { handleControllerError } from "../utils/controllerError.js";

export const backupController = {
  export: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const backup = await exportBackupForUser(userId);
      res.status(200).json(backup);
    } catch (error) {
      handleControllerError(res, error, { scope: "Backup", action: "export" });
    }
  },

  import: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      await importBackupForUser(userId, req.body);
      res.status(204).send();
    } catch (error) {
      handleControllerError(res, error, { scope: "Backup", action: "import" });
    }
  }
};
