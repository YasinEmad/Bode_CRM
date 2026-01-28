import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyPassword, generateSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await req.json();
    console.log('[Login API] Login attempt:', { username });

    // 1. التحقق من المدخلات (مع تنظيف اسم المستخدم)
    if (!username || !password) {
      console.log('[Login API] Missing username or password');
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    // البحث عن المستخدم (تحويل الاسم لـ lowercase لضمان التطابق)
    const cleanUsername = username.trim().toLowerCase();
    console.log('[Login API] Looking for user:', cleanUsername);
    const user = await User.findOne({ username: cleanUsername });

    // 2. رسالة خطأ موحدة للأمان (عشان محدش يعرف اليوزر موجود ولا لأ)
    if (!user) {
      console.log('[Login API] User not found:', cleanUsername);
      // Try also with the original case
      const userOriginal = await User.findOne({ username: username.trim() });
      if (!userOriginal) {
        console.log('[Login API] User not found with original case either');
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      console.log('[Login API] User found with original case:', userOriginal.username);
    }

    const finalUser = user || await User.findOne({ username: username.trim() });
    
    // 3. التحقق من الباسورد
    console.log('[Login API] Verifying password...');
    const isPasswordValid = await verifyPassword(password, finalUser!.password);
    console.log('[Login API] Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('[Login API] Password verification failed');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 4. إنشاء التوكن
    const token = generateSessionToken(finalUser!._id.toString(), finalUser!.role);
    console.log('[Login API] Token created successfully:', token.substring(0, 20) + '...');

    // 5. تجهيز الرد وإضافة الـ Cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: finalUser!._id.toString(),
        username: finalUser!.username,
        name: finalUser!.name,
        role: finalUser!.role,
      },
      token 
    });

    // إعداد الكوكي
    console.log('[Login API] Setting token cookie...');
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: false, // Always false in dev
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Add a debug header to verify cookie is being set
    response.headers.set('Set-Cookie', `token=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`);
    
    console.log('[Login API] Response prepared, returning...');
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}