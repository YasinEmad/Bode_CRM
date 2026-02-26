import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // حماية مسارات /admin و /sales و /media-buyer
  if (pathname.startsWith('/admin') || pathname.startsWith('/sales') || pathname.startsWith('/media-buyer')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 3. الماتشر بيحدد للميدل وير يشتغل فين بالظبط، وده بيوفر أداء (Performance)
export const config = {
  matcher: [
    '/admin/:path*', 
    '/sales/:path*',
    '/media-buyer/:path*',
    '/login' // ضفنا الـ login عشان لو مسجل دخول مايدخلهاش تاني
  ],
};