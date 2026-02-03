import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file, fileName } = body as { file?: string; fileName?: string };
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (!process.env.IMAGEKIT_PRIVATE_KEY) {
      console.error('[IMAGEKIT-SERVER] Missing IMAGEKIT_PRIVATE_KEY');
      return NextResponse.json({ error: 'Image upload not configured on server' }, { status: 500 });
    }

    const form = new FormData();
    form.append('file', file);
    if (fileName) form.append('fileName', fileName);
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

    const uploadJson = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      console.error('[IMAGEKIT-SERVER] upload failed', uploadJson);
      return NextResponse.json({ error: uploadJson }, { status: 500 });
    }

    let imageUrl = uploadJson.url || '';
    if ((!imageUrl || imageUrl === '') && process.env.IMAGEKIT_URL_ENDPOINT && uploadJson.filePath) {
      imageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '')}/${uploadJson.filePath.replace(/^\//, '')}`;
    }

    return NextResponse.json({ url: imageUrl || uploadJson.url, raw: uploadJson });
  } catch (err: any) {
    console.error('[IMAGEKIT-SERVER] Unexpected error', err?.message ?? err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
