import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. التأكد من وجود المفتاح السري فوراً
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
}

// 2. تعريف شكل البيانات داخل التوكن (Type Safety)
interface JWTPayload {
  userId: string;
  role: 'admin' | 'sales' | 'media buyer';
  type: 'session' | 'refresh';
}

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * تشفير كلمة المرور
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * إصدار توكن جديد مع النوع (Generic Type)
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: TOKEN_EXPIRY });
}

/**
 * فحص التوكن مع معالجة الأخطاء
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (error) {
    // هنا ممكن تعرف لو التوكن انتهى (Expired) أو ملعوب فيه
    return null;
  }
}

/**
 * إنشاء توكن الجلسة (Helper function)
 */
export function generateSessionToken(userId: string, role: 'admin' | 'sales' | 'media buyer'): string {
  return signToken({ userId, role, type: 'session' });
}

/**
 * استخراج التوكن من الطلب (من Headers أو Cookies)
 */
export function extractTokenFromRequest(req: any): string | null {
  // محاولة استخراج التوكن من Authorization header
  const authHeader = req.headers.get?.('authorization') || req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // محاولة استخراج التوكن من Cookies
  const cookieHeader = req.headers.get?.('cookie') || req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c: string) => c.trim());
    for (const cookie of cookies) {
      // Check for 'token' cookie first (our JWT token)
      if (cookie.startsWith('token=') && !cookie.includes('sessionToken')) {
        const tokenValue = cookie.slice(6);
        console.log('[extractTokenFromRequest] Found token in cookies');
        return tokenValue;
      }
    }
  }

  console.log('[extractTokenFromRequest] No token found in headers or cookies');
  return null;
}