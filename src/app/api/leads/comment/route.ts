import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { leadId, comment } = await request.json();

    if (!leadId || !comment?.trim()) {
      return NextResponse.json({ error: 'Lead ID and comment are required' }, { status: 400 });
    }

    // Get user info
    const user = await User.findById(payload.userId).select('name username');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    console.log('Lead before adding comment:', { id: lead._id, commentsCount: lead.comments?.length || 0 });

    // Add the comment
    const newComment = {
      text: comment.trim(),
      author: user.name || user.username || 'Unknown',
      timestamp: new Date(),
    };

    lead.comments = lead.comments || [];
    lead.comments.push(newComment);

    console.log('Lead after pushing comment:', { id: lead._id, commentsCount: lead.comments.length });

    // Save the lead with the new comment
    await lead.save();

    console.log('Lead saved with new comment, comments count:', lead.comments.length);

    // return updated lead to keep frontend consistent
    const updatedLead = await Lead.findById(leadId).populate('assignedTo', 'name email').lean();
    console.log('Updated lead comments:', updatedLead?.comments);
    return NextResponse.json({ success: true, comment: newComment, lead: updatedLead });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { leadId, commentIndex } = await request.json();

    if (!leadId || typeof commentIndex !== 'number') {
      return NextResponse.json({ error: 'Lead ID and comment index are required' }, { status: 400 });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!Array.isArray(lead.comments) || commentIndex < 0 || commentIndex >= lead.comments.length) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    lead.comments.splice(commentIndex, 1);
    await lead.save();

    const updatedLead = await Lead.findById(leadId).populate('assignedTo', 'name email').lean();
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
