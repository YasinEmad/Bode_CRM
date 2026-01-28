import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // 1. لو اليوزر "مُسجل دخول" وبيحاول يدخل صفحة الـ Login، وديه لصفحة الداشبورد
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url)); // أو أي صفحة افتراضية
  }

  // 2. حماية مسارات /admin و /sales
  if (pathname.startsWith('/admin') || pathname.startsWith('/sales')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname); // عشان يرجع لنفس الصفحة بعد ما يسجل
      return NextResponse.redirect(loginUrl);
    }

    // (اختياري) لو عايز تفك التوكن وتعرف الدور (Role) في الميدل وير، 
    // لازم تستخدم مكتبة 'jose' بدل 'jsonwebtoken' لأنها بتشتغل في الـ Edge.
  }

  return NextResponse.next();
}

// 3. الماتشر بيحدد للميدل وير يشتغل فين بالظبط، وده بيوفر أداء (Performance)
export const config = {
  matcher: [
    '/admin/:path*', 
    '/sales/:path*',
    '/login' // ضفنا الـ login عشان لو مسجل دخول مايدخلهاش تاني
  ],
};