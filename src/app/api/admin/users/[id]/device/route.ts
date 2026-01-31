import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any) || extractToken(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    let userId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('userId');
    if (!userId) {
      // Try to extract from pathname: /api/admin/users/:id/device
      const parts = req.nextUrl.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'users');
      if (idx >= 0 && parts.length > idx + 1) userId = parts[idx + 1];
    }
    const body = await req.json();
    const { deviceId } = body || {};
    if (!deviceId || typeof deviceId !== 'string') return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!Array.isArray((user as any).deviceIds)) (user as any).deviceIds = [];
    if ((user as any).deviceIds.includes(deviceId)) {
      return NextResponse.json({ ok: true, message: 'Device already exists', user: { id: String(user._id), deviceIds: user.deviceIds } });
    }

    (user as any).deviceIds.push(deviceId);
    await user.save();

    return NextResponse.json({ ok: true, message: 'Device added', user: { id: String(user._id), deviceIds: user.deviceIds } });
  } catch (err) {
    console.error('Error in admin add device:', err);
    return NextResponse.json({ error: 'Failed to add device' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any) || extractToken(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    let userId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('userId');
    if (!userId) {
      const parts = req.nextUrl.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'users');
      if (idx >= 0 && parts.length > idx + 1) userId = parts[idx + 1];
    }

    const body = await req.json().catch(() => ({}));
    const { deviceId } = body || {};
    if (!deviceId || typeof deviceId !== 'string') return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!Array.isArray((user as any).deviceIds)) (user as any).deviceIds = [];

    const idx = (user as any).deviceIds.indexOf(deviceId);
    if (idx === -1) {
      return NextResponse.json({ ok: false, message: 'Device not found', user: { id: String(user._id), deviceIds: user.deviceIds } });
    }

    (user as any).deviceIds.splice(idx, 1);
    await user.save();

    return NextResponse.json({ ok: true, message: 'Device removed', user: { id: String(user._id), deviceIds: user.deviceIds } });
  } catch (err) {
    console.error('Error in admin remove device:', err);
    return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 });
  }
}
