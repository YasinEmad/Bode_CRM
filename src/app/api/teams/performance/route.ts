import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import User from '@/models/User';
import Team from '@/models/Team';
import KPISetting from '@/models/KPISetting';
import { verifyToken } from '@/lib/auth';
import { getAggregationConfig, shouldIncludeTeamData } from '@/lib/kpiCalculator';
import { calculateTeamLeaderPerformance } from '@/lib/teamLeaderDataCalculator';
import mongoose from 'mongoose';

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

    // Fetch performance data for all team members + the team leader for the given month
    const memberIds = teamMembers.map((m) => m._id.toString());
    // include team leader id to allow aggregation
    memberIds.push(team.leader.toString());

    const performances = await TeamPerformance.find({
      teamId: team._id,
      month: month,
      userId: { $in: memberIds },
    });

    // Create a map of performance data
    const performanceMap = new Map(performances.map((p) => [p.userId.toString(), p]));

    // Get number of days in the month
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();

    // Build response with all team members, creating empty records if needed
    const teamData = teamMembers.map((member) => {
      const performance = performanceMap.get(member._id.toString());

      const emptyDays: Record<string, number> = {};
      for (let i = 1; i <= daysInMonth; i++) {
        emptyDays[`day${i}`] = 0;
      }

      if (performance) {
        return {
          _id: performance._id,
          userId: member._id,
          name: member.name,
          teamId: team._id,
          month: month,
          daysInMonth,
          sheets: convertMongoMapToObject(performance.sheets),
          assessments: convertMongoMapToObject(performance.assessments),
          meetings: convertMongoMapToObject(performance.meetings),
          requests: convertMongoMapToObject(performance.requests),
          editedByAdmin: performance.editedByAdmin || false, // Include admin edit flag
          // leads/deals will be attached below from Lead collection (read-only)
          leadsCount: 0,
          dealsCount: 0,
        };
      }

      // Return empty performance record for new members
      return {
        _id: undefined,
        userId: member._id,
        name: member.name,
        teamId: team._id,
        month: month,
        daysInMonth,
        sheets: emptyDays,
        assessments: emptyDays,
        meetings: emptyDays,
        requests: emptyDays,
        editedByAdmin: false,
      };
    });

    // Build aggregated totals for the team leader: sum of leader's own entries + all team members + any admin-added values
    const emptyAgg: Record<string, number> = {};
    for (let i = 1; i <= daysInMonth; i++) emptyAgg[`day${i}`] = 0;

    // Fetch team leader's KPI settings to determine aggregation mode
    const teamLeaderSettings = await KPISetting.findOne({ scope: 'team-leader' });
    const aggregationConfig = teamLeaderSettings ? getAggregationConfig(teamLeaderSettings.indicators) : {};

    const leaderUser = await User.findById(team.leader);
    const aggregated = {
      userId: team.leader,
      name: leaderUser?.name || 'Team Total',
      teamId: team._id,
      month: month,
      daysInMonth,
      sheets: { ...emptyAgg },
      assessments: { ...emptyAgg },
      meetings: { ...emptyAgg },
      requests: { ...emptyAgg },
      // leads/deals aggregated across team (from Lead collection)
      aggregatedLeads: 0,
      aggregatedDeals: 0,
    } as any;

    // Determine which metrics should include team data based on aggregationMode
    const sheetsIncludeTeam = shouldIncludeTeamData('sheets', aggregationConfig);
    const assessmentsIncludeTeam = shouldIncludeTeamData('assessments', aggregationConfig);
    const meetingsIncludeTeam = shouldIncludeTeamData('meetings', aggregationConfig);
    const requestsIncludeTeam = shouldIncludeTeamData('requests', aggregationConfig);
    const leadsIncludeTeam = shouldIncludeTeamData('leads', aggregationConfig);

    // Try to fetch any admin-edited leader performance (TeamLeaderPerformance).
    // We'll prefer admin-edited values for displaying the leader's personal row.
    // USE UNIFIED CALCULATOR FOR LEADER DATA
    let adminLeaderPerf: any = null;
    let leaderPersonal: any = null;
    let aggregatedLeaderData: any = null;

    try {
      // Use unified calculator which handles all data sources
      const calcResult = await calculateTeamLeaderPerformance(String(team.leader), month);
      if (calcResult) {
        // Build leaderPersonal response object
        leaderPersonal = {
          userId: calcResult.userId,
          name: (leaderUser?.name || 'Leader') + ' (You)',
          month: calcResult.month,
          daysInMonth: calcResult.daysInMonth,
          sheets: calcResult.leaderPersonal.sheets,
          assessments: calcResult.leaderPersonal.assessments,
          meetings: calcResult.leaderPersonal.meetings,
          requests: calcResult.leaderPersonal.requests,
          editedByAdmin: calcResult.editedByAdmin, // Include admin edit flag
          adminLocks: {
            sheets: {},
            assessments: {},
            meetings: {},
            requests: {},
          },
          leaderPersonal: true,
          leadsCount: calcResult.leaderOwnLeads,
          dealsCount: calcResult.leaderOwnDeals,
        };

        // Also store aggregated data for later use
        aggregatedLeaderData = {
          sheets: calcResult.aggregated.sheets,
          assessments: calcResult.aggregated.assessments,
          meetings: calcResult.aggregated.meetings,
          requests: calcResult.aggregated.requests,
          aggregatedLeads: calcResult.aggregated.aggregatedLeads,
          aggregatedDeals: calcResult.aggregated.aggregatedDeals,
        };
      }
    } catch (e) {
      console.error('Error calculating leader performance:', e);
    }

    // --- Compute leads (from Lead) and deals (from ClosedDealSnapshot) ---
    try {
      // Use aggregated data from helper if available (sheets/meetings/etc)
      if (aggregatedLeaderData) {
        aggregated.sheets = aggregatedLeaderData.sheets;
        aggregated.assessments = aggregatedLeaderData.assessments;
        aggregated.meetings = aggregatedLeaderData.meetings;
        aggregated.requests = aggregatedLeaderData.requests;
      }

      const memberIdStrings = teamMembers.map((m) => String(m._id));
      if (team.leader) memberIdStrings.push(String(team.leader));

      // Convert to ObjectIds for proper MongoDB query matching
      const memberObjectIds = memberIdStrings.map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      }).filter((id): id is mongoose.Types.ObjectId => id !== null);

      const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

      // Check if deals should include team data
      const dealsIncludeTeam = shouldIncludeTeamData('deals', aggregationConfig);

      // Leads: count based on aggregationMode for 'leads' indicator
      let teamLeads;
      if (leadsIncludeTeam) {
        // Team+Leader mode: include all team members' leads
        teamLeads = await Lead.find({
          assignedTo: { $in: memberObjectIds },
          createdAt: { $gte: monthStart, $lte: monthEnd },
        });
      } else {
        // Leader-only mode: only leader's leads
        teamLeads = await Lead.find({
          assignedTo: team.leader,
          createdAt: { $gte: monthStart, $lte: monthEnd },
        });
      }

      const leadsByUser = new Map<string, { leadsCount: number }>();
      for (const l of teamLeads) {
        const assignee = String((l as any).assignedTo || '');
        if (!assignee) continue;
        const cur = leadsByUser.get(assignee) || { leadsCount: 0 };
        cur.leadsCount += 1;
        leadsByUser.set(assignee, cur);
      }

      // Deals: count closed deals based on aggregationMode
      let snaps;
      if (dealsIncludeTeam) {
        // Team+Leader mode: include all team members' deals
        const snapQuery: any = {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          $or: [{ assignedTo: { $in: memberObjectIds } }, { userId: { $in: memberObjectIds } }],
        };
        snaps = await ClosedDealSnapshot.find(snapQuery).lean();
      } else {
        // Leader-only mode: only leader's deals
        const leaderSnapQuery: any = {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          $or: [
            { assignedTo: team.leader },
            { userId: team.leader },
          ],
        };
        snaps = await ClosedDealSnapshot.find(leaderSnapQuery).lean();
      }

      const dealsByUser = new Map<string, number>();
      for (const s of snaps) {
        const assigned = s.assignedTo ? String(s.assignedTo) : null;
        const userIdField = s.userId ? String(s.userId) : null;
        const key = assigned || userIdField;
        if (!key) continue;
        dealsByUser.set(key, (dealsByUser.get(key) || 0) + 1);
      }

      // Attach to teamData rows
      for (const row of teamData) {
        const id = String(row.userId);
        const leadStats = leadsByUser.get(id) || { leadsCount: 0 };
        const deals = dealsByUser.get(id) || 0;
        row.leadsCount = leadStats.leadsCount;
        row.dealsCount = deals;
      }

      // Always calculate aggregated leads/deals (not just when aggregatedLeaderData is missing)
      aggregated.aggregatedLeads = 0;
      aggregated.aggregatedDeals = 0;
      
      if (dealsIncludeTeam) {
        // Team+Leader mode: sum all team members + leader
        for (const row of teamData) {
          const leadStats = leadsByUser.get(String(row.userId)) || { leadsCount: 0 };
          const deals = dealsByUser.get(String(row.userId)) || 0;
          aggregated.aggregatedLeads += leadStats.leadsCount;
          aggregated.aggregatedDeals += deals;
        }
      } else {
        // Leader-only mode: only leader's stats
        const leaderIdStr = String(team.leader);
        const leaderLeadStats = leadsByUser.get(leaderIdStr) || { leadsCount: 0 };
        const leaderDeals = dealsByUser.get(leaderIdStr) || 0;
        aggregated.aggregatedLeads = leaderLeadStats.leadsCount;
        aggregated.aggregatedDeals = leaderDeals;
      }

      // Attach leader personal counts if present
      if (leaderPersonal) {
        const leaderIdStr = String(team.leader);
        const leaderLeads = leadsByUser.get(leaderIdStr) || { leadsCount: 0 };
        const leaderDeals = dealsByUser.get(leaderIdStr) || 0;
        (leaderPersonal as any).leadsCount = leaderLeads.leadsCount;
        (leaderPersonal as any).dealsCount = leaderDeals;
      }
    } catch (e) {
      console.error('Error computing team leads/deals with snapshots', e);
    }

    return NextResponse.json({ performances: teamData, teamMembers, aggregatedLeader: aggregated, leaderPersonal });
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

    const { userId, month, sheets, assessments, meetings, requests } = await req.json();

    if (!userId || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that only current month data can be edited
    const now = new Date();
    const [memberYear, memberMonth] = month.split('-').map(Number);
    
    if (now.getFullYear() !== memberYear || (now.getMonth() + 1) !== memberMonth) {
      return NextResponse.json({ error: 'You can only edit data for the current month' }, { status: 403 });
    }

    // NOTE: Day-level validation (only today) is enforced on the frontend.
    // The frontend sends all days to preserve existing data.
    // Additional validation could be added here if needed, but frontend
    // already restricts edits to today only with client-side checks.

    // Verify the target user is in the team or is the leader
    const targetUser = await User.findById(userId);
    if (!targetUser || (!team.members.includes(targetUser._id) && !team.leader.equals(targetUser._id))) {
      return NextResponse.json({ error: 'User not in your team' }, { status: 403 });
    }

    // Check if existing performance data was edited by admin - if so, prevent team leader from modifying
    const existingPerformance = await TeamPerformance.findOne({
      userId,
      teamId: team._id,
      month,
    });

    if (existingPerformance && existingPerformance.editedByAdmin) {
      return NextResponse.json(
        { error: 'This data was edited by admin and cannot be modified by team members' },
        { status: 403 }
      );
    }

    // Find or create performance record
    const performance = await TeamPerformance.findOneAndUpdate(
      {
        userId,
        teamId: team._id,
        month,
      },
      {
        userId,
        teamId: team._id,
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
    console.error('Error updating team performance:', error);
    return NextResponse.json({ error: 'Failed to update team performance' }, { status: 500 });
  }
}
