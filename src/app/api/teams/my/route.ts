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

    // Find team where current user is leader
    const team = await Team.findOne({ leader: payload.userId }).lean();
    if (!team) return NextResponse.json({ error: 'Team not found or you are not a team leader' }, { status: 404 });

    const members = await User.find({ teamId: team._id }).select('_id name position username').lean();
    const membersWithStats = await Promise.all(
      members.map(async (m: any) => {
        const leadsCount = await Lead.countDocuments({ assignedTo: m._id });
        const closedCount = await Lead.countDocuments({ assignedTo: m._id, status: 'closed' });
        const conversionRate = leadsCount > 0 ? (closedCount / leadsCount) * 100 : 0;
        return {
          id: m._id,
          name: m.name,
          position: m.position,
          username: m.username,
          leadsCount,
          closedCount,
          conversionRate,
        };
      })
    );

    return NextResponse.json({ team: { id: team._id, name: team.name }, members: membersWithStats });
  } catch (error) {
    console.error('Error fetching my team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}
