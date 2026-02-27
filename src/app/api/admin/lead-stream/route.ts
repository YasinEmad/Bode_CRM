import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';

function extractToken(req: NextRequest): string | null {
  const token = req.nextUrl.searchParams.get('token');
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return token || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    const { verifyToken } = await import('@/lib/auth');
    if (!token) return new Response('Unauthorized', { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return new Response('Forbidden', { status: 403 });

    await connectDB();
    const Lead = (await import('@/models/Lead')).default;

    const stream = Lead.watch(
      [{ $match: { operationType: 'insert' } }],
      { fullDocument: 'updateLookup' }
    );

    let onChange: ((change: any) => void) | null = null;

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(': connected\n\n'));

        onChange = (change: any) => {
          try {
            const doc = change.fullDocument;
            const data = JSON.stringify({
              _id: String(doc._id),
              name: doc.name,
              phone: doc.phone,
              project: doc.project,
              createdAt: doc.createdAt
            });
            const payload = `event: new-lead\nid: ${String(doc._id)}\ndata: ${data}\n\n`;
            controller.enqueue(new TextEncoder().encode(payload));
          } catch (e) {
            // ignore
          }
        };

        stream.on('change', onChange);
      },
      cancel() {
        if (onChange) stream.removeListener('change', onChange);
        stream.close();
      }
    });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    console.error('Lead stream error', e);
    return new Response('Server error', { status: 500 });
  }
}