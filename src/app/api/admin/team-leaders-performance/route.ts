import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import Team from '@/models/Team';
import User from '@/models/User';
import TeamPerformance from '@/models/TeamPerformance';
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

    // Get number of days in the month
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();

    // Build response with all team leaders, creating empty records if needed
    const leaderPerformances = await Promise.all(
      validTeamLeaders.map(async (team) => {
        const leader = team.leader as any;
        const leaderIdStr = String(leader._id);
        const performance = performanceMap.get(leaderIdStr);

        // Prepare empty day buckets
        const emptyDays: Record<string, number> = {};
        for (let i = 1; i <= daysInMonth; i++) {
          emptyDays[`day${i}`] = 0;
        }

        // Fetch all team member performances for this team (members + leader + admin-added)
        const teamPerformances = await TeamPerformance.find({ teamId: team._id, month });

        // Build aggregated totals across all team performances
        const aggregated = {
          userId: leaderIdStr,
          leaderName: leader.name || '',
          month,
          daysInMonth,
          sheets: { ...emptyDays },
          assessments: { ...emptyDays },
          meetings: { ...emptyDays },
          requests: { ...emptyDays },
        } as any;

        for (const p of teamPerformances) {
          const sheets = Object.fromEntries(p.sheets || new Map());
          const meetings = Object.fromEntries(p.meetings || new Map());
          const requests = Object.fromEntries(p.requests || new Map());
          const assessments = Object.fromEntries(p.assessments || new Map());

          for (const [k, v] of Object.entries(sheets)) {
            aggregated.sheets[k] = (aggregated.sheets[k] || 0) + Number(v || 0);
          }
          for (const [k, v] of Object.entries(meetings)) {
            aggregated.meetings[k] = (aggregated.meetings[k] || 0) + Number(v || 0);
          }
          for (const [k, v] of Object.entries(requests)) {
            aggregated.requests[k] = (aggregated.requests[k] || 0) + Number(v || 0);
          }
          for (const [k, v] of Object.entries(assessments)) {
            aggregated.assessments[k] = (aggregated.assessments[k] || 0) + Number(v || 0);
          }
        }

        // Aggregate leads and closed deals for the whole team within the month
        try {
          const memberIds = Array.isArray(team.members)
            ? team.members.map((m: any) => String(m))
            : [];
          // include leader in the member list to capture leader-assigned leads too
          if (leader && leader._id) memberIds.push(String(leader._id));

          const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

          const teamLeads = await Lead.find({
            assignedTo: { $in: memberIds },
            createdAt: { $gte: monthStart, $lte: monthEnd },
          });

          aggregated.aggregatedLeads = teamLeads.length;
          aggregated.aggregatedDeals = teamLeads.filter((l: any) => l.status === 'closed').length;
        } catch (e) {
          aggregated.aggregatedLeads = 0;
          aggregated.aggregatedDeals = 0;
        }

        if (performance) {
          return {
            userId: String(performance.userId._id || performance.userId),
            leaderName: leader.name || '',
            month: performance.month,
            daysInMonth,
            sheets: Object.fromEntries(performance.sheets || new Map()),
            assessments: Object.fromEntries(performance.assessments || new Map()),
            meetings: Object.fromEntries(performance.meetings || new Map()),
            requests: Object.fromEntries(performance.requests || new Map()),
            aggregated,
          };
        }

        // Return empty performance record for new leaders with aggregated totals
        return {
          userId: leaderIdStr,
          month: month,
          leaderName: leader.name || '',
          daysInMonth,
          sheets: emptyDays,
          assessments: emptyDays,
          meetings: emptyDays,
          requests: emptyDays,
          aggregated,
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

    const { userId, month, sheets, assessments, meetings, requests } = await req.json();

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
        ...(sheets && { sheets: new Map(Object.entries(sheets)) }),
        ...(assessments && { assessments: new Map(Object.entries(assessments)) }),
        ...(meetings && { meetings: new Map(Object.entries(meetings)) }),
        ...(requests && { requests: new Map(Object.entries(requests)) }),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    console.error('Error updating team leader performance:', error);
    return NextResponse.json({ error: 'Failed to update team leader performance' }, { status: 500 });
  }
}
