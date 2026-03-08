import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

// Convert MongoDB Map to plain object - handles both Map instances and plain objects
function convertMapToObject(data: any): Record<string, number> {
  if (!data) return {};
  if (data instanceof Map) {
    return Object.fromEntries(data);
  }
  if (typeof data === 'object') {
    return data;
  }
  return {};
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

    // Fetch all team performances for the given month
    const performances = await TeamPerformance.find({ month }).populate(
      'userId',
      '_id name'
    );
    console.log(`📊 Team Performance API: month=${month}, found ${performances.length} records`);
    performances.forEach((p, i) => {
      console.log(`  ${i+1}. userId: ${p.userId ? (typeof p.userId === 'object' ? p.userId._id : p.userId) : 'null'}, sheets keys: ${Object.keys(p.sheets || {}).length}`);
    });

    // Attach leads/deals counts to each performance (read-only derived from Lead collection)
    try {
      const ids = performances.map((p: any) => String(p.userId?._id || p.userId));
      // Determine month range
      const [year, monthNum] = month.split('-');
      const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

      const leads = await Lead.find({
        assignedTo: { $in: ids },
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const leadsMap = new Map<string, { leadsCount: number; dealsCount: number }>();
      for (const l of leads) {
        const a = String((l as any).assignedTo || '');
        if (!a) continue;
        const cur = leadsMap.get(a) || { leadsCount: 0, dealsCount: 0 };
        cur.leadsCount += 1;
        if ((l as any).status === 'closed') cur.dealsCount += 1;
        leadsMap.set(a, cur);
      }

      const augmented = performances.map((p: any) => {
        const id = String(p.userId?._id || p.userId);
        const stats = leadsMap.get(id) || { leadsCount: 0, dealsCount: 0 };
        const obj = p.toObject();
        
        // Ensure all performance data is converted from Maps to plain objects
        return {
          ...obj,
          sheets: convertMapToObject(obj.sheets),
          meetings: convertMapToObject(obj.meetings),
          assessments: convertMapToObject(obj.assessments),
          requests: convertMapToObject(obj.requests),
          leadsCount: stats.leadsCount,
          dealsCount: stats.dealsCount,
        };
      });

      return NextResponse.json({ performances: augmented });
    } catch (e) {
      return NextResponse.json({ performances });
    }
  } catch (error) {
    console.error('Error fetching team performances:', error);
    return NextResponse.json({ error: 'Failed to fetch team performances' }, { status: 500 });
  }
}
