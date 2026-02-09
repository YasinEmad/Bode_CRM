import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
  await connectDB();

  try {
    const token = extractTokenFromRequest(request as any);
    const payload = token ? verifyToken(token) : null;

    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const subscription = body.subscription;
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // avoid duplicates by endpoint
    const existing = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint, userId: payload.userId });
    if (existing) {
      existing.subscription = subscription;
      await existing.save();
      return NextResponse.json({ ok: true });
    }

    await PushSubscription.create({ userId: payload.userId, subscription, endpoint: subscription.endpoint });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Subscribe error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
