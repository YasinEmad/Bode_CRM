import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    console.log('[auth/me] Request headers:', {
      cookie: req.headers.get('cookie'),
      authorization: req.headers.get('authorization'),
    });

    const token = extractTokenFromRequest(req as any);
    console.log('[auth/me] extracted token:', token ? `${String(token).slice(0,8)}...` : null);
    if (!token) {
      console.log('[auth/me] No token found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    console.log('[auth/me] token payload:', payload ? { userId: payload.userId, role: payload.role } : null);
    if (!payload) {
      console.log('[auth/me] Token verification failed, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(payload.userId).select('_id username name role position salary joinDate teamId deviceId deviceIds createdAt').lean();
    if (!user) {
      console.log('[auth/me] User not found in DB, returning 404');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[auth/me] Returning user:', { userId: user._id, username: user.username, role: user.role, joinDate: user.joinDate });
    return NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        role: user.role,
        position: user.position || '',
        salary: typeof user.salary === 'number' ? user.salary : 0,
        joinDate: user.joinDate || user.createdAt,
        teamId: user.teamId ? String(user.teamId) : null,
        deviceId: user.deviceId || null,
        deviceIds: Array.isArray(user.deviceIds) ? user.deviceIds : (user.deviceId ? [user.deviceId] : []),
      },
    });
  } catch (error) {
    console.error('Error in auth/me:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
