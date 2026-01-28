import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
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

    if (payload.role === 'sales') {
      query.employeeId = payload.userId;
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) {
      query.status = status;
    }

    const commissions = await Commission.find(query)
      .populate('dealId', 'name budget proofImage notes')
      .populate('employeeId', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ commissions });
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

    // Allow both sales and admin to create commissions
    if (!['sales', 'admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Sales or admin access required' }, { status: 403 });
    }

    await connectDB();

    const { dealId, employeeId, percentage: percentageFromBody } = await req.json();

    // Verify the lead exists and belongs to the employee
    const lead = await Lead.findById(dealId);
    if (!lead) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // If sales is submitting, verify it's their own lead
    if (payload.role === 'sales' && lead.assignedTo?.toString() !== payload.userId) {
      return NextResponse.json({ error: 'You can only submit commission for your own leads' }, { status: 403 });
    }

    // Determine commission percentage
    let percentage = percentageFromBody;
    
    // If percentage not provided, fetch from commission rules based on employee's position
    if (percentage === undefined) {
      const employee = await User.findById(employeeId);
      const settings = await SystemSettings.findOne();
      
      percentage = 5; // default fallback
      
      console.log(`[Commission] Creating commission for deal ${dealId}, employee ${employee?.name} (position: ${employee?.position})`);
      console.log(`[Commission] Available rules:`, settings?.commissionRules);
      
      if (employee?.position && settings?.commissionRules && settings.commissionRules.length > 0) {
        const normalizedPosition = (employee.position || '').toLowerCase().trim();
        const rule = settings.commissionRules.find(
          (r: any) => (r.position || '').toLowerCase().trim() === normalizedPosition
        );
        if (rule && rule.percentage > 0) {
          percentage = rule.percentage;
          console.log(`[Commission] Applied rule: ${rule.position} = ${rule.percentage}%`);
        } else {
          console.log(`[Commission] No rule found for position: ${employee.position} (normalized: ${normalizedPosition})`);
          console.log(`[Commission] Available positions:`, settings.commissionRules.map((r: any) => r.position));
        }
      } else {
        console.log(`[Commission] Using default 5% fallback`);
      }
    }

    const amount = (lead.budget || 0) * (percentage / 100);

    const commission = await Commission.create({
      dealId,
      employeeId,
      amount,
      percentage,
      status: 'pending',
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error('Error creating commission:', error);
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
  }
}
