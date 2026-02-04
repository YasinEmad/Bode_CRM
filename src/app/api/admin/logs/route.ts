import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminAction from '@/models/AdminAction';
import AssignmentLog from '@/models/AssignmentLog';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';

function parseNumber(value: string | null, fallback = 1) {
  const n = parseInt(value || '', 10);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const page = parseNumber(req.nextUrl.searchParams.get('page'), 1);
    const limit = parseNumber(req.nextUrl.searchParams.get('limit'), 50);
    const logType = req.nextUrl.searchParams.get('logType') || 'all'; // 'all', 'admin', 'assignment'
    const adminId = req.nextUrl.searchParams.get('adminId');
    const targetId = req.nextUrl.searchParams.get('targetId');
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const search = req.nextUrl.searchParams.get('search');
    const sort = req.nextUrl.searchParams.get('sort') || '-createdAt';

    const query: any = {};

    if (adminId) {
      try {
        const { Types } = await import('mongoose');
        query.admin = new Types.ObjectId(adminId);
      } catch {
        query.admin = adminId;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { resourceName: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sortObj: any = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;

    let adminActionLogs: any[] = [];
    let adminActionTotal = 0;
    let assignmentLogs: any[] = [];
    let assignmentLogTotal = 0;

    // Fetch AdminAction logs
    if (logType === 'all' || logType === 'admin') {
      adminActionTotal = await AdminAction.countDocuments(query);
      adminActionLogs = await AdminAction.find(query)
        .populate('admin', 'name email')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Fetch AssignmentLog logs
    if (logType === 'all' || logType === 'assignment') {
      const assignQuery: any = {};
      if (adminId) {
        try {
          const { Types } = await import('mongoose');
          assignQuery.changedBy = new Types.ObjectId(adminId);
        } catch {
          assignQuery.changedBy = adminId;
        }
      }

      if (targetId) {
        try {
          const { Types } = await import('mongoose');
          assignQuery.lead = new Types.ObjectId(targetId);
        } catch {
          assignQuery.lead = targetId;
        }
      }

      if (startDate || endDate) {
        assignQuery.createdAt = {};
        if (startDate) assignQuery.createdAt.$gte = new Date(startDate);
        if (endDate) assignQuery.createdAt.$lte = new Date(endDate);
      }

      if (search) {
        assignQuery.reason = { $regex: search, $options: 'i' };
      }

      assignmentLogTotal = await AssignmentLog.countDocuments(assignQuery);
      assignmentLogs = await AssignmentLog.find(assignQuery)
        .populate('changedBy', 'name email')
        .populate('lead', 'name')
        .populate('from', 'name')
        .populate('to', 'name')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Combine and format logs
    const combinedLogs = [
      ...adminActionLogs.map((log: any) => ({
        _id: log._id,
        type: 'admin_action',
        createdAt: log.createdAt,
        actor: log.admin,
        action: log.action,
        resourceType: log.resourceType,
        resourceName: log.resourceName,
        description: log.description,
        details: log.details,
      })),
      ...assignmentLogs.map((log: any) => ({
        _id: log._id,
        type: 'assignment',
        createdAt: log.createdAt,
        actor: log.changedBy,
        action: 'assign',
        resourceType: 'lead',
        resourceName: log.lead?.name,
        description: `Assigned to ${log.to?.name || 'unassigned'} from ${log.from?.name || 'unassigned'}: ${log.reason}`,
        from: log.from,
        to: log.to,
        lead: log.lead,
        reason: log.reason,
      })),
    ];

    // Sort combined logs by createdAt if logType is 'all'
    if (logType === 'all') {
      const isSortDesc = sortObj.createdAt === -1;
      combinedLogs.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return isSortDesc ? timeB - timeA : timeA - timeB;
      });
    }

    const total =
      (logType === 'all' ? adminActionTotal + assignmentLogTotal : 
       logType === 'admin' ? adminActionTotal : 
       assignmentLogTotal);

    return NextResponse.json({
      logs: combinedLogs,
      total,
      page,
      limit,
      logType,
      adminActionTotal,
      assignmentLogTotal,
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    // Delete all admin actions and assignment logs
    const adminActionResult = await AdminAction.deleteMany({});
    const assignmentLogResult = await AssignmentLog.deleteMany({});

    return NextResponse.json({
      message: 'All logs deleted successfully',
      deletedAdminActions: adminActionResult.deletedCount || 0,
      deletedAssignmentLogs: assignmentLogResult.deletedCount || 0,
      totalDeleted: (adminActionResult.deletedCount || 0) + (assignmentLogResult.deletedCount || 0),
    });
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 });
  }
}