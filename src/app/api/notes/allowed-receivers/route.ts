import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Team from '@/models/Team';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const sender = await User.findById(payload.userId);
    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let receivers: any[] = [];

    if (sender.role === 'admin') {
      // Admin can send to all non-admin users
      receivers = await User.find({ role: 'sales' })
        .select('_id name username position')
        .lean();
    } else {
      // Check if this sales user is a team leader
      const teamLead = await Team.findOne({ leader: payload.userId }).populate(
        'members',
        '_id name username position'
      );
      if (teamLead) {
        // Team leader can send to their team members only
        receivers = teamLead.members;
      }
    }

    return NextResponse.json({ receivers }, { status: 200 });
  } catch (error: any) {
    console.error('[notes/allowed-receivers] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
