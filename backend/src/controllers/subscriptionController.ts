import type { Request, Response } from "express";
import { getAuthUserId } from "../middleware/auth.js";
import {
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser
} from "../services/subscriptionService.js";

export const subscriptionController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const subscriptions = await listSubscriptionsForUser(userId);
    res.status(200).json({ subscriptions });
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const subscription = await createSubscriptionForUser(userId, req.body);
    res.status(201).json({ subscription });
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    const subscription = await updateSubscriptionForUser(userId, req.params.id, req.body);
    res.status(200).json({ subscription });
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    const userId = getAuthUserId(req);
    await deleteSubscriptionForUser(userId, req.params.id);
    res.status(204).send();
  }
};
