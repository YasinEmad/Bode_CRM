import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
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

    // Fetch user's own performance data for the given month
    const performance = await TeamPerformance.findOne({
      userId: payload.userId,
      month,
    });

    if (!performance) {
      // Try falling back to team leader performance (for users who are leaders)
      const leaderPerf = await TeamLeaderPerformance.findOne({ userId: payload.userId, month });
      if (leaderPerf) {
        const sheetsCount = (
          (leaderPerf.sheets?.week1 || 0) +
          (leaderPerf.sheets?.week2 || 0) +
          (leaderPerf.sheets?.week3 || 0) +
          (leaderPerf.sheets?.week4 || 0)
        );

        const meetingsCount = (
          (leaderPerf.meetings?.week1 || 0) +
          (leaderPerf.meetings?.week2 || 0) +
          (leaderPerf.meetings?.week3 || 0) +
          (leaderPerf.meetings?.week4 || 0)
        );

        const assessmentsCount = (
          (leaderPerf.assessments?.week1 || 0) +
          (leaderPerf.assessments?.week2 || 0) +
          (leaderPerf.assessments?.week3 || 0) +
          (leaderPerf.assessments?.week4 || 0)
        );

        const requestsCount = (
          (leaderPerf.requests?.week1 || 0) +
          (leaderPerf.requests?.week2 || 0) +
          (leaderPerf.requests?.week3 || 0) +
          (leaderPerf.requests?.week4 || 0)
        );

        return NextResponse.json({
          performance: { sheetsCount, meetingsCount, assessmentsCount, requestsCount },
        });
      }

      // Return default performance data if not found anywhere
      return NextResponse.json({
        performance: {
          sheetsCount: 0,
          meetingsCount: 0,
          assessmentsCount: 0,
          requestsCount: 0,
        },
      });
    }

    // Calculate total counts from weekly data
    const sheetsCount = (
      (performance.sheets?.week1 || 0) +
      (performance.sheets?.week2 || 0) +
      (performance.sheets?.week3 || 0) +
      (performance.sheets?.week4 || 0)
    );

    const meetingsCount = (
      (performance.meetings?.week1 || 0) +
      (performance.meetings?.week2 || 0) +
      (performance.meetings?.week3 || 0) +
      (performance.meetings?.week4 || 0)
    );

    const assessmentsCount = (
      (performance.assessments?.week1 || 0) +
      (performance.assessments?.week2 || 0) +
      (performance.assessments?.week3 || 0) +
      (performance.assessments?.week4 || 0)
    );

    const requestsCount = (
      (performance.requests?.week1 || 0) +
      (performance.requests?.week2 || 0) +
      (performance.requests?.week3 || 0) +
      (performance.requests?.week4 || 0)
    );

    return NextResponse.json({
      performance: {
        sheetsCount,
        meetingsCount,
        assessmentsCount,
        requestsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 });
  }
}
