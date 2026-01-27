import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { name, budget, phone, status, source, notes, assignedTo } = await req.json();

    // Only admin can edit name, budget, phone, source, assignedTo
    // Sales can only edit status and notes for their assigned leads
    if (payload.role === 'sales') {
      if (name || budget !== undefined || phone || source || assignedTo !== undefined) {
        return NextResponse.json({ error: 'Sales can only update status and notes' }, { status: 403 });
      }
      // Verify lead is assigned to this sales person
      const lead = await Lead.findById(id);
      if (!lead || lead.assignedTo?.toString() !== payload.userId) {
        return NextResponse.json({ error: 'You can only update your assigned leads' }, { status: 403 });
      }
    } else if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin or sales access required' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (budget !== undefined) updateData.budget = typeof budget === 'string' ? parseInt(budget) : budget;
    if (phone) updateData.phone = phone;
    if (status) updateData.status = status;
    if (source) updateData.source = source;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) {
      if (assignedTo) {
        try {
          const { Types } = await import('mongoose');
          updateData.assignedTo = new Types.ObjectId(assignedTo);
        } catch {
          return NextResponse.json({ error: 'Invalid assignedTo ID' }, { status: 400 });
        }
      } else {
        updateData.assignedTo = null;
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true }).populate(
      'assignedTo',
      'name email'
    );

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Auto-create commission if status is changed to "closed" and no pending/approved commission exists
    if (status === 'closed' && updatedLead.assignedTo) {
      const existingCommission = await Commission.findOne({
        dealId: id,
        status: { $in: ['pending', 'approved'] },
      });

      if (!existingCommission) {
        // Get employee's position and find commission percentage from settings
        const employee = await User.findById(updatedLead.assignedTo);
        const settings = await SystemSettings.findOne();
        
        let commissionPercentage = 5; // default fallback
        
        console.log(`[Commission] Lead ${id} marked as closed for employee ${employee?.name} (position: ${employee?.position})`);
        console.log(`[Commission] Settings rules:`, settings?.commissionRules);
        
        if (employee?.position && settings?.commissionRules && settings.commissionRules.length > 0) {
          const normalizedPosition = (employee.position || '').toLowerCase().trim();
          const rule = settings.commissionRules.find(
            (r: any) => (r.position || '').toLowerCase().trim() === normalizedPosition
          );
          if (rule && rule.percentage > 0) {
            commissionPercentage = rule.percentage;
            console.log(`[Commission] Found matching rule: ${rule.position} = ${rule.percentage}%`);
          } else {
            console.log(`[Commission] No matching rule found for position: ${employee.position}`);
          }
        } else {
          console.log(`[Commission] Using default 5% - position missing or no rules configured`);
        }
        
        const amount = (updatedLead.budget || 0) * (commissionPercentage / 100);
        console.log(`[Commission] Creating commission: ${amount} = ${updatedLead.budget} * ${commissionPercentage}%`);
        
        await Commission.create({
          dealId: id,
          employeeId: updatedLead.assignedTo,
          amount,
          percentage: commissionPercentage,
          status: 'pending',
        });
      }
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const lead = await Lead.findById(id).populate('assignedTo', 'name email');
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Lead deleted successfully', lead });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
