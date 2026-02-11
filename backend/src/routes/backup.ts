import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { backupController } from "../controllers/backupController.js";

export const backupRouter = Router();

backupRouter.use(requireAuth);
backupRouter.get("/export", asyncHandler(backupController.export));
backupRouter.post("/import", asyncHandler(backupController.import));
