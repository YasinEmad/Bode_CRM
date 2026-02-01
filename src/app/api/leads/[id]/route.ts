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

    const { name, project, phone, email, status, source, notes, info, assignedTo, proofImage } = await req.json();

    // Only admin can edit name, project, phone, source, assignedTo
    // Sales can only edit status and notes for their assigned leads
    if (payload.role === 'sales') {
      // Allow project field only when closing a lead (status === 'closed')
      const isClosingDeal = status === 'closed';
      if (name || (!isClosingDeal && project !== undefined) || phone || source || assignedTo !== undefined) {
        return NextResponse.json({ error: 'Sales can only update status and notes' }, { status: 403 });
      }
      // Verify lead is assigned to this sales person
      const lead = await Lead.findById(id);
      if (!lead || lead.assignedTo?.toString() !== payload.userId) {
        return NextResponse.json({ error: 'You can only update your assigned leads' }, { status: 403 });
      }
      // Prevent sales from changing a closed lead to any other status
      if (lead.status === 'closed' && status && status !== 'closed') {
        return NextResponse.json({ error: 'You cannot change the status of a closed lead' }, { status: 403 });
      }
    } else if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin or sales access required' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (project !== undefined) updateData.project = typeof project === 'string' ? project : project;
    if (phone) {
      // Prevent duplicate phone numbers when updating
      const existing = await Lead.findOne({ phone: phone });
      if (existing && existing._id.toString() !== id) {
        return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
      }
      updateData.phone = phone;
    }
    // Handle sales attempting to mark closed: require proofImage + info (use `info` instead of `notes`)
    if (status) {
      if (payload.role === 'sales' && status === 'closed') {
        if (!proofImage || !info) {
          return NextResponse.json({ error: 'Proof image and info are required to close a lead' }, { status: 400 });
        }
        // Upload proofImage to ImageKit if it's a data URI, otherwise accept URL
        if (typeof proofImage === 'string' && proofImage.startsWith('data:')) {
          try {
            if (!process.env.IMAGEKIT_PRIVATE_KEY) {
              console.error('Missing IMAGEKIT_PRIVATE_KEY in environment');
              return NextResponse.json({ error: 'Image upload not configured on server' }, { status: 500 });
            }

            const fileName = `proof_${Date.now()}.png`;
            const form = new FormData();
            form.append('file', proofImage);
            form.append('fileName', fileName);
            form.append('useUniqueFileName', 'true');

            const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
            const auth = 'Basic ' + Buffer.from(`${privateKey}:`).toString('base64');

            const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
              method: 'POST',
              headers: {
                Authorization: auth,
              },
              body: form as any,
            });

            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok) {
              console.error('ImageKit upload failed', uploadJson);
              const message = uploadJson.message || (uploadJson.error && uploadJson.error.message) || 'ImageKit upload failed';
              return NextResponse.json({ error: `Image upload failed: ${message}` }, { status: 500 });
            }

            // Prefer returned URL, fallback to configured endpoint + filePath
            let imageUrl = uploadJson.url || '';
            if ((!imageUrl || imageUrl === '') && process.env.IMAGEKIT_URL_ENDPOINT && uploadJson.filePath) {
              imageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '')}/${uploadJson.filePath.replace(/^\//, '')}`;
            }

            if (!imageUrl) {
              console.error('ImageKit did not return a valid URL', uploadJson);
              return NextResponse.json({ error: 'Image upload succeeded but no URL was returned' }, { status: 500 });
            }

            updateData.proofImage = imageUrl;
          } catch (err: any) {
            console.error('Error uploading to ImageKit', err?.message ?? err);
            // Provide a clearer message for common missing env or network issues
            if (err?.name === 'FetchError' || err?.message?.includes('network')) {
              return NextResponse.json({ error: 'Network error during image upload' }, { status: 502 });
            }
            return NextResponse.json({ error: 'Failed to upload proof image' }, { status: 500 });
          }
        } else {
          // Already a URL (or not a data URI) — store as provided
          updateData.proofImage = proofImage as any;
        }

        updateData.info = info;
        updateData.status = 'closed_pending_approval';
      } else {
        updateData.status = status;
      }
    }
    if (source) updateData.source = source;
    // Apply notes only when not performing a sales close operation.
    if (notes !== undefined) {
      // If sales user is trying to close, ignore notes field for that operation to avoid overwriting old notes.
      if (!(payload.role === 'sales' && status === 'closed')) {
        updateData.notes = notes;
      }
    }
    // If proofImage was provided and wasn't handled above, upload it when necessary
    if (proofImage !== undefined) {
      if (typeof proofImage === 'string' && proofImage.startsWith('data:')) {
        try {
          const fileName = `proof_${Date.now()}.png`;
          const form = new FormData();
          form.append('file', proofImage);
          form.append('fileName', fileName);

          const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
          const auth = 'Basic ' + Buffer.from(`${privateKey}:`).toString('base64');

          const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
              Authorization: auth,
            },
            body: form as any,
          });

          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok) {
            console.error('ImageKit upload failed', uploadJson);
            return NextResponse.json({ error: 'Failed to upload proof image' }, { status: 500 });
          }

          let imageUrl = uploadJson.url || '';
          if ((!imageUrl || imageUrl === '') && process.env.IMAGEKIT_URL_ENDPOINT && uploadJson.filePath) {
            imageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '')}/${uploadJson.filePath.replace(/^\//, '')}`;
          }

          updateData.proofImage = imageUrl;
        } catch (err) {
          console.error('Error uploading to ImageKit', err);
          return NextResponse.json({ error: 'Failed to upload proof image' }, { status: 500 });
        }
      } else {
        updateData.proofImage = proofImage as any;
      }
    }
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

    // When sales marks a lead as closed (sent to admin), create a placeholder commission
    // so admin can set the commission amount manually. Do NOT auto-calculate amounts.
    if (updateData.status === 'closed_pending_approval' && updatedLead.assignedTo) {
      const existingCommission = await Commission.findOne({
        dealId: id,
        status: { $in: ['pending', 'approved'] },
      });

      if (!existingCommission) {
        await Commission.create({
          dealId: id,
          employeeId: updatedLead.assignedTo,
          amount: 0,
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
