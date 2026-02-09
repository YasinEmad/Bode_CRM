import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';
import { logAdminAction } from '@/lib/adminLogger';
import * as XLSX from 'xlsx';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate and prepare leads
    const leadsToInsert: any[] = [];
    const errors: { row: number; error: string }[] = [];

    data.forEach((row: any, index: number) => {
      const rowNum = index + 2; // Excel row numbering starts at 1, plus header

      // Validate required fields (case-insensitive)
      const name = row.name || row.Name || row.NAME || '';
      const project = row.project || row.Project || row.PROJECT || '';
      const phone = row.phone || row.Phone || row.PHONE || '';
      const status = row.status || row.Status || row.STATUS || 'new';
      const source = row.source || row.Source || row.SOURCE || 'other';
      const notes = row.notes || row.Notes || row.NOTES || '';
      const assignedTo = row.assignedTo || row.AssignedTo || row.assigned_to || '';

      // Robust email detection: prefer common keys, then any header containing "email" after normalization
      let email: any = '';
      if (row.email || row.Email || row.EMAIL) {
        email = row.email || row.Email || row.EMAIL;
      } else {
        for (const key of Object.keys(row || {})) {
          if (typeof key === 'string') {
            const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (normalizedKey.includes('email')) {
              email = row[key];
              break;
            }
          }
        }
      }

      // Normalize and validate the email value
      if (email == null) email = '';
      email = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        email = '';
      } else {
        email = email.toLowerCase();
      }

      if (!name || !project || !phone) {
        errors.push({
          row: rowNum,
          error: 'Missing required fields (name, project, phone)',
        });
        return;
      }

      // Validate status enum
      const validStatuses = ['new', 'connected', 'negotiation', 'closed', 'lost'];
      const finalStatus = validStatuses.includes(String(status).toLowerCase())
        ? String(status).toLowerCase()
        : 'new';

      // Validate source enum
      const validSources = ['website', 'referral', 'phone', 'email', 'facebook', 'instagram', 'google ads', 'other'];
      const normalizedSource = String(source).toLowerCase();
      const finalSource = validSources.includes(normalizedSource) ? normalizedSource : 'other';
      const finalSourceText = finalSource === 'other' ? String(source).trim() : '';

      leadsToInsert.push({
        name: String(name).trim(),
        project: String(project).trim(),
        phone: String(phone).trim(),
        status: finalStatus,
        email: email,
        source: finalSource,
        sourceText: finalSourceText,
        notes: String(notes).trim(),
        assignedTo: assignedTo ? String(assignedTo).trim() : null,
      });
    });

    if (leadsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid leads found in file', validationErrors: errors },
        { status: 400 }
      );
    }

    // Filter out leads whose phone already exists in DB to avoid duplicates
    const phones = leadsToInsert.map(l => l.phone);
    const existingLeads = await Lead.find({ phone: { $in: phones } }).select('phone');
    const existingPhones = new Set(existingLeads.map((l: any) => l.phone));

    const filteredLeadsToInsert = leadsToInsert.filter(l => {
      return !existingPhones.has(l.phone);
    });

    // Collect row-level errors for duplicates
    const dupErrors = leadsToInsert
      .map((l, idx) => ({ lead: l, row: idx + 2 }))
      .filter(item => existingPhones.has(item.lead.phone))
      .map(item => ({ row: item.row, error: `Phone ${item.lead.phone} already exists` }));

    // Insert non-duplicate leads
    const insertedLeads = filteredLeadsToInsert.length > 0 ? await Lead.insertMany(filteredLeadsToInsert) : [];
    try {
      console.log('[BulkImport] Inserted leads emails:', insertedLeads.map((l: any) => l.email));
    } catch (e) {
      // ignore
    }
    // Note: Do not auto-create commissions during bulk import. Admin must create/set commission amounts manually.

    // Log the bulk import as an admin action
    try {
      console.log('🔵 Admin bulk import - attempting to log action', { adminId: payload.userId, importedCount: insertedLeads.length });
      const log = await logAdminAction({
        adminId: payload.userId,
        action: 'bulk_create',
        resourceType: 'lead',
        resourceId: null,
        resourceName: 'Bulk Import',
        description: `Imported ${insertedLeads.length} leads via bulk import`,
        details: { importedIds: insertedLeads.map((l: any) => l._id), skippedDuplicates: dupErrors.length },
      });
      console.log('✅ Admin bulk import log result:', { logId: log?._id });
    } catch (e) {
      console.error('Failed to log admin bulk import action:', e);
    }

    // There is currently no automatic commission creation during bulk import.
    const commissionsToCreate: any[] = [];

    // Combine validation errors and duplicate errors
    const combinedErrors = [...errors, ...dupErrors];

    return NextResponse.json(
      {
        message: `Imported ${insertedLeads.length} leads. ${dupErrors.length} rows skipped due to duplicate phones.`,
        imported: insertedLeads.length,
        commissionsCreated: commissionsToCreate.length,
        errors: combinedErrors.length > 0 ? combinedErrors : undefined,
        leads: insertedLeads,
        skippedDuplicates: dupErrors.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk importing leads:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import leads',
      },
      { status: 500 }
    );
  }
}
