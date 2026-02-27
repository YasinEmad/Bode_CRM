import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import Attendance from '@/models/Attendance';
import TeamPerformance from '@/models/TeamPerformance';
import KPISetting from '@/models/KPISetting';
import { calculateEmployeeKPI, getAggregationConfig, shouldIncludeTeamData } from '@/lib/kpiCalculator';
import { calculateTeamLeaderPerformance } from '@/lib/teamLeaderDataCalculator';
import { countWorkdaysInMonth } from '@/lib/workdays';
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

    const month = req.nextUrl.searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // determine date range for queries
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    endDate.setHours(23, 59, 59, 999);

    // 1. leads and deals
    let leadsCount = 0;
    let dealsCount = 0;

    try {
      // count leads created in the window assigned to the user
      leadsCount = await Lead.countDocuments({
        assignedTo: user._id,
        createdAt: { $gte: startDate, $lte: endDate },
      });

      // build map of lead statuses (needed to emulate monthly report filtering)
      const leadStatusDocs = await Lead.find({ createdAt: { $gte: startDate, $lte: endDate } }).select('status');
      const leadStatusById = new Map<string, string>();
      leadStatusDocs.forEach((l) => {
        if (l._id) {
          leadStatusById.set(String(l._id), l.status || '');
        }
      });

      // get snapshots for this user (as owner or assigned)
      const snaps = await ClosedDealSnapshot.find({
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [{ userId: user._id }, { assignedTo: user._id }],
      }).lean();

      dealsCount = snaps.filter((snap: any) => {
        if (snap.leadId) {
          const status = leadStatusById.get(String(snap.leadId));
          if (status && status !== 'closed') {
            return false;
          }
        }
        return true;
      }).length;
    } catch (e) {
      console.error('Error calculating leads/deals for personal report', e);
    }

    // 2. attendance
    let attendancePercentage = 0;
    try {
      const records = await Attendance.find({
        userId: user._id,
        date: { $gte: startDate, $lte: endDate },
      });
      const presentDays = records.length;
      const daysInMonth = countWorkdaysInMonth(year, monthNum - 1);
      if (daysInMonth > 0) {
        attendancePercentage = Math.round((presentDays / daysInMonth) * 100);
      }
    } catch (e) {
      console.error('Error calculating attendance for personal report', e);
    }

    // 3. performance (sheets/meetings/assessments/requests)
    let sheetsCount = 0;
    let meetingsCount = 0;
    let assessmentsCount = 0;
    let requestsCount = 0;

    // will hold the result of leader calculator if user happens to be a team leader
    let leaderCalcResult: any = null;

    try {
      // attempt to calculate team leader performance - returns null when not a leader
      leaderCalcResult = await calculateTeamLeaderPerformance(String(user._id), month);
      if (leaderCalcResult) {
        // When user is a team leader, respect team-leader KPI aggregationMode
        // per-indicator (leader-only vs leader+team). Use aggregated totals
        // when configured, otherwise use leader's personal totals.
        const teamLeaderSetting = await KPISetting.findOne({ scope: 'team-leader' });
        const aggregationConfig = teamLeaderSetting ? getAggregationConfig(teamLeaderSetting.indicators) : {};

        const sheetsIncludeTeam = shouldIncludeTeamData('sheets', aggregationConfig);
        const meetingsIncludeTeam = shouldIncludeTeamData('meetings', aggregationConfig);
        const assessmentsIncludeTeam = shouldIncludeTeamData('assessments', aggregationConfig);
        const requestsIncludeTeam = shouldIncludeTeamData('requests', aggregationConfig);

        const sumDays = (obj: any) => Object.values(obj || {}).reduce((s: number, v: any) => s + (Number(v) || 0), 0);

        const personalSheets = sumDays(leaderCalcResult.leaderPersonal.sheets);
        const personalMeetings = sumDays(leaderCalcResult.leaderPersonal.meetings);
        const personalAssessments = sumDays(leaderCalcResult.leaderPersonal.assessments);
        const personalRequests = sumDays(leaderCalcResult.leaderPersonal.requests);

        const aggSheets = leaderCalcResult.aggregated ? sumDays(leaderCalcResult.aggregated.sheets) : personalSheets;
        const aggMeetings = leaderCalcResult.aggregated ? sumDays(leaderCalcResult.aggregated.meetings) : personalMeetings;
        const aggAssessments = leaderCalcResult.aggregated ? sumDays(leaderCalcResult.aggregated.assessments) : personalAssessments;
        const aggRequests = leaderCalcResult.aggregated ? sumDays(leaderCalcResult.aggregated.requests) : personalRequests;

        sheetsCount = sheetsIncludeTeam ? aggSheets : personalSheets;
        meetingsCount = meetingsIncludeTeam ? aggMeetings : personalMeetings;
        assessmentsCount = assessmentsIncludeTeam ? aggAssessments : personalAssessments;
        requestsCount = requestsIncludeTeam ? aggRequests : personalRequests;

        // use aggregated numbers for leads/deals just like admin monthly report shows
        if (leaderCalcResult.aggregated) {
          leadsCount = leaderCalcResult.aggregated.aggregatedLeads;
          dealsCount = leaderCalcResult.aggregated.aggregatedDeals;
        }
      } else {
        // not a leader; query personal TeamPerformance document if it exists
        const personalPerf = await TeamPerformance.findOne({ userId: user._id, month });
        if (personalPerf) {
          const conv = (data: any): Record<string, number> => {
            if (!data) return {};
            if (data instanceof Map) return Object.fromEntries(data);
            return typeof data === 'object' ? data : {};
          };
          sheetsCount = Object.values(conv(personalPerf.sheets)).reduce((s, v) => s + (Number(v) || 0), 0);
          meetingsCount = Object.values(conv(personalPerf.meetings)).reduce((s, v) => s + (Number(v) || 0), 0);
          assessmentsCount = Object.values(conv(personalPerf.assessments)).reduce((s, v) => s + (Number(v) || 0), 0);
          requestsCount = Object.values(conv(personalPerf.requests)).reduce((s, v) => s + (Number(v) || 0), 0);
        }
      }
    } catch (e) {
      console.error('Error fetching performance for personal report', e);
    }

    // 4. KPI calculation
    let kpiPercentage = 0;
    let kpiBreakdown: any = null;

    try {
      const globalSetting = await KPISetting.findOne({ scope: 'global' });
      const teamLeaderSetting = await KPISetting.findOne({ scope: 'team-leader' });
      const isLeader = leaderCalcResult !== null;
      const indicatorsToUse =
        isLeader && teamLeaderSetting && teamLeaderSetting.indicators && teamLeaderSetting.indicators.length > 0
          ? teamLeaderSetting.indicators
          : globalSetting?.indicators || [];

      const metrics = {
        attendancePercentage,
        closedDealsCount: dealsCount,
        sheetsCount,
        meetingsCount,
        assessmentsCount,
        requestsCount,
      };
      const scores = calculateEmployeeKPI(metrics as any, indicatorsToUse as any);
      kpiPercentage = Math.round(scores.total * 10) / 10;
      kpiBreakdown = scores;
    } catch (e) {
      console.error('Error calculating KPI in personal report', e);
    }

    const result = {
      _id: String(user._id),
      name: user.name,
      position: user.position || '',
      salary: user.salary || 0,
      joinDate: user.joinDate,
      leadsCount,
      closedDealsCount: dealsCount,
      attendancePercentage,
      sheetsCount,
      meetingsCount,
      assessmentsCount,
      requestsCount,
      kpiPercentage,
      kpiBreakdown,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error in GET /api/reports/my-monthly', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}
