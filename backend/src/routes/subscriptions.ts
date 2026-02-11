import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { subscriptionController } from "../controllers/subscriptionController.js";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);
subscriptionsRouter.get("/", asyncHandler(subscriptionController.list));
subscriptionsRouter.post("/", asyncHandler(subscriptionController.create));
subscriptionsRouter.put("/:id", asyncHandler(subscriptionController.update));
subscriptionsRouter.delete("/:id", asyncHandler(subscriptionController.remove));
