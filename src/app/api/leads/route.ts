import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
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

    // Resolve the username of the actor so we can set `createdBy` on leads
    let actorUsername = '';
    try {
      const User = (await import('@/models/User')).default;
      const actor = await User.findById(payload.userId).select('username');
      actorUsername = actor?.username || '';
    } catch (e) {
      console.warn('Could not resolve actor username for lead creation', e);
    }

    const userId = req.nextUrl.searchParams.get('userId');
    const status = req.nextUrl.searchParams.get('status');
    const includeSnapshots = req.nextUrl.searchParams.get('includeSnapshots');

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

    let combinedLeads: any[] = Array.isArray(leads) ? leads.map((l: any) => l) : [];

    // Optionally include closed-deal snapshots when requesting closed leads
    if (status === 'closed' && includeSnapshots === 'true') {
      try {
        const month = req.nextUrl.searchParams.get('month');
        const snapQuery: any = {};
        if (userId) snapQuery.userId = userId;
        if (req.nextUrl.searchParams.get('employeeId')) snapQuery.assignedTo = req.nextUrl.searchParams.get('employeeId');
        if (month) {
          const parts = month.split('-');
          if (parts.length === 2) {
            const year = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const start = new Date(year, m, 1);
            const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
            snapQuery.createdAt = { $gte: start, $lte: end };
          }
        }
        const snaps = await ClosedDealSnapshot.find(snapQuery).sort({ createdAt: -1 }).lean();
        const synthetic = snaps.map((s: any) => ({
          _id: `snapshot_${s._id}`,
          name: s.clientName || 'Closed Deal',
          phone: s.clientNumber || '',
          project: s.project || '',
          status: 'closed',
          source: 'snapshot',
          assignedTo: s.assignedTo ? { _id: String(s.assignedTo), name: '' } : null,
          proofImage: s.proofImage || '',
          info: s.info || '',
          createdAt: s.createdAt,
        }));

        combinedLeads = [...synthetic, ...combinedLeads];
      } catch (e) {
        console.error('Failed to include snapshots in leads response', e);
      }
    }

    return NextResponse.json({ leads: combinedLeads });
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

    // Allow admin, sales, and media buyer users to create leads
    if (payload.role !== 'admin' && payload.role !== 'sales' && payload.role !== 'media buyer') {
      return NextResponse.json({ error: 'Admin, sales or media buyer access required' }, { status: 403 });
    }

    await connectDB();

    // Resolve actor username for createdBy
    let actorUsername = '';
    try {
      const User = (await import('@/models/User')).default;
      const actor = await User.findById(payload.userId).select('username');
      actorUsername = actor?.username || '';
    } catch (e) {
      console.warn('Could not resolve actor username for lead creation (POST)', e);
    }

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
      createdBy: actorUsername,
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

    // Notify admins in-app (Notification documents) and via web-push
    try {
      const Notification = (await import('@/models/Notification')).default;
      const PushSubscription = (await import('@/models/PushSubscription')).default;
      const { sendPushToSubscription } = await import('@/lib/push');
      const User = (await import('@/models/User')).default;

      const admins = await User.find({ role: 'admin' }).select('_id name email').lean();
      // exclude the admin who created the lead (payload.userId)
      const adminIds = admins
        .map(a => String(a._id))
        .filter(id => id && id !== String(payload.userId));

      if (adminIds.length > 0) {
        const title = `New lead: ${lead.name}`;
        // Include actor username when available so admins see who created the lead
        const actorLabel = actorUsername || String(payload.userId || '');
        const message = `${lead.name} (${lead.phone}) - ${lead.project || 'No project'}${actorLabel ? ` (by ${actorLabel})` : ''}`;

        // create Notification documents for admins
        try {
          const notifications = adminIds.map((uid: any) => ({
            userId: uid,
            title,
            message,
            type: 'new_lead',
            leadId: lead._id,
            fromUser: payload.userId,
          }));
          await Notification.insertMany(notifications);
        } catch (e) {
          console.warn('Failed to create Notification documents for admins', e);
        }

        // send web-push to admin subscriptions
        try {
          const subs = await PushSubscription.find({ userId: { $in: adminIds } }).lean();
          const payloadToSend = { title, message, url: '/admin/leads', data: { leadId: String(lead._id) } };
          await Promise.all(subs.map((s: any) => sendPushToSubscription(s.subscription, payloadToSend)));
        } catch (e) {
          console.warn('Failed to send web-push to admins', e);
        }
      }
    } catch (e) {
      console.warn('Admin notification flow failed for new lead', e);
    }

    return NextResponse.json({ lead: fullLead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only admin may delete all leads
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Delete all leads
    const result = await Lead.deleteMany({});

    try {
      await logAdminAction({
        adminId: payload.userId,
        action: 'delete_all',
        resourceType: 'lead',
        resourceId: null,
        resourceName: 'all_leads',
        description: `Admin deleted all leads (${result.deletedCount} removed)` ,
        details: { deletedCount: result.deletedCount },
      });
    } catch (e) {
      console.error('Failed to log admin action for delete_all:', e);
    }

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting all leads:', error);
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 });
  }
}
