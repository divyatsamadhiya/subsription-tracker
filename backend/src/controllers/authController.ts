import type { Request, Response } from "express";
import { authCookieName, authCookieOptions, clearAuthCookieOptions } from "../utils/auth.js";
import { getAuthUserId } from "../middleware/auth.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  toAuthResponse
} from "../services/authService.js";
import { logger } from "../logger/logger.js";

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const result = await registerUser(req.body);
    res.cookie(authCookieName, result.token, authCookieOptions);
    res.status(201).json(toAuthResponse(result.user));
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const result = await loginUser(req.body);
    res.cookie(authCookieName, result.token, authCookieOptions);
    res.status(200).json(toAuthResponse(result.user));
  },

  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    const result = await requestPasswordReset(req.body);
    res.status(200).json(result);
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    await resetPassword(req.body);
    res.status(204).send();
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    if (userId) {
      logger.info("Logout requested", { userId });
    }

    res.clearCookie(authCookieName, clearAuthCookieOptions);
    res.status(204).send();
  },

  me: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const user = await getCurrentUser(userId);
    res.status(200).json(toAuthResponse(user));
  }
};
