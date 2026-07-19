import webpush from 'web-push';
import PushSubscription from '../models/push-subscription.model';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sahaledu.com';

const pushConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  // Not fatal — push is an enhancement, unlike JWT secrets it's fine to run
  // without it (e.g. a fresh local checkout before VAPID keys are generated).
  console.warn('⚠️  VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — Web Push is disabled.');
}

export function isPushConfigured(): boolean {
  return pushConfigured;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

interface PushPayload {
  title: string;
  message: string;
  link?: string;
}

/** Sends a push notification to every subscription this user has (may have several — one per browser/device). Prunes subscriptions the push service reports as gone (410/404). */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushConfigured) return;

  const subs = await PushSubscription.find({ user: userId }).lean();
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          body
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        // Other errors (network blip, payload too large) are not retried —
        // this is a best-effort notification channel, not a queue.
      }
    })
  );
}
