import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import {
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser
} from "../services/subscriptionService.js";
import { handleControllerError } from "../utils/controllerError.js";

export const subscriptionController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const subscriptions = await listSubscriptionsForUser(userId);
      res.status(200).json({ subscriptions });
    } catch (error) {
      handleControllerError(res, error, { scope: "Subscription", action: "list" });
    }
  },

  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const subscription = await createSubscriptionForUser(userId, req.body);
      res.status(201).json({ subscription });
    } catch (error) {
      handleControllerError(res, error, { scope: "Subscription", action: "create" });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const subscription = await updateSubscriptionForUser(userId, req.params.id, req.body);
      res.status(200).json({ subscription });
    } catch (error) {
      handleControllerError(res, error, { scope: "Subscription", action: "update" });
    }
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      await deleteSubscriptionForUser(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      handleControllerError(res, error, { scope: "Subscription", action: "remove" });
    }
  }
};
