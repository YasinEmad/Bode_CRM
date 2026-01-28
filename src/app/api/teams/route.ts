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
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const teams = await Team.find().populate('leader').lean();

    const teamsWithStats = await Promise.all(
      teams.map(async (team: any) => {
        const membersQuery: any = { teamId: team._id };
        if (team.leader) membersQuery._id = { $ne: team.leader?._id || team.leader };
        let members = await User.find(membersQuery).select('_id name position').lean();
        // Fallback: if users don't have teamId set but team.members contains ids, query by those
        if ((!members || members.length === 0) && Array.isArray((team as any).members) && (team as any).members.length > 0) {
          const memberIdsFromTeam = (team as any).members.map((m: any) => typeof m === 'object' ? (m._id || m) : m).filter(Boolean).map(String);
          const leaderIdStr = team.leader ? String(team.leader._id || team.leader) : null;
          const idsToQuery = memberIdsFromTeam.filter((id: string) => id !== leaderIdStr);
          if (idsToQuery.length > 0) {
            members = await User.find({ _id: { $in: idsToQuery } }).select('_id name position').lean();
          }
        }
        const memberIds = members.map((m: any) => m._id);
        const leadsCount = await Lead.countDocuments({ assignedTo: { $in: memberIds } });
        const nonNewLeadsCount = await Lead.countDocuments({ assignedTo: { $in: memberIds }, status: { $ne: 'new' } });
        return {
          id: team._id,
          name: team.name,
          leader: team.leader ? { id: team.leader._id, name: team.leader.name } : null,
          membersCount: members.length,
          leadsCount,
          nonNewLeadsCount,
          createdAt: team.createdAt,
        };
      })
    );

    return NextResponse.json({ teams: teamsWithStats });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const body = await req.json();
    const { name, leaderId, memberIds } = body;

    if (!name || !leaderId) return NextResponse.json({ error: 'Missing name or leaderId' }, { status: 400 });

    // Validate leader exists and has position Team Leader (tolerant match)
    const leader = await User.findById(leaderId);
    if (!leader) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });
    const leaderPattern = /^team[\s_\-]*(lead|leader)$/i;
    if (!leaderPattern.test(leader.position || '')) {
      return NextResponse.json({ error: 'Selected leader must have position "Team Leader"' }, { status: 400 });
    }

    // Ensure leader is not included in members
    const members = Array.isArray(memberIds) ? memberIds.map((m: any) => String(m)) : [];
    if (members.includes(String(leaderId))) {
      return NextResponse.json({ error: 'Leader cannot be a member of the same team' }, { status: 400 });
    }

    // Ensure none of the members are themselves Team Leaders
    if (members.length > 0) {
      const leaderLike = await User.findOne({ _id: { $in: members }, position: { $regex: leaderPattern } });
      if (leaderLike) return NextResponse.json({ error: `User ${leaderLike.name} has position Team Leader and cannot be a member` }, { status: 400 });
    }

    // Ensure name uniqueness
    const existing = await Team.findOne({ name: name.trim() });
    if (existing) return NextResponse.json({ error: 'Team name already exists' }, { status: 400 });

    // Ensure members belong to no other team
    if (members.length > 0) {
      const conflict = await User.findOne({ _id: { $in: members }, teamId: { $ne: null } });
      if (conflict) return NextResponse.json({ error: `User ${conflict.name} already belongs to a team` }, { status: 400 });
    }

    const team = await Team.create({ name: name.trim(), leader: leaderId, members });

    // Update users to set teamId
    if (members.length > 0) {
      await User.updateMany({ _id: { $in: members } }, { $set: { teamId: team._id } });
    }
    // Ensure leader also has teamId
    await User.findByIdAndUpdate(leaderId, { teamId: team._id });

    return NextResponse.json({ success: true, team: { id: team._id, name: team.name } }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
