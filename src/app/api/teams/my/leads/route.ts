import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';
import Lead from '@/models/Lead';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    // Find team where current user is leader
    const team = await Team.findOne({ leader: payload.userId }).lean();
    if (!team) return NextResponse.json({ leads: [] });

    // Gather member IDs: users with teamId or team.members fallback
    let members = await User.find({ teamId: team._id }).select('_id').lean();
    if ((!members || members.length === 0) && Array.isArray((team as any).members) && (team as any).members.length > 0) {
      const memberIdsFromTeam = (team as any).members.map((m: any) => typeof m === 'object' ? (m._id || m) : m).filter(Boolean).map(String);
      if (memberIdsFromTeam.length > 0) {
        members = await User.find({ _id: { $in: memberIdsFromTeam } }).select('_id').lean();
      }
    }

    const memberIds = members.map((m: any) => m._id).filter(Boolean);

    if (memberIds.length === 0) return NextResponse.json({ leads: [] });

    const leads = await Lead.find({ assignedTo: { $in: memberIds } })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching team leads:', error);
    return NextResponse.json({ error: 'Failed to fetch team leads' }, { status: 500 });
  }
}

