import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const body = await req.json();
    const { deviceId } = body || {};
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Ensure deviceIds array exists
    if (!Array.isArray((user as any).deviceIds)) (user as any).deviceIds = [];

    // If device already exists in array, return ok
    if ((user as any).deviceIds.includes(deviceId)) {
      return NextResponse.json({ ok: true, message: 'Device already registered', user: { id: String(user._id), deviceIds: user.deviceIds } });
    }

    // Add to list of allowed device IDs
    (user as any).deviceIds.push(deviceId);
    await user.save();

    return NextResponse.json({ ok: true, message: 'Device registered', user: { id: String(user._id), deviceIds: user.deviceIds } });
  } catch (error) {
    console.error('Error in register-device:', error);
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  }
}
