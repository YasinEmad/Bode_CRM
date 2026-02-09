import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import Notification from '@/models/Notification';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { sendPushToSubscription } from '@/lib/push';

export async function POST(request: Request) {
  await connectDB();

  try {
    const token = extractTokenFromRequest(request as any);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { userIds, title, message, type = 'new_lead', leadId, fromUser } = body;

    if (!userIds || !Array.isArray(userIds) || !title || !message) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // create Notification documents for each user if leadId is provided
    try {
      if (leadId) {
        const notifications = userIds.map((uid: string) => ({ userId: uid, title, message, type, leadId, fromUser }));
        await Notification.insertMany(notifications);
      } else {
        console.debug('No leadId provided, skipping Notification.insertMany');
      }
    } catch (e) {
      console.warn('Failed to create Notification documents, continuing to send push', e);
    }

    // fetch subscriptions
    const subs = await PushSubscription.find({ userId: { $in: userIds } });

    const payloadToSend = { title, message, url: body.url || '/', data: { leadId } };

    await Promise.all(subs.map(s => sendPushToSubscription(s.subscription, payloadToSend)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Push send error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
