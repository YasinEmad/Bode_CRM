import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  console.log('[CLOUDINARY] POST request received');
  try {
    // Accept either JSON `{ image: 'data:...base64...' }` or multipart/form-data with file field
    let image: string | undefined;
    try {
      const contentType = (req.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const file = form.get('proofImage') || form.get('image');
        if (!file) {
          console.log('[CLOUDINARY] No file found in formData (expected proofImage or image)');
          return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        // file is a File-like object; read as arrayBuffer then convert to data URL
        // cast to any because Next's FormData File type may vary
        const anyFile: any = file;
        const arrayBuffer = await anyFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = anyFile.type || 'application/octet-stream';
        image = `data:${mime};base64,${buffer.toString('base64')}`;
        console.log('[CLOUDINARY] FormData received, file size bytes:', buffer.length);
      } else {
        const body = await req.json();
        image = body.image;
        console.log('[CLOUDINARY] Body received, image size:', image ? image.length : 0);
      }
    } catch (err) {
      console.error('[CLOUDINARY] Failed to parse request body', err);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    if (!image) {
      console.log('[CLOUDINARY] No image provided');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;
    let cloudinaryUrl = process.env.CLOUDINARY_URL;

    console.log('[CLOUDINARY] Config check:', {
      cloudName: cloudName ? `${cloudName.slice(0, 5)}...` : 'MISSING',
      apiKey: apiKey ? 'set' : 'MISSING',
      apiSecret: apiSecret ? 'set' : 'MISSING',
      cloudinaryUrl: cloudinaryUrl ? 'set' : 'MISSING',
    });

    // Prefer explicit vars, otherwise fall back to CLOUDINARY_URL if present
    if (cloudName && apiKey && apiSecret) {
      console.log('[CLOUDINARY] Configuring cloudinary from individual env vars...');
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else if (cloudinaryUrl) {
      console.log('[CLOUDINARY] Individual vars missing; using CLOUDINARY_URL fallback');
      // Let the cloudinary library read CLOUDINARY_URL from process.env
      cloudinary.config({ secure: true });
    } else {
      // Try reading .env.local at runtime (dev fallback)
      try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        console.log('[CLOUDINARY] Attempting to read .env.local from', envPath);
        const envText = await fs.readFile(envPath, 'utf8');
        const lines = envText.split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
          if (!m) continue;
          const key = m[1];
          let val = m[2] || '';
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === 'CLOUDINARY_CLOUD_NAME' && !cloudName) cloudName = val;
          if (key === 'CLOUDINARY_API_KEY' && !apiKey) apiKey = val;
          if (key === 'CLOUDINARY_API_SECRET' && !apiSecret) apiSecret = val;
          if (key === 'CLOUDINARY_URL' && !cloudinaryUrl) cloudinaryUrl = val;
        }
        console.log('[CLOUDINARY] Read .env.local values:', {
          cloudName: cloudName ? `${cloudName.slice(0,5)}...` : 'MISSING',
          apiKey: apiKey ? 'set' : 'MISSING',
          apiSecret: apiSecret ? 'set' : 'MISSING',
          cloudinaryUrl: cloudinaryUrl ? 'set' : 'MISSING',
        });
        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        } else if (cloudinaryUrl) {
          cloudinary.config({ secure: true });
        } else {
          console.log('[CLOUDINARY] Missing config (no individual vars, no CLOUDINARY_URL even after .env.local)');
          return NextResponse.json({ error: 'Cloudinary not configured on server' }, { status: 500 });
        }
      } catch (e) {
        console.error('[CLOUDINARY] Failed to read .env.local fallback:', e);
        return NextResponse.json({ error: 'Cloudinary not configured on server' }, { status: 500 });
      }
    }

    console.log('[CLOUDINARY] Starting upload...');
    const result = await cloudinary.uploader.upload(image, {
      folder: 'proofs',
      resource_type: 'image',
    });

    console.log('[CLOUDINARY] Upload successful:', result.public_id);
    return NextResponse.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error('[CLOUDINARY] Error occurred:', error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[CLOUDINARY] Error details:', {
      message: msg,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      fullError: error,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
