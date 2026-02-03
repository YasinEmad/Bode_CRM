import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
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
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Verify user is admin
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const month = req.nextUrl.searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    // Get all team leaders (users who lead a team)
    const teamLeaders = await Team.find().populate('leader', '_id name').exec();
    // Filter out teams without a leader to avoid runtime errors
    const validTeamLeaders = teamLeaders.filter((team: any) => team.leader && team.leader._id);
    const leaderIds = validTeamLeaders.map((team: any) => team.leader._id);

    // Fetch performance data for all team leaders for the given month
    const performances = await TeamLeaderPerformance.find({
      month: month,
      userId: { $in: leaderIds },
    }).populate('userId', '_id name');

    // Create a map of performance data
    const performanceMap = new Map(performances.map((p: any) => [String(p.userId._id || p.userId), p]));

    // Build response with all team leaders, creating empty records if needed
    const leaderPerformances = await Promise.all(
      validTeamLeaders.map(async (team) => {
        const leader = team.leader as any;
        const leaderIdStr = String(leader._id);
        const performance = performanceMap.get(leaderIdStr);

        if (performance) {
          return {
            userId: String(performance.userId._id || performance.userId),
            leaderName: leader.name || '',
            month: performance.month,
            calls: performance.calls,
            assessments: performance.assessments,
            meetings: performance.meetings,
            requests: performance.requests,
          };
        }

        // Return empty performance record for new leaders
        return {
          userId: leaderIdStr,
          month: month,
          leaderName: leader.name || '',
          calls: { week1: 0, week2: 0, week3: 0, week4: 0 },
          assessments: { week1: 0, week2: 0, week3: 0, week4: 0 },
          meetings: { week1: 0, week2: 0, week3: 0, week4: 0 },
          requests: { week1: 0, week2: 0, week3: 0, week4: 0 },
        };
      })
    );

    return NextResponse.json({ performances: leaderPerformances });
  } catch (error) {
    console.error('Error fetching team leader performance:', error);
    return NextResponse.json({ error: 'Failed to fetch team leader performance' }, { status: 500 });
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

    // Verify user is admin
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, month, calls, assessments, meetings, requests } = await req.json();

    if (!userId || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user is actually a team leader
    const team = await Team.findOne({ leader: userId });
    if (!team) {
      return NextResponse.json({ error: 'User is not a team leader' }, { status: 403 });
    }

    // Find or create performance record using upsert
    const performance = await TeamLeaderPerformance.findOneAndUpdate(
      { userId, month },
      {
        userId,
        month,
        ...(calls && { calls }),
        ...(assessments && { assessments }),
        ...(meetings && { meetings }),
        ...(requests && { requests }),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    console.error('Error updating team leader performance:', error);
    return NextResponse.json({ error: 'Failed to update team leader performance' }, { status: 500 });
  }
}
