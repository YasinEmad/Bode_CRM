import { NextRequest, NextResponse } from 'next/server';

// Placeholder route: Cloudinary support was removed in favor of ImageKit.
export async function POST(req: NextRequest) {
  console.log('[CLOUDINARY-PLACEHOLDER] Received request but Cloudinary support removed');
  return NextResponse.json({ error: 'Cloudinary upload endpoint removed; use ImageKit' }, { status: 410 });
}
