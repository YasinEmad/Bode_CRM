import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.warn('VAPID keys not configured. Push will not work.');
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails('mailto:admin@localhost', VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.warn('Failed to set VAPID details for web-push', e);
  }
}

export async function sendPushToSubscription(subscription: any, payload: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // If subscription is gone, remove from DB
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      try {
        await PushSubscription.deleteOne({ 'subscription.endpoint': subscription.endpoint });
      } catch (e) {
        console.warn('Failed to remove stale subscription', e);
      }
    }
    console.warn('Push send error', err?.statusCode || err);
    return false;
  }
}
