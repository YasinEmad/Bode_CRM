import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { logAdminAction } from '@/lib/adminLogger';
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

    const userId = req.nextUrl.searchParams.get('userId');
    const status = req.nextUrl.searchParams.get('status');

    let query: any = {};
    
    // Admin sees all leads, or filtered by userId
    if (payload.role === 'admin') {
      if (userId) {
        try {
          const { Types } = await import('mongoose');
          query.assignedTo = new Types.ObjectId(userId);
        } catch {
          query.assignedTo = userId;
        }
      }
    }
    // Sales users see only leads assigned to them
    else if (payload.role === 'sales') {
      try {
        const { Types } = await import('mongoose');
        query.assignedTo = new Types.ObjectId(payload.userId);
      } catch {
        query.assignedTo = payload.userId;
      }
    }

    if (status) query.status = status;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
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

    // Allow both admin and sales users to create leads
    if (payload.role !== 'admin' && payload.role !== 'sales') {
      return NextResponse.json({ error: 'Admin or sales access required' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { name, project, phone, email, status, source, sourceText, notes, assignedTo } = body;
    console.log('[API /api/leads] received full payload:', JSON.stringify(body));

    if (!name || !phone) {
      return NextResponse.json({ error: 'Missing required fields (name and phone)' }, { status: 400 });
    }

    // Convert assignedTo to ObjectId if it's a valid string
    let assignedToId: any = undefined;
    if (assignedTo) {
      try {
        const { Types } = await import('mongoose');
        assignedToId = new Types.ObjectId(assignedTo);
      } catch {
        return NextResponse.json({ error: 'Invalid assignedTo ID' }, { status: 400 });
      }
    } else if (payload.role === 'sales') {
      // Auto-assign to the sales user who created the lead
      try {
        const { Types } = await import('mongoose');
        assignedToId = new Types.ObjectId(payload.userId);
      } catch {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
    }

    // Prevent duplicate phone numbers
    const existing = await Lead.findOne({ phone: phone });
    if (existing) {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
    }

    const lead = await Lead.create({
      name,
      project: project || '',
      phone,
      email: email || '',
      status: status || 'new',
      source: source || 'other',
      sourceText: sourceText || '',
      notes: notes || '',
      assignedTo: assignedToId,
    });
    try {
      console.log('[API /api/leads] created lead (raw):', JSON.stringify(lead.toObject()));
    } catch (e) {
      console.log('[API /api/leads] created lead raw (fallback):', lead);
    }

    // Re-query the created lead to ensure we return a plain JS object with populated refs and all fields
    let fullLead = await Lead.findById(lead._id).populate('assignedTo', 'name email');
    try {
      console.log('[API /api/leads] created lead (full):', JSON.stringify(fullLead?.toObject()));
    } catch (e) {
      console.log('[API /api/leads] created lead (full fallback):', fullLead);
    }

    // If the request included a custom sourceText but the retrieved lead lacks it,
    // persist it explicitly and refresh the lead so the response includes it.
    if (body && body.sourceText && (!fullLead || !fullLead.sourceText || String(fullLead.sourceText).trim() === '')) {
      try {
        console.log('[API /api/leads] fullLead missing sourceText; persisting fallback from request');
        await Lead.findByIdAndUpdate(lead._id, { sourceText: body.sourceText }, { new: true });
        const refreshed = await Lead.findById(lead._id).populate('assignedTo', 'name email');
        try {
          console.log('[API /api/leads] refreshed lead after persisting sourceText:', JSON.stringify(refreshed?.toObject()));
        } catch (e) {
          console.log('[API /api/leads] refreshed lead after persisting sourceText (fallback):', refreshed);
        }
        // Use refreshed lead going forward
        // Assign to fullLead variable for later use in response/logging
        // Note: TypeScript typing not required in this runtime file
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        fullLead = refreshed;
      } catch (err) {
        console.error('[API /api/leads] failed to persist sourceText fallback:', err);
      }
    }

    // If an admin created the lead, log the action for the admin logs page
    if (payload.role === 'admin') {
      try {
        console.log('🔵 Admin creating lead - attempting to log action', { adminId: payload.userId, leadId: lead._id });
        const log = await logAdminAction({
          adminId: payload.userId,
          action: 'create',
          resourceType: 'lead',
          resourceId: lead._id,
          resourceName: lead.name,
          description: `Admin created lead ${lead.name}`,
          details: { phone: lead.phone, email: lead.email, assignedTo: lead.assignedTo || null },
        });
        console.log('✅ Admin create lead log result:', { logId: log?._id });
      } catch (e) {
        console.error('Failed to log admin action for lead creation:', e);
      }
    }

    return NextResponse.json({ lead: fullLead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
