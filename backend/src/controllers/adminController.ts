import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import {
  forceLogoutUserByAdmin,
  getAdminOverviewAnalytics,
  getAdminSession,
  getAdminUserDetail,
  listAdminUsers,
  restoreUserByAdmin,
  softDeleteUserByAdmin
} from "../services/adminService.js";
import { handleControllerError } from "../utils/controllerError.js";

export const adminController = {
  session: async (req: Request, res: Response): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      const session = await getAdminSession(adminUserId);
      res.status(200).json(session);
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "session" });
    }
  },

  listUsers: async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await listAdminUsers(req.query);
      res.status(200).json(users);
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "listUsers" });
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const detail = await getAdminUserDetail(req.params.userId);
      res.status(200).json({ user: detail });
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "getUser" });
    }
  },

  deleteUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      await softDeleteUserByAdmin(adminUserId, req.params.userId, req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "deleteUser" });
    }
  },

  restoreUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      await restoreUserByAdmin(adminUserId, req.params.userId, req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "restoreUser" });
    }
  },

  forceLogoutUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const adminUserId = getAuthUserId(req);
      await forceLogoutUserByAdmin(adminUserId, req.params.userId, req.body);
      res.status(200).json({ ok: true });
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "forceLogoutUser" });
    }
  },

  analyticsOverview: async (_req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await getAdminOverviewAnalytics();
      res.status(200).json({ analytics });
    } catch (error) {
      handleControllerError(res, error, { scope: "Admin", action: "analyticsOverview" });
    }
  }
};
