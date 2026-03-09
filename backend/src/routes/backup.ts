import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { backupController } from "../controllers/backupController.js";

export const backupRouter = Router();

const backupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many backup requests. Please try again later." }
});

backupRouter.use(requireAuth);
backupRouter.get("/export", backupLimiter, asyncHandler(backupController.export));
backupRouter.post("/import", backupLimiter, asyncHandler(backupController.import));
