import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import DealClosing from '@/models/DealClosing';
import Lead from '@/models/Lead';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
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

    let query: any = {};

    // For sales users, return any commission document where they are listed as a recipient
    if (payload.role === 'sales') {
      query = { $or: [{ 'recipients.userId': payload.userId }, { employeeId: payload.userId }] };
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) {
      query.status = status;
    }

    const commissions = await Commission.find(query)
      // dealId refers to DealClosing and we want key client fields (include project, contractPrice and shared)
      .populate('dealId', 'clientName clientNumber developer project attachments info userId shared contractPrice')
      .populate('recipients.userId', 'name position')
      .populate('employeeId', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    // Attach salesVolume derived directly from deal.contractPrice for frontend convenience
    const commissionsWithSalesVolume = commissions.map((c: any) => {
      try {
        if (c.dealId && typeof c.dealId === 'object') {
          (c.dealId as any).salesVolume = (c.dealId as any).contractPrice || 0;
        }
      } catch (e) {
        // ignore mapping errors
      }
      return c;
    });

    return NextResponse.json({ commissions: commissionsWithSalesVolume });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
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

    // Only admin can create commission entries and must provide an amount
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to create commission' }, { status: 403 });
    }

    await connectDB();

    const { dealId, employeeId, amount, recipients, percentage: percentageFromBody } = await req.json();

    // Verify the deal exists (dealId references DealClosing)
    const deal = await DealClosing.findById(dealId);
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Admin must provide `amount`. Do not auto-calculate from deal/project or position.
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Amount is required and must be numeric' }, { status: 400 });
    }

    // Support creating with multiple recipients. If `recipients` provided use it, otherwise fall back to `employeeId`.
    let recipientsToSave: any[] = [];
    if (Array.isArray(recipients) && recipients.length > 0) {
      // validate recipients
      const seen = new Set();
      for (const r of recipients) {
        if (!r.userId) return NextResponse.json({ error: 'Each recipient must include userId' }, { status: 400 });
        if (seen.has(String(r.userId))) return NextResponse.json({ error: 'Duplicate recipient userId' }, { status: 400 });
        seen.add(String(r.userId));
        recipientsToSave.push({ userId: r.userId, role: r.role || 'sales', amount: Number(r.amount || 0), percentage: r.percentage });
      }
    } else if (employeeId) {
      recipientsToSave = [{ userId: employeeId, role: 'sales', amount: Number(amount || 0), percentage: percentageFromBody }];
    } else {
      return NextResponse.json({ error: 'Either recipients or employeeId must be provided' }, { status: 400 });
    }

    const totalAmount = recipientsToSave.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const commission = await Commission.create({
      dealId,
      employeeId: recipientsToSave.length > 0 ? recipientsToSave[0].userId : null,
      recipients: recipientsToSave,
      amount: totalAmount,
      percentage: percentageFromBody !== undefined ? Number(percentageFromBody) : undefined,
      status: 'pending',
      clientName: deal.clientName || '',
      clientNumber: String(deal.clientNumber || ''),
      developer: deal.developer || '',
      project: deal.project || '',
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error('Error creating commission:', error);
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
  }
}
