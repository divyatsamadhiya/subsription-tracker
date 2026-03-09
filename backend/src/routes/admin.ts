import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adminController } from "../controllers/adminController.js";

export const adminRouter = Router();

const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please try again later." }
});

const adminReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please try again later." }
});

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get("/session", adminReadLimiter, asyncHandler(adminController.session));
adminRouter.get("/users", adminReadLimiter, asyncHandler(adminController.listUsers));
adminRouter.get("/users/:userId", adminReadLimiter, asyncHandler(adminController.getUser));
adminRouter.post("/users/:userId/delete", adminWriteLimiter, asyncHandler(adminController.deleteUser));
adminRouter.post("/users/:userId/restore", adminWriteLimiter, asyncHandler(adminController.restoreUser));
adminRouter.post("/users/:userId/force-logout", adminWriteLimiter, asyncHandler(adminController.forceLogoutUser));
adminRouter.get("/analytics/overview", adminReadLimiter, asyncHandler(adminController.analyticsOverview));
