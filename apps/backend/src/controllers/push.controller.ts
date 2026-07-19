import { Request, Response } from 'express';
import PushSubscription from '../models/push-subscription.model';
import ApiResponse from '../utils/api-response';
import { BadRequestError } from '../utils/api-error';
import { getVapidPublicKey, isPushConfigured } from '../utils/web-push';

// GET /push/vapid-public-key
export const getPublicKey = async (_req: Request, res: Response) => {
  return ApiResponse.success(res, { publicKey: getVapidPublicKey(), enabled: isPushConfigured() });
};

// POST /push/subscribe — body: { endpoint, keys: { p256dh, auth } }
export const subscribe = async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new BadRequestError('endpoint and keys.p256dh/keys.auth are required');
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user!.userId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ApiResponse.success(res, null, 'Subscribed to push notifications');
};

// POST /push/unsubscribe — body: { endpoint }
export const unsubscribe = async (req: Request, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) throw new BadRequestError('endpoint is required');
  await PushSubscription.deleteOne({ endpoint, user: req.user!.userId });
  return ApiResponse.success(res, null, 'Unsubscribed');
};
