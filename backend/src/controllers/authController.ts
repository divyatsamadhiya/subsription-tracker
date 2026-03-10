import type { Request, Response } from "express";
import {
  authCookieName,
  authCookieOptions,
  clearAuthCookieOptions,
  clearGoogleOauthStateCookieOptions,
  createOauthState,
  googleOauthStateCookieName,
  googleOauthStateCookieOptions
} from "../utils/auth.js";
import { getAuthUserId } from "../middleware/auth.js";
import {
  createGoogleOauthAuthorizationUrl,
  getCurrentUser,
  getGoogleAuthFailureRedirectUrl,
  getGoogleAuthSuccessRedirectUrl,
  loginUser,
  loginWithGoogleAuthorizationCode,
  registerUser,
  requestPasswordReset,
  resetPassword,
  toAuthResponse
} from "../services/authService.js";
import { handleControllerError } from "../utils/controllerError.js";
import { logger } from "../logger/logger.js";

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await registerUser(req.body);
      res.cookie(authCookieName, result.token, authCookieOptions);
      res.status(201).json(toAuthResponse(result.user));
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "register" });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await loginUser(req.body);
      res.cookie(authCookieName, result.token, authCookieOptions);
      res.status(200).json(toAuthResponse(result.user));
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "login" });
    }
  },

  googleStart: async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = createOauthState();
      const redirectUrl = createGoogleOauthAuthorizationUrl(state);
      res.cookie(googleOauthStateCookieName, state, googleOauthStateCookieOptions);
      res.redirect(302, redirectUrl);
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "googleStart" });
    }
  },

  googleCallback: async (req: Request, res: Response): Promise<void> => {
    const storedState = req.cookies?.[googleOauthStateCookieName] as string | undefined;
    const queryState = typeof req.query.state === "string" ? req.query.state : undefined;
    const code = typeof req.query.code === "string" ? req.query.code : undefined;

    res.clearCookie(googleOauthStateCookieName, clearGoogleOauthStateCookieOptions);

    if (!storedState || !queryState || storedState !== queryState || !code) {
      res.redirect(302, getGoogleAuthFailureRedirectUrl("invalid_google_state"));
      return;
    }

    try {
      const result = await loginWithGoogleAuthorizationCode(code);
      res.cookie(authCookieName, result.token, authCookieOptions);
      res.redirect(302, getGoogleAuthSuccessRedirectUrl());
    } catch (error) {
      logger.warn("Google callback failed", {
        message: error instanceof Error ? error.message : "Unknown Google auth error"
      });
      res.redirect(302, getGoogleAuthFailureRedirectUrl("google_auth_failed"));
    }
  },

  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await requestPasswordReset(req.body);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "forgotPassword" });
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      await resetPassword(req.body);
      res.status(204).send();
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "resetPassword" });
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as Request & { userId?: string }).userId;
      if (userId) {
        logger.info("Logout requested", { userId });
      }

      res.clearCookie(authCookieName, clearAuthCookieOptions);
      res.status(204).send();
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "logout" });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const user = await getCurrentUser(userId);
      res.status(200).json(toAuthResponse(user));
    } catch (error) {
      handleControllerError(res, error, { scope: "Auth", action: "me" });
    }
  }
};
