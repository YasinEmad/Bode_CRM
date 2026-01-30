import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';
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

    // Admins can fetch any team members by supplying teamId
    const teamId = req.nextUrl.searchParams.get('teamId');
    if (payload.role === 'admin' && teamId) {
      const team = await Team.findById(teamId).populate('members', 'name');
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      return NextResponse.json({ members: team.members }, { status: 200 });
    }

    // For sales role, return members only if current user is leader
    if (payload.role === 'sales') {
      const team = await Team.findOne({ leader: payload.userId }).populate('members', 'name');
      if (!team) return NextResponse.json({ error: 'Only team leaders can view members' }, { status: 403 });
      return NextResponse.json({ members: team.members }, { status: 200 });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
