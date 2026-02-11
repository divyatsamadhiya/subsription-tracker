import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { settingsController } from "../controllers/settingsController.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);
settingsRouter.get("/", asyncHandler(settingsController.get));
settingsRouter.patch("/", asyncHandler(settingsController.patch));
