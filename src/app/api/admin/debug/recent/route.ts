import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminAction from '@/models/AdminAction';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const logs = await AdminAction.find({})
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching debug admin actions:', error);
    return NextResponse.json({ error: 'Failed to fetch debug admin actions' }, { status: 500 });
  }
}
