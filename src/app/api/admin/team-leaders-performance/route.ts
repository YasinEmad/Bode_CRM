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
      editedByAdmin: perf!.editedByAdmin,
      adminLocks: perf!.adminLocks,
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
      return NextResponse.json({ error: 'Missing required fields: userId and month are required' }, { status: 400 });
    }

    // Verify the user is actually a team leader
    const team = await Team.findOne({ leader: userId });
    if (!team) {
      return NextResponse.json({ error: 'User is not a team leader' }, { status: 403 });
    }

    // Find existing performance so we can merge adminLocks and diff values
    const existing = await TeamLeaderPerformance.findOne({ userId, month });
    const existingPlain = existing ? existing.toObject() : null;

    // Build adminLocks object - tracks per-day admin edits
    let adminLocksObj: any = {
      sheets: {},
      assessments: {},
      meetings: {},
      requests: {},
    };
    if (existingPlain?.adminLocks && typeof existingPlain.adminLocks === 'object') {
      adminLocksObj = JSON.parse(JSON.stringify(existingPlain.adminLocks));
    }

    // We'll accumulate only those metric updates where the admin actually changed a value
    const changedSheets: Record<string, any> = {};
    const changedAssessments: Record<string, any> = {};
    const changedMeetings: Record<string, any> = {};
    const changedRequests: Record<string, any> = {};

    const markChanged = (
      dataObj: any,
      existingObj: any,
      dest: Record<string, any>,
      lockObj: Record<string, boolean>
    ) => {
      if (dataObj && typeof dataObj === 'object') {
        for (const day of Object.keys(dataObj)) {
          const newVal = dataObj[day];
          const oldVal = existingObj?.[day];

          // if there is a previous value, lock when it differs
          if (oldVal !== undefined) {
            if (oldVal !== newVal) {
              dest[day] = newVal;
              lockObj[day] = true;
            }
          } else {
            // no previous value; only treat as a change if admin provided a
            // non-zero metric. the front-end sends a full zero-filled map as a
            // convenience, which should *not* lock every day.
            if (newVal !== 0) {
              dest[day] = newVal;
              lockObj[day] = true;
            }
          }
        }
      }
    };

    markChanged(sheets, existingPlain?.sheets, changedSheets, adminLocksObj.sheets);
    markChanged(assessments, existingPlain?.assessments, changedAssessments, adminLocksObj.assessments);
    markChanged(meetings, existingPlain?.meetings, changedMeetings, adminLocksObj.meetings);
    markChanged(requests, existingPlain?.requests, changedRequests, adminLocksObj.requests);

    const sheetsData = Object.keys(changedSheets).length ? changedSheets : undefined;
    const assessmentsData = Object.keys(changedAssessments).length ? changedAssessments : undefined;
    const meetingsData = Object.keys(changedMeetings).length ? changedMeetings : undefined;
    const requestsData = Object.keys(changedRequests).length ? changedRequests : undefined;
    const adminLocksData = JSON.parse(JSON.stringify(adminLocksObj));

    // Prepare update object using $set to let Mongoose handle the conversion
    const updateObj: any = {
      $set: {
        userId,
        month,
        adminLocks: adminLocksData,
      },
    };

    // Add only the fields that are being updated (day-level)
    if (sheetsData) {
      for (const [day, val] of Object.entries(sheetsData)) {
        updateObj.$set[`sheets.${day}`] = val;
      }
    }
    if (assessmentsData) {
      for (const [day, val] of Object.entries(assessmentsData)) {
        updateObj.$set[`assessments.${day}`] = val;
      }
    }
    if (meetingsData) {
      for (const [day, val] of Object.entries(meetingsData)) {
        updateObj.$set[`meetings.${day}`] = val;
      }
    }
    if (requestsData) {
      for (const [day, val] of Object.entries(requestsData)) {
        updateObj.$set[`requests.${day}`] = val;
      }
    }

    // Upsert performance record
    const performance = await TeamLeaderPerformance.findOneAndUpdate(
      { userId, month },
      updateObj,
      { upsert: true, new: true }
    );

    if (!performance) {
      return NextResponse.json({ error: 'Failed to save performance record' }, { status: 500 });
    }

    return NextResponse.json({ performance }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating team leader performance:', errorMessage);
    return NextResponse.json(
      { error: `Failed to update team leader performance: ${errorMessage}` },
      { status: 500 }
    );
  }
}
