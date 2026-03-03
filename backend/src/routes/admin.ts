import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adminController } from "../controllers/adminController.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get("/session", asyncHandler(adminController.session));
adminRouter.get("/users", asyncHandler(adminController.listUsers));
adminRouter.get("/users/:userId", asyncHandler(adminController.getUser));
adminRouter.post("/users/:userId/delete", asyncHandler(adminController.deleteUser));
adminRouter.post("/users/:userId/restore", asyncHandler(adminController.restoreUser));
adminRouter.post("/users/:userId/force-logout", asyncHandler(adminController.forceLogoutUser));
adminRouter.get("/analytics/overview", asyncHandler(adminController.analyticsOverview));
