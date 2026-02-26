import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

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
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const employees = await User.find({ role: 'sales' }).select('_id username name email phone position salary createdAt joinDate deviceId deviceIds');
    
    console.log('📋 Fetched employees:', employees.map(e => ({ 
      name: e.name, 
      joinDate: e.joinDate,
      joinDateType: typeof e.joinDate
    })));
    
    // Get leads and deals data for each employee
    // Build a map of lead IDs to their status for filtering snapshots
    const allLeads = await Lead.find({}).select('_id assignedTo status');
    const leadStatusMap = new Map<string, string>();
    allLeads.forEach((lead: any) => {
      leadStatusMap.set(String(lead._id), lead.status);
    });
    
    const employeesWithStats = await Promise.all(
      employees.map(async (emp: any) => {
        const leadsCount = await Lead.countDocuments({ assignedTo: emp._id });
        
        // Get closed deals from snapshots (preserves deleted leads)
        // Only count snapshots where the associated Lead has status = 'closed'
        const closedSnapshots = await ClosedDealSnapshot.find({
          $or: [{ assignedTo: emp._id }, { userId: emp._id }],
        }).lean();
        
        // Filter to only count snapshots where the Lead is 'closed' or was deleted
        const closedDealsCount = closedSnapshots.filter((snap: any) => {
          if (!snap.leadId) return true; // If no leadId, preserve the deal
          const leadStatus = leadStatusMap.get(String(snap.leadId));
          if (leadStatus === undefined) return true; // Lead was deleted, preserve the deal
          return leadStatus === 'closed';
        }).length;
        
        return {
          ...emp.toObject(),
          leadsCount,
          closedDealsCount,
        };
      })
    ).then(list => list.filter(e => e && e._id)); // Filter out invalid entries

    return NextResponse.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { username, password, name, position, phone, salary, joinDate } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Username uniqueness
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Strong password enforcement
    const pwd = String(password);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character' }, { status: 400 });
    }

    const hashed = await hashPassword(pwd);

    const user = await User.create({
      username: username.trim(),
      password: hashed,
      name,
      role: 'sales',
      position: position || '',
      phone: phone || '',
      salary: Number(salary) || 0,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
    });

    console.log('✅ Employee created:', { 
      id: user._id, 
      username: user.username, 
      joinDate: user.joinDate,
      joinDateType: typeof user.joinDate
    });

    return NextResponse.json({ success: true, employee: { id: user._id, username: user.username, name: user.name, role: user.role, position: user.position, joinDate: user.joinDate, email: user.email, phone: user.phone, salary: user.salary, leadsCount: 0, closedDealsCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
