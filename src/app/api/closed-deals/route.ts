import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verify(token, JWT_SECRET);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // format YYYY-MM
    const userId = searchParams.get('userId');
    const employeeId = searchParams.get('employeeId');
    const leadId = searchParams.get('leadId');
    const dealId = searchParams.get('dealId');

    const query: any = {};
    if (userId) query.userId = userId;
    if (employeeId) query.assignedTo = employeeId;
    if (leadId) query.leadId = leadId;
    if (dealId) query.dealId = dealId;

    if (month) {
      const parts = month.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    const snapshots = await ClosedDealSnapshot.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ snapshots }, { status: 200 });
  } catch (error) {
    console.error('Error fetching closed deals:', error);
    return NextResponse.json({ error: 'Failed to fetch closed deals' }, { status: 500 });
  }
}
