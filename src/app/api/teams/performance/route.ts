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

function validateDayKeys(data: Record<string, any> | undefined, currentDay: number): boolean {
  if (!data) return true;
  
  const expectedKey = `day${currentDay}`;
  const allowedKeys = [expectedKey];
  
  for (const key in data) {
    if (!allowedKeys.includes(key)) {
      return false;
    }
  }
  
  return true;
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

    // Fetch team members, performances, KPI settings and leader user in parallel
    // Use `team.members` and `team.leader` to scope performance query without waiting for user docs
    // Build a list of member IDs excluding the leader to avoid duplicate rows
    const memberIds: string[] = Array.isArray(team.members)
      ? (team.members as any[]).map((id) => String(id)).filter((id) => String(id) !== String(team.leader))
      : [];
    const perfUserIds = [...memberIds, String(team.leader)];

    const [teamMembers, performances, teamLeaderSettings, leaderUser] = await Promise.all([
      User.find({ _id: { $in: memberIds }, role: 'sales' }).select('_id name'),
      // note: we deliberately omit teamId here. the unique constraint on
      // TeamPerformance is only {userId, month}, so a record created under a
      // previous team would be skipped if we required a matching teamId. by
      // querying only by month and user list we ensure the row is returned and
      // the POST logic (which updates teamId) will correct it on the first
      // edit.
      TeamPerformance.find({ month: month, userId: { $in: perfUserIds } }),
      KPISetting.findOne({ scope: 'team-leader' }),
      User.findById(team.leader),
    ]);

    // Create a map of performance data
    const performanceMap = new Map(performances.map((p) => [p.userId.toString(), p]));

    // Get number of days in the month
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();

    // Build response with all team members, creating empty records if needed
    const teamData = teamMembers.map((member) => {
      const performance = performanceMap.get(member._id.toString());

      if (performance) {
        return {
          _id: performance._id,
          userId: member._id,
          name: member.name,
          teamId: team._id,
          month: month,
          daysInMonth,
          // only include the days actually recorded in the map
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
        sheets: {},
        assessments: {},
        meetings: {},
        requests: {},
        editedByAdmin: false,
      };
    });

    // Build aggregated totals for the team leader: sum of leader's own entries + all team members + any admin-added values
    // Aggregated object will accumulate only actual numbers; leave empty initially
    // `teamLeaderSettings` and `leaderUser` were fetched above in parallel
    const aggregationConfig = teamLeaderSettings ? getAggregationConfig(teamLeaderSettings.indicators) : {};
    const aggregated = {
      userId: team.leader,
      name: leaderUser?.name || 'Team Total',
      teamId: team._id,
      month: month,
      daysInMonth,
      sheets: {},
      assessments: {},
      meetings: {},
      requests: {},
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
          // include any admin locks computed by the shared calculator
          adminLocks: calcResult.adminLocks || {
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

      // Build lead and snap queries, then run them in parallel to reduce latency
      const leadQuery = leadsIncludeTeam
        ? { assignedTo: { $in: memberObjectIds }, createdAt: { $gte: monthStart, $lte: monthEnd } }
        : { assignedTo: team.leader, createdAt: { $gte: monthStart, $lte: monthEnd } };

      const snapQuery: any = dealsIncludeTeam
        ? {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            $or: [{ assignedTo: { $in: memberObjectIds } }, { userId: { $in: memberObjectIds } }],
          }
        : {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            $or: [{ assignedTo: team.leader }, { userId: team.leader }],
          };

      const [teamLeads, snaps] = await Promise.all([
        Lead.find(leadQuery),
        ClosedDealSnapshot.find(snapQuery).lean(),
      ]);

      // Build lead status map to filter snapshots correctly (same as Employees page)
      const leadStatusMap = new Map<string, string>();
      teamLeads.forEach((lead: any) => {
        leadStatusMap.set(String(lead._id), lead.status);
      });

      const leadsByUser = new Map<string, { leadsCount: number }>();
      for (const l of teamLeads) {
        const assignee = String((l as any).assignedTo || '');
        if (!assignee) continue;
        const cur = leadsByUser.get(assignee) || { leadsCount: 0 };
        cur.leadsCount += 1;
        leadsByUser.set(assignee, cur);
      }

      // Count deals per user - only count snapshots where the associated Lead has status = 'closed'
      // This matches the Employees page logic and prevents counting "closed_pending_approval"
      const dealsByUser = new Map<string, number>();
      for (const s of snaps) {
        const assigned = s.assignedTo ? String(s.assignedTo) : null;
        const userIdField = s.userId ? String(s.userId) : null;
        const key = assigned || userIdField;
        if (!key) continue;

        // Only count if lead status is 'closed' or if lead was deleted
        if (s.leadId) {
          const leadStatus = leadStatusMap.get(String(s.leadId));
          if (leadStatus === undefined) {
            // Lead was deleted, preserve the deal
            dealsByUser.set(key, (dealsByUser.get(key) || 0) + 1);
          } else if (leadStatus === 'closed') {
            // Lead is closed, count it
            dealsByUser.set(key, (dealsByUser.get(key) || 0) + 1);
          }
          // Otherwise skip it (e.g., closed_pending_approval, lost, etc.)
        } else {
          // No leadId, preserve the deal
          dealsByUser.set(key, (dealsByUser.get(key) || 0) + 1);
        }
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
        // also include leader's own counts
        const leaderIdStr = String(team.leader);
        const leaderLeadStats = leadsByUser.get(leaderIdStr) || { leadsCount: 0 };
        const leaderDeals = dealsByUser.get(leaderIdStr) || 0;
        aggregated.aggregatedLeads += leaderLeadStats.leadsCount;
        aggregated.aggregatedDeals += leaderDeals;
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


      // Only today's values will be persisted. Frontend may send full objects
      // (for convenience) — sanitize and write only `day${currentDay}` keys.
      const currentDay = now.getDate();
      const dayKey = `day${currentDay}`;

      const getDayValue = (obj: Record<string, any> | undefined) => {
        if (!obj) return undefined;
        return Object.prototype.hasOwnProperty.call(obj, dayKey) ? obj[dayKey] : undefined;
      };

      const sheetValue = getDayValue(sheets);
      const assessmentsValue = getDayValue(assessments);
      const meetingsValue = getDayValue(meetings);
      const requestsValue = getDayValue(requests);

      // If the caller sent metric objects but none include today's key, reject
      const sentAnyMetric = !!(sheets || assessments || meetings || requests);
      if (sentAnyMetric && sheetValue === undefined && assessmentsValue === undefined && meetingsValue === undefined && requestsValue === undefined) {
        return NextResponse.json(
          { error: `Request must include today's key (${dayKey}) for at least one metric.` },
          { status: 400 }
        );
      }
    // Verify the target user is in the team or is the leader
    const targetUser = await User.findById(userId);
    // make sure we handle cases where `team.members` might be undefined (e.g. new team or removed team)
    const isMember = Array.isArray(team.members) && team.members.some((m: any) => String(m) === String(targetUser?._id));
    if (!targetUser || (!isMember && !team.leader.equals(targetUser._id))) {
      // log for debugging: this usually means the member list wasn’t kept in sync
      console.warn('Team performance update rejected: user not in team', {
        teamId: team._id,
        userId,
        members: team.members,
      });
      return NextResponse.json({ error: 'User not in your team' }, { status: 403 });
    }

    // Also check if admin has locked today for this user by looking at TeamLeaderPerformance
    const adminLeaderPerf = await TeamLeaderPerformance.findOne({ userId, month });
    if (adminLeaderPerf && adminLeaderPerf.adminLocks) {
      const locks = adminLeaderPerf.adminLocks;
      // if any of the metrics being updated today is locked, reject
      if ((sheetValue !== undefined && locks.sheets && locks.sheets[dayKey]) ||
          (assessmentsValue !== undefined && locks.assessments && locks.assessments[dayKey]) ||
          (meetingsValue !== undefined && locks.meetings && locks.meetings[dayKey]) ||
          (requestsValue !== undefined && locks.requests && locks.requests[dayKey])) {
        return NextResponse.json(
          { error: 'This data was edited by admin and cannot be modified' },
          { status: 403 }
        );
      }
    }

    // Check if existing performance data was edited by admin - if so, prevent team leader from modifying
    const existingPerformance = await TeamPerformance.findOne({
      userId,
      teamId: team._id,
      month,
    });

    if (existingPerformance) {
      const edited = existingPerformance.editedByAdmin;
      if (edited === true) {
        return NextResponse.json(
          { error: 'This data was edited by admin and cannot be modified by team members' },
          { status: 403 }
        );
      }

      if (edited && typeof edited === 'object') {
        const attemptingToEditSheets = !!sheets;
        const attemptingToEditAssessments = !!assessments;
        const attemptingToEditMeetings = !!meetings;
        const attemptingToEditRequests = !!requests;

        if (
          (attemptingToEditSheets && edited.sheets) ||
          (attemptingToEditAssessments && edited.assessments) ||
          (attemptingToEditMeetings && edited.meetings) ||
          (attemptingToEditRequests && edited.requests)
        ) {
          return NextResponse.json(
            { error: 'This data was edited by admin and cannot be modified by team members' },
            { status: 403 }
          );
        }
      }
    }

    // Persist only today's keys to avoid overwriting historical data.
    const updateOps: any = {};
    if (sheetValue !== undefined) updateOps[`sheets.${dayKey}`] = sheetValue;
    if (assessmentsValue !== undefined) updateOps[`assessments.${dayKey}`] = assessmentsValue;
    if (meetingsValue !== undefined) updateOps[`meetings.${dayKey}`] = meetingsValue;
    if (requestsValue !== undefined) updateOps[`requests.${dayKey}`] = requestsValue;

    // always keep the teamId up to date so GET queries will see this record
    updateOps.teamId = team._id;

    // Ensure required identifying fields exist on insert
    // teamId is already included in updateOps (which is applied even on
    // upsert), so we don't include it here to avoid conflicting-update
    // operator errors when $set and $setOnInsert both touch the same path.
    const setOnInsert: any = { userId, month };

    // NOTE: the unique index on TeamPerformance is only {userId, month},
    // so filtering by teamId can cause upsert to attempt an insert when a
    // document already exists for the same user/month but a different
    // team. that scenario happens when you move a user to a new team or
    // delete/recreate a team. if the query doesn’t match the old row, mongo
    // will try to create a duplicate and throw a 11000 error (seen in logs).
    // to avoid the race we match only on userId+month and let the update
    // body overwrite the teamId.
    const filter: any = { userId, month };

    let performance;
    if (Object.keys(updateOps).length > 0) {
      performance = await TeamPerformance.findOneAndUpdate(
        filter,
        { $set: updateOps, $setOnInsert: setOnInsert },
        { upsert: true, new: true }
      );
    } else {
      // Nothing to update (shouldn't happen because of earlier check), but return existing or created doc
      performance = await TeamPerformance.findOneAndUpdate(
        filter,
        { $setOnInsert: setOnInsert },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    console.error('Error updating team performance:', error);
    return NextResponse.json({ error: 'Failed to update team performance' }, { status: 500 });
  }
}
