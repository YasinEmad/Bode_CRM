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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const { id } = await params;
    const team = await Team.findById(id).populate('leader').lean();
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const membersQuery: any = { teamId: team._id };
    if (team.leader) membersQuery._id = { $ne: team.leader };
    let members = await User.find(membersQuery).select('_id name position username').lean();
    // Fallback to team.members array if users don't have teamId set
    if ((!members || members.length === 0) && Array.isArray((team as any).members) && (team as any).members.length > 0) {
      const memberIdsFromTeam = (team as any).members.map((m: any) => typeof m === 'object' ? (m._id || m) : m).filter(Boolean).map(String);
      const leaderIdStr = team.leader ? String((team.leader as any)._id || team.leader) : null;
      const idsToQuery = memberIdsFromTeam.filter((id: string) => id !== leaderIdStr);
      if (idsToQuery.length > 0) {
        members = await User.find({ _id: { $in: idsToQuery } }).select('_id name position username').lean();
      }
    }
    const memberIds = members.map((m: any) => m._id);
    const leadsCount = await Lead.countDocuments({ assignedTo: { $in: memberIds } });
    const nonNewLeadsCount = await Lead.countDocuments({ assignedTo: { $in: memberIds }, status: { $ne: 'new' } });

    return NextResponse.json({
      team: {
        id: team._id,
        name: team.name,
        leader: team.leader ? { id: team.leader._id, name: team.leader.name } : null,
        members,
        leadsCount,
        nonNewLeadsCount,
        createdAt: team.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { name, leaderId, memberIds } = body;

    const team = await Team.findById(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    if (leaderId) {
      const leader = await User.findById(leaderId);
      if (!leader) return NextResponse.json({ error: 'Leader not found' }, { status: 404 });
      const leaderPattern = /^team[\s_\-]*(lead|leader)$/i;
      if (!leaderPattern.test(leader.position || '')) {
        return NextResponse.json({ error: 'Selected leader must have position "Team Leader"' }, { status: 400 });
      }
      team.leader = leaderId;
      await User.findByIdAndUpdate(leaderId, { teamId: team._id });
    }

    if (name) team.name = name;

    if (Array.isArray(memberIds)) {
      // Remove teamId from users removed from team
      const currentMemberIds = ((team.members as any[]) || []).map(m => String(m));
      const newMemberIds = (memberIds as any[]).map(m => String(m));
      const removed = currentMemberIds.filter(mid => !newMemberIds.includes(mid));
      const added = newMemberIds.filter(mid => !currentMemberIds.includes(mid));

      if (removed.length > 0) {
        await User.updateMany({ _id: { $in: removed } }, { $set: { teamId: null } });
      }

      if (added.length > 0) {
        // Ensure added users are not in another team
        const conflict = await User.findOne({ _id: { $in: added }, teamId: { $ne: null } });
        if (conflict) return NextResponse.json({ error: `User ${conflict.name} already belongs to a team` }, { status: 400 });

        // Ensure none of the added users are Team Leaders
        const leaderPattern = /^team[\s_\-]*(lead|leader)$/i;
        const leaderLike = await User.findOne({ _id: { $in: added }, position: { $regex: leaderPattern } });
        if (leaderLike) return NextResponse.json({ error: `User ${leaderLike.name} has position Team Leader and cannot be a member` }, { status: 400 });

        await User.updateMany({ _id: { $in: added } }, { $set: { teamId: team._id } });
      }

      // Ensure leader is not included in members
      if (team.leader && memberIds.map((m: any) => String(m)).includes(String(team.leader))) {
        return NextResponse.json({ error: 'Leader cannot be a member of the same team' }, { status: 400 });
      }

      team.members = memberIds;
    }

    await team.save();

    return NextResponse.json({ success: true, team: { id: team._id, name: team.name } });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const { id } = await params;
    const team = await Team.findById(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // Remove teamId from members and leader
    const memberIds = ((team.members as any[]) || []).map(m => m);
    if (memberIds.length > 0) {
      await User.updateMany({ _id: { $in: memberIds } }, { $set: { teamId: null } });
    }
    if (team.leader) {
      await User.findByIdAndUpdate(team.leader, { $set: { teamId: null } });
    }

    await Team.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
