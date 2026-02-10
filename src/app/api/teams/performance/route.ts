import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import Lead from '@/models/Lead';
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
          sheets: Object.fromEntries(performance.sheets || new Map()),
          assessments: Object.fromEntries(performance.assessments || new Map()),
          meetings: Object.fromEntries(performance.meetings || new Map()),
          requests: Object.fromEntries(performance.requests || new Map()),
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
      };
    });

    // Build aggregated totals for the team leader: sum of leader's own entries + all team members + any admin-added values
    const emptyAgg: Record<string, number> = {};
    for (let i = 1; i <= daysInMonth; i++) emptyAgg[`day${i}`] = 0;

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

    // Try to fetch any admin-edited leader performance (TeamLeaderPerformance).
    // We'll prefer admin-edited values for displaying the leader's personal row.
    let adminLeaderPerf: any = null;
    try {
      adminLeaderPerf = await TeamLeaderPerformance.findOne({ userId: team.leader, month });
    } catch (e) {
      // ignore
    }

    // Also extract the leader's personal performance (if any) so UI can show both personal and aggregated rows.
    const leaderPerf = performances.find((p) => p.userId.toString() === team.leader.toString());
    let leaderPersonal = null;
    if (adminLeaderPerf) {
      leaderPersonal = {
        _id: adminLeaderPerf._id,
        userId: adminLeaderPerf.userId,
        name: leaderUser?.name || 'Leader',
        teamId: undefined,
        month: adminLeaderPerf.month,
        daysInMonth,
        sheets: Object.fromEntries(adminLeaderPerf.sheets || new Map()),
        assessments: Object.fromEntries(adminLeaderPerf.assessments || new Map()),
        meetings: Object.fromEntries(adminLeaderPerf.meetings || new Map()),
        requests: Object.fromEntries(adminLeaderPerf.requests || new Map()),
      };
    } else if (leaderPerf) {
      leaderPersonal = {
        _id: leaderPerf._id,
        userId: leaderPerf.userId,
        name: leaderUser?.name || 'Leader',
        teamId: leaderPerf.teamId,
        month: leaderPerf.month,
        daysInMonth,
        sheets: Object.fromEntries(leaderPerf.sheets || new Map()),
        assessments: Object.fromEntries(leaderPerf.assessments || new Map()),
        meetings: Object.fromEntries(leaderPerf.meetings || new Map()),
        requests: Object.fromEntries(leaderPerf.requests || new Map()),
      };
    }

    // Sum sheets/meetings/requests across all performances
    for (const p of performances) {
      const sheets = Object.fromEntries(p.sheets || new Map());
      const meetings = Object.fromEntries(p.meetings || new Map());
      const requests = Object.fromEntries(p.requests || new Map());

      for (const [k, v] of Object.entries(sheets)) {
        aggregated.sheets[k] = (aggregated.sheets[k] || 0) + Number(v || 0);
      }
      for (const [k, v] of Object.entries(meetings)) {
        aggregated.meetings[k] = (aggregated.meetings[k] || 0) + Number(v || 0);
      }
      for (const [k, v] of Object.entries(requests)) {
        aggregated.requests[k] = (aggregated.requests[k] || 0) + Number(v || 0);
      }

      // For assessments: leader or admin may have written assessments on member records.
      // Sum all assessments across performances (only leader/admin can write them),
      // so aggregated includes any assessments present on member or leader records.
      const assessments = Object.fromEntries(p.assessments || new Map());
      for (const [k, v] of Object.entries(assessments)) {
        aggregated.assessments[k] = (aggregated.assessments[k] || 0) + Number(v || 0);
      }
    }

    // Include admin-edited leader performance values in the aggregated totals as well
    if (adminLeaderPerf) {
      try {
        const sheets = Object.fromEntries(adminLeaderPerf.sheets || new Map());
        const meetings = Object.fromEntries(adminLeaderPerf.meetings || new Map());
        const requests = Object.fromEntries(adminLeaderPerf.requests || new Map());
        const assessments = Object.fromEntries(adminLeaderPerf.assessments || new Map());

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
      } catch (e) {
        // ignore
      }
    }

    // --- Compute leads/deals from Lead collection (read-only) ---
    try {
      const memberIdStrings = teamMembers.map((m) => String(m._id));
      // include leader in the member list to capture leader-assigned leads too
      if (team.leader) memberIdStrings.push(String(team.leader));

      const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

      const teamLeads = await Lead.find({
        assignedTo: { $in: memberIdStrings },
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const leadsByUser = new Map<string, { leadsCount: number; dealsCount: number }>();
      for (const l of teamLeads) {
        const assignee = String((l as any).assignedTo || '');
        if (!assignee) continue;
        const cur = leadsByUser.get(assignee) || { leadsCount: 0, dealsCount: 0 };
        cur.leadsCount += 1;
        if ((l as any).status === 'closed') cur.dealsCount += 1;
        leadsByUser.set(assignee, cur);
      }

      // Attach to teamData rows
      for (const row of teamData) {
        const id = String(row.userId);
        const stats = leadsByUser.get(id) || { leadsCount: 0, dealsCount: 0 };
        row.leadsCount = stats.leadsCount;
        row.dealsCount = stats.dealsCount;
        aggregated.aggregatedLeads += stats.leadsCount;
        aggregated.aggregatedDeals += stats.dealsCount;
      }

      // Attach leader personal counts if present
      if (leaderPersonal) {
        const leaderIdStr = String(team.leader);
        const leaderStats = leadsByUser.get(leaderIdStr) || { leadsCount: 0, dealsCount: 0 };
        (leaderPersonal as any).leaderOwnLeads = leaderStats.leadsCount;
        (leaderPersonal as any).leaderOwnDeals = leaderStats.dealsCount;
      }
      // Ensure leader's own leads/deals are included in aggregated totals
      try {
        const leaderIdStr = String(team.leader);
        const leaderStats = leadsByUser.get(leaderIdStr) || { leadsCount: 0, dealsCount: 0 };
        aggregated.aggregatedLeads += leaderStats.leadsCount;
        aggregated.aggregatedDeals += leaderStats.dealsCount;
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore and keep zeros
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
