/**
 * Unified calculator for Team Leader performance data
 * This ensures all pages use the same calculation logic
 */

import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import TeamPerformance from '@/models/TeamPerformance';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import Team from '@/models/Team';
import User from '@/models/User';
import { getAggregationConfig, shouldIncludeTeamData } from '@/lib/kpiCalculator';
import KPISetting from '@/models/KPISetting';
import mongoose from 'mongoose';

function convertMongoMapToBoolean(data: any): Record<string, boolean> {
  if (!data) return {};
  if (data instanceof Map) {
    const result: Record<string, boolean> = {};
    for (const [key, value] of data) {
      result[key] = Boolean(value);
    }
    return result;
  }
  // If it's already a plain object, convert values to boolean
  if (typeof data === 'object') {
    const result: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = Boolean(value);
    }
    return result;
  }
  return {};
}

function convertMongoMapToObject(data: any): Record<string, number> {
  if (!data) return {};
  if (data instanceof Map) {
    return Object.fromEntries(data);
  }
  return typeof data === 'object' ? data : {};
}

export interface LeaderPerformanceData {
  userId: string;
  leaderName: string;
  month: string;
  daysInMonth: number;
  // Leader's personal data (what admin set or what leader set)
  leaderPersonal: {
    sheets: Record<string, number>;
    assessments: Record<string, number>;
    meetings: Record<string, number>;
    requests: Record<string, number>;
  };
  // Aggregated data (leader + team members, if applicable)
  aggregated: {
    sheets: Record<string, number>;
    assessments: Record<string, number>;
    meetings: Record<string, number>;
    requests: Record<string, number>;
    aggregatedLeads: number;
    aggregatedDeals: number;
    leaderLeads: number;
    leaderDeals: number;
  };
  // Counters for UI
  leaderOwnLeads: number;
  leaderOwnDeals: number;
  teamLeadsCount: number;
  teamDealsCount: number;
  editedByAdmin?: boolean | Record<string, boolean>; // Flag or per-category flags indicating admin edits (legacy)
  adminLocks?: {
    sheets: Record<string, boolean>;
    assessments: Record<string, boolean>;
    meetings: Record<string, boolean>;
    requests: Record<string, boolean>;
  }; // Per-day admin locks
}

/**
 * Calculate Team Leader performance data from all sources
 * This is the SINGLE SOURCE OF TRUTH for leader calculation logic
 */
export async function calculateTeamLeaderPerformance(
  leaderId: string,
  month: string
): Promise<LeaderPerformanceData | null> {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Create empty day buckets
  const emptyDays: Record<string, number> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    emptyDays[`day${i}`] = 0;
  }

  // 1. Fetch leader info
  const leaderUser = await User.findById(leaderId);
  if (!leaderUser) return null;

  // 2. Fetch team to validate leadership
  const team = await Team.findOne({ leader: leaderId });
  if (!team) return null;

  // 3. Fetch TeamLeaderPerformance (SINGLE SOURCE: admin edits)
  const adminLeaderPerf = await TeamLeaderPerformance.findOne({ userId: leaderId, month });

  // 4. Fetch TeamPerformance for leader (in case they saved from team-report)
  const teamLeaderPerf = await TeamPerformance.findOne({
    userId: leaderId,
    teamId: team._id,
    month,
  });

  // Build leaderPersonal by merging sources (admin has priority)
  let leaderPersonalSheets = { ...emptyDays };
  let leaderPersonalAssessments = { ...emptyDays };
  let leaderPersonalMeetings = { ...emptyDays };
  let leaderPersonalRequests = { ...emptyDays };

  // First, merge from TeamPerformance if it exists (leader's own edits from team-report)
  if (teamLeaderPerf) {
    const sheets = convertMongoMapToObject(teamLeaderPerf.sheets);
    const assessments = convertMongoMapToObject(teamLeaderPerf.assessments);
    const meetings = convertMongoMapToObject(teamLeaderPerf.meetings);
    const requests = convertMongoMapToObject(teamLeaderPerf.requests);

    leaderPersonalSheets = { ...emptyDays, ...sheets };
    leaderPersonalAssessments = { ...emptyDays, ...assessments };
    leaderPersonalMeetings = { ...emptyDays, ...meetings };
    leaderPersonalRequests = { ...emptyDays, ...requests };
  }

  // Then, override with TeamLeaderPerformance if it exists (admin edits override)
  // Admin edits have priority over leader's own edits, but only for days
  // that admin actually locked/edited. This prevents legacy zeros from
  // overwriting the leader's own entries.
  if (adminLeaderPerf) {
    const sheets = convertMongoMapToObject(adminLeaderPerf.sheets);
    const assessments = convertMongoMapToObject(adminLeaderPerf.assessments);
    const meetings = convertMongoMapToObject(adminLeaderPerf.meetings);
    const requests = convertMongoMapToObject(adminLeaderPerf.requests);

    const locks = (adminLeaderPerf as any).adminLocks || {};
    const lockSheets = convertMongoMapToBoolean(locks.sheets) || {};
    const lockAssess = convertMongoMapToBoolean(locks.assessments) || {};
    const lockMeet = convertMongoMapToBoolean(locks.meetings) || {};
    const lockReq = convertMongoMapToBoolean(locks.requests) || {};

    for (const [k, v] of Object.entries(sheets)) {
      if (lockSheets[k]) leaderPersonalSheets[k] = Number(v) || 0;
    }
    for (const [k, v] of Object.entries(assessments)) {
      if (lockAssess[k]) leaderPersonalAssessments[k] = Number(v) || 0;
    }
    for (const [k, v] of Object.entries(meetings)) {
      if (lockMeet[k]) leaderPersonalMeetings[k] = Number(v) || 0;
    }
    for (const [k, v] of Object.entries(requests)) {
      if (lockReq[k]) leaderPersonalRequests[k] = Number(v) || 0;
    }
  }

  // 5. Get aggregation config from KPI settings
  const teamLeaderSettings = await KPISetting.findOne({ scope: 'team-leader' });
  const aggregationConfig = teamLeaderSettings ? getAggregationConfig(teamLeaderSettings.indicators) : {};

  const sheetsIncludeTeam = shouldIncludeTeamData('sheets', aggregationConfig);
  const assessmentsIncludeTeam = shouldIncludeTeamData('assessments', aggregationConfig);
  const meetingsIncludeTeam = shouldIncludeTeamData('meetings', aggregationConfig);
  const requestsIncludeTeam = shouldIncludeTeamData('requests', aggregationConfig);
  const leadsIncludeTeam = shouldIncludeTeamData('leads', aggregationConfig);
  const dealsIncludeTeam = shouldIncludeTeamData('deals', aggregationConfig);

  // 6. Build aggregated totals
  let aggregatedSheets = { ...emptyDays };
  let aggregatedAssessments = { ...emptyDays };
  let aggregatedMeetings = { ...emptyDays };
  let aggregatedRequests = { ...emptyDays };

  // Start with leader personal data
  aggregatedSheets = { ...leaderPersonalSheets };
  aggregatedAssessments = { ...leaderPersonalAssessments };
  aggregatedMeetings = { ...leaderPersonalMeetings };
  aggregatedRequests = { ...leaderPersonalRequests };

  // 7. If aggregation includes team, add team members' data
  if (sheetsIncludeTeam || assessmentsIncludeTeam || meetingsIncludeTeam || requestsIncludeTeam) {
    const teamPerformances = await TeamPerformance.find({
      teamId: team._id,
      month,
      userId: { $ne: leaderId }, // Exclude leader (already included)
    });

    for (const perf of teamPerformances) {
      if (sheetsIncludeTeam) {
        const sheets = convertMongoMapToObject(perf.sheets);
        for (const [k, v] of Object.entries(sheets)) {
          aggregatedSheets[k] = (aggregatedSheets[k] || 0) + Number(v || 0);
        }
      }

      if (assessmentsIncludeTeam) {
        const assessments = convertMongoMapToObject(perf.assessments);
        for (const [k, v] of Object.entries(assessments)) {
          aggregatedAssessments[k] = (aggregatedAssessments[k] || 0) + Number(v || 0);
        }
      }

      if (meetingsIncludeTeam) {
        const meetings = convertMongoMapToObject(perf.meetings);
        for (const [k, v] of Object.entries(meetings)) {
          aggregatedMeetings[k] = (aggregatedMeetings[k] || 0) + Number(v || 0);
        }
      }

      if (requestsIncludeTeam) {
        const requests = convertMongoMapToObject(perf.requests);
        for (const [k, v] of Object.entries(requests)) {
          aggregatedRequests[k] = (aggregatedRequests[k] || 0) + Number(v || 0);
        }
      }
    }
  }

  // 8. Calculate leads and deals
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

  let aggregatedLeads = 0;
  let leaderLeads = 0;
  let aggregatedDeals = 0;
  let leaderDeals = 0;

  try {
    // Convert team members to ObjectIds for proper MongoDB query matching
    const memberIds = Array.isArray(team.members) 
      ? team.members.map((m: any) => {
          try {
            return new mongoose.Types.ObjectId(String(m));
          } catch {
            return null;
          }
        }).filter((id: any) => id !== null)
      : [];
    
    // Add leader as ObjectId
    try {
      memberIds.push(new mongoose.Types.ObjectId(String(leaderId)));
    } catch {
      // If conversion fails, push as string (fallback)
      memberIds.push(String(leaderId));
    }

    if (leadsIncludeTeam) {
      // Include all team members
      const teamLeads = await Lead.find({
        assignedTo: { $in: memberIds },
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      aggregatedLeads = teamLeads.length;
      leaderLeads = teamLeads.filter((l: any) => String(l.assignedTo) === String(leaderId)).length;
    } else {
      // Only leader
      const leaderLeadsData = await Lead.find({
        assignedTo: leaderId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      aggregatedLeads = leaderLeadsData.length;
      leaderLeads = leaderLeadsData.length;
    }

    // Build a map of lead IDs to their status for filtering snapshots
    // Only count deals where the associated Lead has status = 'closed'
    const leadStatusMap = new Map<string, string>();
    const allLeads = await Lead.find({ createdAt: { $gte: monthStart, $lte: monthEnd } });
    allLeads.forEach((lead: any) => {
      leadStatusMap.set(String(lead._id), lead.status);
    });

    if (dealsIncludeTeam) {
      const dealsQuery: any = {
        createdAt: { $gte: monthStart, $lte: monthEnd },
        $or: [{ assignedTo: { $in: memberIds } }, { userId: { $in: memberIds } }],
      };
      const snapshots = await ClosedDealSnapshot.find(dealsQuery).lean();
      // Filter snapshots to only count those with associated Lead status = 'closed'
      // If Lead was deleted (not in leadStatusMap), preserve the deal (same as employees)
      aggregatedDeals = snapshots.filter((snap: any) => {
        if (!snap.leadId) return true; // If no leadId, include it (preserved history)
        const leadStatus = leadStatusMap.get(String(snap.leadId));
        if (leadStatus === undefined) return true; // Lead was deleted, preserve the deal
        return leadStatus === 'closed';
      }).length;

      const leaderDealsQuery: any = {
        createdAt: { $gte: monthStart, $lte: monthEnd },
        $or: [{ assignedTo: leaderId }, { userId: leaderId }],
      };
      const leaderSnapshots = await ClosedDealSnapshot.find(leaderDealsQuery).lean();
      // Filter leader snapshots to only count those with associated Lead status = 'closed'
      // If Lead was deleted (not in leadStatusMap), preserve the deal (same as employees)
      leaderDeals = leaderSnapshots.filter((snap: any) => {
        if (!snap.leadId) return true; // If no leadId, include it (preserved history)
        const leadStatus = leadStatusMap.get(String(snap.leadId));
        if (leadStatus === undefined) return true; // Lead was deleted, preserve the deal
        return leadStatus === 'closed';
      }).length;
    } else {
      const leaderDealsQuery: any = {
        createdAt: { $gte: monthStart, $lte: monthEnd },
        $or: [{ assignedTo: leaderId }, { userId: leaderId }],
      };
      const leaderSnapshots = await ClosedDealSnapshot.find(leaderDealsQuery).lean();
      // Filter leader snapshots to only count those with associated Lead status = 'closed'
      // If Lead was deleted (not in leadStatusMap), preserve the deal (same as employees)
      const filteredLeaderDeals = leaderSnapshots.filter((snap: any) => {
        if (!snap.leadId) return true; // If no leadId, include it (preserved history)
        const leadStatus = leadStatusMap.get(String(snap.leadId));
        if (leadStatus === undefined) return true; // Lead was deleted, preserve the deal
        return leadStatus === 'closed';
      }).length;
      aggregatedDeals = filteredLeaderDeals;
      leaderDeals = filteredLeaderDeals;
    }
  } catch (e) {
    console.error('Error calculating leads/deals:', e);
  }

  return {
    userId: String(leaderId),
    leaderName: leaderUser.name || '',
    month,
    daysInMonth,
    leaderPersonal: {
      sheets: leaderPersonalSheets,
      assessments: leaderPersonalAssessments,
      meetings: leaderPersonalMeetings,
      requests: leaderPersonalRequests,
    },
    aggregated: {
      sheets: aggregatedSheets,
      assessments: aggregatedAssessments,
      meetings: aggregatedMeetings,
      requests: aggregatedRequests,
      aggregatedLeads,
      aggregatedDeals,
      leaderLeads,
      leaderDeals,
    },
    leaderOwnLeads: leaderLeads,
    leaderOwnDeals: leaderDeals,
    teamLeadsCount: aggregatedLeads,
    teamDealsCount: aggregatedDeals,
    editedByAdmin: (() => {
      if (!adminLeaderPerf) return false;
      const existing = (adminLeaderPerf as any).editedByAdmin;
      if (existing === true) {
        return { sheets: true, assessments: true, meetings: true, requests: true };
      }
      if (existing && typeof existing === 'object') return existing;
      // Legacy: adminLeaderPerf exists but no flags - treat as all-true
      return { sheets: true, assessments: true, meetings: true, requests: true };
    })(),
    adminLocks: (() => {
      // We want locks to reflect *actual* admin edits. Legacy bug may have
      // populated every day with `true` because the frontend sent a zeros map.
      // Filter out any locked day where the corresponding leaderPersonal value
      // is still zero (i.e. admin never really edited it).
      const result = {
        sheets: {} as Record<string, boolean>,
        assessments: {} as Record<string, boolean>,
        meetings: {} as Record<string, boolean>,
        requests: {} as Record<string, boolean>,
      };

      if (adminLeaderPerf && adminLeaderPerf.adminLocks && typeof adminLeaderPerf.adminLocks === 'object') {
        const locks = adminLeaderPerf.adminLocks as any;
        const sheetMap = convertMongoMapToBoolean(locks.sheets) || {};
        const assessMap = convertMongoMapToBoolean(locks.assessments) || {};
        const meetMap = convertMongoMapToBoolean(locks.meetings) || {};
        const reqMap = convertMongoMapToBoolean(locks.requests) || {};

        for (const [day, locked] of Object.entries(sheetMap)) {
          if (locked && (leaderPersonalSheets[day] || 0) !== 0) {
            result.sheets[day] = true;
          }
        }
        for (const [day, locked] of Object.entries(assessMap)) {
          if (locked && (leaderPersonalAssessments[day] || 0) !== 0) {
            result.assessments[day] = true;
          }
        }
        for (const [day, locked] of Object.entries(meetMap)) {
          if (locked && (leaderPersonalMeetings[day] || 0) !== 0) {
            result.meetings[day] = true;
          }
        }
        for (const [day, locked] of Object.entries(reqMap)) {
          if (locked && (leaderPersonalRequests[day] || 0) !== 0) {
            result.requests[day] = true;
          }
        }
      }

      return result;
    })(),
  };
}
