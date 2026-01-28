import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ success: true }, { status: 200 });
    try {
      res.cookies.set('token', '', { path: '/', maxAge: 0 });
    } catch (e) {
      // ignore
    }
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
