import { Router } from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authController } from "../controllers/authController.js";

export const authRouter = Router();

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many authentication attempts. Please try again later."
  }
});

authRouter.post("/register", authWriteLimiter, asyncHandler(authController.register));
authRouter.post("/login", authWriteLimiter, asyncHandler(authController.login));
authRouter.post("/forgot-password", authWriteLimiter, asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", authWriteLimiter, asyncHandler(authController.resetPassword));
authRouter.post("/logout", optionalAuth, asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
