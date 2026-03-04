import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import Team from '@/models/Team';
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

    // Verify user and determine permissions (admin or team leader)
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine if user is a team leader by checking Team.leader
    const team = await Team.findOne({ leader: user._id }).lean();
    const isAdmin = user.role === 'admin';
    const isTeamLeader = Boolean(team);
    if (!isAdmin && !isTeamLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const month = req.nextUrl.searchParams.get('month');

    let query: any = {};

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // If team leader, restrict records to their team members + leader
    if (isTeamLeader && !isAdmin) {
      const allowedUserIds = [team.leader, ...(team.members || [])];
      query.userId = { $in: allowedUserIds };
    }

    // Fetch attendance records for the month with user details
    const records = await Attendance.find(query)
      .populate('userId', 'name email')
      .sort({ date: 1, userId: 1 });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    // Verify user and determine permissions (admin or team leader)
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const team = await Team.findOne({ leader: user._id }).lean();
    const isAdmin = user.role === 'admin';
    const isTeamLeader = Boolean(team);
    if (!isAdmin && !isTeamLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, date, recordId } = body as {
      action?: string;
      userId?: string;
      date?: string; // expected YYYY-MM-DD
      recordId?: string;
    };

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    if (action === 'mark_present') {
      if (!userId || !date) {
        return NextResponse.json({ error: 'userId and date required' }, { status: 400 });
      }

      // If team leader, ensure they only modify their team members
      if (!isAdmin && isTeamLeader) {
        const allowedUserIds = [team.leader.toString(), ...((team.members || []).map((m: any) => m.toString()))];
        if (!allowedUserIds.includes(userId)) {
          return NextResponse.json({ error: 'Forbidden to modify this user' }, { status: 403 });
        }
      }

      // create or update attendance for that day: set isLate=false
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const checkIn = new Date(date);
      checkIn.setHours(9, 0, 0, 0); // default on-time check-in at 09:00

      const uid = new mongoose.Types.ObjectId(userId);

      const updated = await Attendance.findOneAndUpdate(
        { userId: uid, date: { $gte: dayStart, $lte: dayEnd } },
        {
          $set: {
            checkInTime: checkIn,
            isLate: false,
            lateMinutes: 0,
            deviceId: 'admin-manual',
            latitude: 0,
            longitude: 0,
            withinRadius: true,
          },
          $setOnInsert: {
            date: dayStart,
            userId: uid,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({ success: true, record: updated });
    }

    if (action === 'mark_on_time') {
      // convert an existing late record to on-time
      if (recordId) {
        const rec = await Attendance.findById(recordId);
        if (!rec) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        // If team leader, ensure record belongs to their team
        if (!isAdmin && isTeamLeader) {
          const allowedUserIds = [team.leader.toString(), ...((team.members || []).map((m: any) => m.toString()))];
          if (!allowedUserIds.includes(String(rec.userId))) {
            return NextResponse.json({ error: 'Forbidden to modify this record' }, { status: 403 });
          }
        }

        rec.isLate = false;
        rec.lateMinutes = 0;
        await rec.save();
        return NextResponse.json({ success: true, record: rec });
      }

      if (!userId || !date) {
        return NextResponse.json({ error: 'userId and date required' }, { status: 400 });
      }

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Ensure team leader can only modify their team
      if (!isAdmin && isTeamLeader) {
        const allowedUserIds = [team.leader.toString(), ...((team.members || []).map((m: any) => m.toString()))];
        if (!allowedUserIds.includes(userId)) {
          return NextResponse.json({ error: 'Forbidden to modify this user' }, { status: 403 });
        }
      }

      const uid = new mongoose.Types.ObjectId(userId);
      const rec = await Attendance.findOne({ userId: uid, date: { $gte: dayStart, $lte: dayEnd } });
      if (!rec) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      rec.isLate = false;
      rec.lateMinutes = 0;
      await rec.save();
      return NextResponse.json({ success: true, record: rec });
    }

    if (action === 'deduction') {
      // attach a deduction (number of days) to the attendance record for that date
      const { days } = body as any;
      if (!userId || !date || typeof days !== 'number') {
        return NextResponse.json({ error: 'userId, date and days required' }, { status: 400 });
      }

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // If team leader, ensure they only modify their team members
      if (!isAdmin && isTeamLeader) {
        const allowedUserIds = [team.leader.toString(), ...((team.members || []).map((m: any) => m.toString()))];
        if (!allowedUserIds.includes(userId)) {
          return NextResponse.json({ error: 'Forbidden to modify this user' }, { status: 403 });
        }
      }

      const uid = new mongoose.Types.ObjectId(userId);

      // If there's an existing record keep its presence fields intact, only set deduction and mark as deduction-only.
      const existing = await Attendance.findOne({ userId: uid, date: { $gte: dayStart, $lte: dayEnd } });
      if (existing) {
        // Preserve existing presence/late status. Only attach deduction value.
        existing.deduction = days;
        // If the record was already a presence/late record, do NOT mark it deduction-only.
        if (!existing.isLate && !existing.checkInTime) {
          // no check-in and not late => mark as deduction-only (absent with deduction)
          existing.deductionOnly = true;
        } else {
          // preserve deductionOnly as false for existing presence/late records
          existing.deductionOnly = existing.deductionOnly || false;
        }
        await existing.save();
        return NextResponse.json({ success: true, record: existing });
      }

      // No existing record: create a deduction-only record. Do NOT mark as present.
      const created = await Attendance.create({
        userId: uid,
        date: dayStart,
        deduction: days,
        deductionOnly: true,
        deviceId: 'admin-deduction',
        latitude: 0,
        longitude: 0,
        withinRadius: true,
      });

      return NextResponse.json({ success: true, record: created });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 });
  }
}
