import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {

    const token = extractTokenFromRequest(req as any);
    console.log('[auth/me] extracted token:', token ? `${String(token).slice(0,8)}...` : null);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    console.log('[auth/me] token payload:', payload ? { userId: payload.userId, role: payload.role } : null);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const user = await User.findById(payload.userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        role: user.role,
        position: user.position || '',
        teamId: user.teamId ? String(user.teamId) : null,
      },
    });
  } catch (error) {
    console.error('Error in auth/me:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
