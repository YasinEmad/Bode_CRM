import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Team from '@/models/Team';
import AssignmentLog from '@/models/AssignmentLog';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const body = await req.json();
    const { leadId, employeeId, reason } = body;

    if (!leadId) return NextResponse.json({ error: 'leadId is required' }, { status: 400 });

    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Prevent reassigning closed leads
    if (lead.status === 'closed') {
      return NextResponse.json({ error: 'Cannot reassign closed leads' }, { status: 403 });
    }

    // Admins can assign any lead
    if (payload.role === 'admin') {
      const from = lead.assignedTo ?? null;
      lead.assignedTo = employeeId || null;
      await lead.save();
      await AssignmentLog.create({ lead: lead._id, from, to: employeeId || null, changedBy: payload.userId, reason: reason || '' });
      
      // إنشاء إشعار للموظف الذي تم إسناد الـ lead له
      if (employeeId) {
        const employee = await User.findById(employeeId);
        if (employee) {
          await Notification.create({
            userId: employeeId,
            type: 'new_lead',
            title: 'New Lead',
            message: `A new lead has been assigned to you: ${lead.name}`,
            leadId: lead._id,
            fromUser: payload.userId,
          });
        }
      }
      
      return NextResponse.json({ lead }, { status: 200 });
    }

    // Sales role: must be team leader managing his own team
    if (payload.role === 'sales') {
      // find team where current user is leader
      const team = await Team.findOne({ leader: payload.userId }).populate('members');
      if (!team) return NextResponse.json({ error: 'Only team leaders can assign leads' }, { status: 403 });

        // ensure target employee is a member of the team OR is the team leader (or null to unassign)
        if (employeeId) {
          const empId = typeof employeeId === 'string' ? employeeId : String(employeeId);
          const isTeamLeader = String(payload.userId) === empId;
          const isMember = team.members.some((m: any) => String(m._id || m) === empId);
          if (!isTeamLeader && !isMember) return NextResponse.json({ error: 'Can only assign to members of your team' }, { status: 403 });
        }

      // For team leaders: allow assignment if lead is unassigned OR if they want to reassign it
      // (Even from other teams - this allows cross-team transfers when needed)
      const from = lead.assignedTo ?? null;
      lead.assignedTo = employeeId || null;
      await lead.save();
      await AssignmentLog.create({ lead: lead._id, from, to: employeeId || null, changedBy: payload.userId, reason: reason || '' });
      
      // إنشاء إشعار للموظف الذي تم إسناد الـ lead له
      if (employeeId && employeeId !== payload.userId) {
        const employee = await User.findById(employeeId);
        const teamLeader = await User.findById(payload.userId);
        if (employee && teamLeader) {
          await Notification.create({
            userId: employeeId,
            type: 'new_lead',
            title: 'New Lead from Team Leader',
            message: `A new lead has been assigned to you by ${teamLeader.name}: ${lead.name}`,
            leadId: lead._id,
            fromUser: payload.userId,
          });
        }
      }
      
      return NextResponse.json({ lead }, { status: 200 });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Error assigning lead:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to assign lead' }, { status: 500 });
  }
}
