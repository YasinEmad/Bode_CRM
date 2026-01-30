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
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    // For team leaders, get the team and all leads assigned to team members
    const team = await Team.findOne({ leader: payload.userId }).populate('members', '_id name');
    if (!team) return NextResponse.json({ error: 'Team not found or you are not a team leader' }, { status: 404 });

    // Get all leads assigned to any member of this team
    const memberIds = team.members.map((m: any) => m._id);
    const leads = await Lead.find({ assignedTo: { $in: memberIds } })
      .populate('assignedTo', 'name position')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching team leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
