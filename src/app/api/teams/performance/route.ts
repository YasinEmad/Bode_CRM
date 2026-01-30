import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import User from '@/models/User';
import Team from '@/models/Team';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Verify user is team leader
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find team where this user is the leader
    const team = await Team.findOne({ leader: user._id });
    if (!team) {
      return NextResponse.json({ error: 'Team leader access required' }, { status: 403 });
    }

    const month = req.nextUrl.searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    // Fetch team members
    const teamMembers = await User.find({ _id: { $in: team.members }, role: 'sales' }).select(
      '_id name'
    );

    // Fetch performance data for all team members for the given month
    const performances = await TeamPerformance.find({
      teamId: team._id,
      month: month,
      userId: { $in: teamMembers.map((m) => m._id) },
    });

    // Create a map of performance data
    const performanceMap = new Map(performances.map((p) => [p.userId.toString(), p]));

    // Build response with all team members, creating empty records if needed
    const teamData = teamMembers.map((member) => {
      const performance = performanceMap.get(member._id.toString());
      if (performance) {
        return performance;
      }

      // Return empty performance record for new members
      return {
        _id: undefined,
        userId: member._id,
        teamId: team._id,
        month: month,
        calls: { week1: 0, week2: 0, week3: 0, week4: 0 },
        assessments: { week1: 0, week2: 0, week3: 0, week4: 0 },
        meetings: { week1: 0, week2: 0, week3: 0, week4: 0 },
        requests: { week1: 0, week2: 0, week3: 0, week4: 0 },
      };
    });

    return NextResponse.json({ performances: teamData, teamMembers });
  } catch (error) {
    console.error('Error fetching team performance:', error);
    return NextResponse.json({ error: 'Failed to fetch team performance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Verify user is team leader
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find team where this user is the leader
    const team = await Team.findOne({ leader: user._id });
    if (!team) {
      return NextResponse.json({ error: 'Team leader access required' }, { status: 403 });
    }

    const { userId, month, calls, assessments, meetings, requests } = await req.json();

    if (!userId || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the target user is in the team
    const targetUser = await User.findById(userId);
    if (!targetUser || !team.members.includes(targetUser._id)) {
      return NextResponse.json({ error: 'User not in your team' }, { status: 403 });
    }

    // Find or create performance record
    let performance = await TeamPerformance.findOne({
      userId,
      teamId: team._id,
      month,
    });

    if (!performance) {
      performance = new TeamPerformance({
        userId,
        teamId: team._id,
        month,
        calls: calls || { week1: 0, week2: 0, week3: 0, week4: 0 },
        assessments: assessments || { week1: 0, week2: 0, week3: 0, week4: 0 },
        meetings: meetings || { week1: 0, week2: 0, week3: 0, week4: 0 },
        requests: requests || { week1: 0, week2: 0, week3: 0, week4: 0 },
      });
    } else {
      if (calls) performance.calls = calls;
      if (assessments) performance.assessments = assessments;
      if (meetings) performance.meetings = meetings;
      if (requests) performance.requests = requests;
    }

    await performance.save();

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    console.error('Error updating team performance:', error);
    return NextResponse.json({ error: 'Failed to update team performance' }, { status: 500 });
  }
}
