import { connectDB } from '@/lib/mongodb';
import DealClosing from '@/models/DealClosing';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import { verify } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verify(token, JWT_SECRET) as TokenPayload;

    await connectDB();

    const body = await req.json();
    console.log('[DEAL-CLOSING] Received body:', JSON.stringify(body));
    const {
      leadId,
      tcrType,
      clientName,
      clientNumber,
      developer,
      unitCode,
      unitArea,
      unitType,
      contractPrice,
      contractDate,
      finishingType,
      deliveryDate,
      paymentPlan,
      downPaymentPercentage,
      downPaymentAmount,
      paymentByMonth,
      attachments,
      info,
    } = body;

    // Validate required fields
    if (
      !leadId ||
      !tcrType ||
      !clientName ||
      !clientNumber ||
      !developer ||
      !info
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Normalize some fields to expected types before validation/creation
    const normalizedUnitCode = unitCode !== undefined && unitCode !== null ? String(unitCode) : unitCode;
    const normalizedUnitType = unitType !== undefined && unitType !== null ? String(unitType) : unitType;
    const normalizedFinishingType = finishingType !== undefined && finishingType !== null ? String(finishingType) : finishingType;

    // For non-EOI types, validate additional required fields
    if (tcrType !== 'EOI') {
      if (
        !normalizedUnitCode ||
        !unitArea ||
        !normalizedUnitType ||
        !contractPrice ||
        !contractDate ||
        !normalizedFinishingType ||
        !deliveryDate ||
        !paymentPlan ||
        downPaymentPercentage === undefined ||
        downPaymentPercentage === null ||
        !downPaymentAmount ||
        paymentByMonth === undefined ||
        paymentByMonth === null
      ) {
        return NextResponse.json(
          { error: 'Missing required fields for ' + tcrType },
          { status: 400 }
        );
      }
    }

    // Create new deal closing record
    console.log('[DEAL-CLOSING] Decoded userId:', decoded.userId);
    const dealClosing = await DealClosing.create({
      leadId,
      userId: decoded.userId,
      tcrType,
      clientName,
      clientNumber,
      developer,
      unitCode: normalizedUnitCode,
      unitArea,
      unitType: normalizedUnitType,
      contractPrice,
      contractDate: new Date(contractDate),
      finishingType: normalizedFinishingType,
      deliveryDate,
      paymentPlan,
      downPaymentPercentage,
      downPaymentAmount,
      paymentByMonth,
      attachments: attachments || [],
      project: body.project || undefined,
      info,
    });

    // Update lead status to closed
    const updatedLead = await Lead.findByIdAndUpdate(leadId, { status: 'closed_pending_approval' }, { new: true }).populate('assignedTo');
    console.log('[DEAL-CLOSING] lead updated:', updatedLead?._id?.toString() || null, 'new status:', updatedLead?.status);

    // Create a placeholder commission record so admin can see it in Commission Management
    if (updatedLead?.assignedTo) {
      const existingCommission = await Commission.findOne({
        dealId: dealClosing._id,
        status: { $in: ['pending', 'approved'] },
      });

      if (!existingCommission) {
        console.log('[DEAL-CLOSING] About to create commission with:');
        console.log('  dealId (value):', dealClosing._id);
        console.log('  dealId (type):', typeof dealClosing._id);
        console.log('  employeeId:', updatedLead.assignedTo);
        
        const commission = await Commission.create({
          dealId: dealClosing._id,
          employeeId: updatedLead.assignedTo,
          amount: 0,
          status: 'pending',
          // Denormalize key client fields so UI does not depend on populate
          clientName: dealClosing.clientName,
          clientNumber: String(dealClosing.clientNumber || ''),
          developer: dealClosing.developer,
          project: dealClosing.project || (updatedLead as any).project || '',
        });
        
        console.log('[DEAL-CLOSING] Commission created successfully:');
        console.log('  commission._id:', commission._id);
        console.log('  commission.dealId (after save):', commission.dealId);
        console.log('  full commission:', JSON.stringify(commission.toObject(), null, 2));
      }
    }

    return NextResponse.json({ dealClosing, updatedLead }, { status: 201 });
  } catch (error) {
    console.error('Error creating deal closing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verify(token, JWT_SECRET);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const dealId = searchParams.get('dealId');

    if (dealId) {
      const dealClosing = await DealClosing.findById(dealId).populate('leadId userId');
      return NextResponse.json({ dealClosing }, { status: 200 });
    }

    if (leadId) {
      const dealClosing = await DealClosing.findOne({ leadId }).populate('leadId userId');
      return NextResponse.json({ dealClosing }, { status: 200 });
    }

    const dealClosings = await DealClosing.find()
      .populate('leadId userId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ dealClosings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deal closing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
