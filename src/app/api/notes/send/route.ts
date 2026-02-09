import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Note from '@/models/Note';
import User from '@/models/User';
import Team from '@/models/Team';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';
import { sendPushToSubscription } from '@/lib/push';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { receiverId, message } = await req.json();

    if (!receiverId || !message) {
      return NextResponse.json(
        { error: 'receiverId and message are required' },
        { status: 400 }
      );
    }

    // Get sender user
    const sender = await User.findById(payload.userId);
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    // Check if user is a team leader
    const teamLead = await Team.findOne({ leader: payload.userId });

    // Check permissions based on role
    if (sender.role === 'admin') {
      // Admin can send to anyone, just check if receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
      }
    } else if (sender.role === 'sales' && teamLead) {
      // Team leader can only send to their team members
      // Check if receiver is in team members
      const isTeamMember = teamLead.members.some((memberId: any) =>
        memberId.toString() === receiverId
      );

      if (!isTeamMember) {
        return NextResponse.json(
          { error: 'Can only send notes to your team members' },
          { status: 403 }
        );
      }
    } else if (sender.role === 'sales') {
      // Regular sales users cannot send notes
      return NextResponse.json(
        { error: 'Sales users cannot send notes' },
        { status: 403 }
      );
    } else {
      // Other roles cannot send notes
      return NextResponse.json(
        { error: 'You do not have permission to send notes' },
        { status: 403 }
      );
    }

    // Create the note
    const note = await Note.create({
      sender: payload.userId,
      receiver: receiverId,
      message,
    });

    // Populate sender and receiver details
    await note.populate('sender', 'name username role');
    await note.populate('receiver', 'name username role');

      // Create a Notification for the receiver and send web-push
      try {
        const senderUser = await User.findById(payload.userId);
        const notif = await Notification.create({
          userId: receiverId,
          type: 'lead_reassigned',
          title: `New message from ${senderUser?.name || 'Sender'}`,
          message: message,
          // leadId not applicable for notes
        });

        // fire-and-forget push send with debug logs
        (async () => {
          try {
            const subs = await PushSubscription.find({ userId: receiverId });
            console.log('[notes/send] found subscriptions for receiver', receiverId, subs.length);
            const payloadToSend = { title: notif.title, message: notif.message, url: '/sales/notes', data: { noteId: note._id } };

            const results = await Promise.all(subs.map(async (s) => {
              try {
                const ok = await sendPushToSubscription(s.subscription, payloadToSend);
                console.log('[notes/send] push result', { userId: receiverId, endpoint: s.endpoint, ok });
                return { endpoint: s.endpoint, ok };
              } catch (err) {
                console.error('[notes/send] push send error for', s.endpoint, err);
                return { endpoint: s.endpoint, ok: false, err };
              }
            }));

            console.log('[notes/send] push results summary', { receiverId, count: results.length });
          } catch (e) {
            console.warn('Failed to send push for note', e);
          }
        })();
      } catch (e) {
        console.warn('Failed to create/send notification for note', e);
      }

    return NextResponse.json(
      { message: 'Note sent successfully', note },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[notes/send] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
