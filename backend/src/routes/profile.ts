import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { profileController } from "../controllers/profileController.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.get("/", asyncHandler(profileController.get));
profileRouter.patch("/", asyncHandler(profileController.patch));
