// src/lib/deviceId.ts
// مكتبة للتعامل مع deviceId

/**
 * توليد بصمة جهاز فريدة وثابتة
 * تُحسب من خصائص ثابتة في الجهاز وترسل للـ API
 * الـ API هو المسؤول عن حفظها في قاعدة البيانات
 */
export function generateDeviceId(): string {
  return createDeviceFingerprint();
}

/**
 * إنشاء بصمة جهاز فريدة من خصائص ثابتة
 */
function createDeviceFingerprint(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hardwareCores = navigator.hardwareConcurrency || 'na';

  const fingerprint_data = [
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    timezone,
    hardwareCores,
  ].join('|');

  return btoa(fingerprint_data);
}

/**
 * الحصول على معرف الجهاز الحالي (مع caching في localStorage)
 */
export function getDeviceId(): string {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    const newId = generateDeviceId();
    console.log('[getDeviceId] Server-side generation:', newId.substring(0, 20) + '...');
    return newId;
  }

  // Get cached device ID from localStorage
  const cachedDeviceId = localStorage.getItem('bode_device_id');
  
  if (cachedDeviceId) {
    console.log('[getDeviceId] Retrieved from localStorage:', cachedDeviceId.substring(0, 20) + '...');
    return cachedDeviceId;
  }

  // Generate new device ID and cache it
  const newDeviceId = generateDeviceId();
  console.log('[getDeviceId] Generated new ID:', newDeviceId.substring(0, 20) + '...');
  console.log('[getDeviceId] Saving to localStorage...');
  
  try {
    localStorage.setItem('bode_device_id', newDeviceId);
    console.log('[getDeviceId] Successfully saved to localStorage');
  } catch (error) {
    console.error('[getDeviceId] Failed to save to localStorage:', error);
  }
  
  return newDeviceId;
}

/**
 * إعادة تعيين معرف الجهاز (للاستخدام لما الموظف يجيب جهاز جديد)
 */
export function resetDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bode_device_id');
  }
}

/**
 * مقارنة بسيطة: هل البصمات متطابقة
 */
export function compareDeviceIds(savedDeviceId: string, currentDeviceId: string): boolean {
  return savedDeviceId === currentDeviceId;
}
