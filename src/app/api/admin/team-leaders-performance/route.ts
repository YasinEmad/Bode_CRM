import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import Team from '@/models/Team';
import User from '@/models/User';
import TeamPerformance from '@/models/TeamPerformance';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import KPISetting from '@/models/KPISetting';
import { verifyToken } from '@/lib/auth';
import { getAggregationConfig, shouldIncludeTeamData } from '@/lib/kpiCalculator';
import { calculateTeamLeaderPerformance } from '@/lib/teamLeaderDataCalculator';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function convertMongoMapToObject(data: any): Record<string, number> {
  if (!data) return {};
  // MongoDB Map fields might come back as plain objects or Maps
  if (data instanceof Map) {
    return Object.fromEntries(data);
  }
  // If it's already a plain object, return it directly
  return typeof data === 'object' ? data : {};
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
    const validTeamLeaders = teamLeaders.filter((team: any) => team.leader && team.leader._id);
    const leaderIds = validTeamLeaders.map((team: any) => String(team.leader._id));

    // Use unified calculator for all team leaders
    const leaderPerformances = await Promise.all(
      leaderIds.map(async (leaderId) => {
        const perfData = await calculateTeamLeaderPerformance(leaderId, month);
        return perfData || null;
      })
    );

    // Filter out null results
    const validPerformances = leaderPerformances.filter((p) => p !== null);

    // Format response to match original API contract
    const formattedPerformances = validPerformances.map((perf) => ({
      userId: perf!.userId,
      leaderName: perf!.leaderName,
      month: perf!.month,
      daysInMonth: perf!.daysInMonth,
      sheets: perf!.aggregated.sheets,
      assessments: perf!.aggregated.assessments,
      meetings: perf!.aggregated.meetings,
      requests: perf!.aggregated.requests,
      leaderPersonal: perf!.leaderPersonal,
      aggregated: perf!.aggregated,
      leaderOwnLeads: perf!.leaderOwnLeads,
      leaderOwnDeals: perf!.leaderOwnDeals,
      teamLeadsCount: perf!.teamLeadsCount,
      teamDealsCount: perf!.teamDealsCount,
    }));

    return NextResponse.json({ performances: formattedPerformances });
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
        editedByAdmin: true, // Mark as edited by admin
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    console.error('Error updating team leader performance:', error);
    return NextResponse.json({ error: 'Failed to update team leader performance' }, { status: 500 });
  }
}
