import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

const leaderPattern = /^team[\s_\-]*(lead|leader)$/i;

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    // Return only users whose position matches Team Leader (case/format tolerant)
    const leaders = await User.find({ role: 'sales', position: { $regex: leaderPattern } }).select('_id username name position').lean();

    return NextResponse.json({ employees: leaders });
  } catch (error) {
    console.error('Error fetching team leaders:', error);
    return NextResponse.json({ error: 'Failed to fetch team leaders' }, { status: 500 });
  }
}
