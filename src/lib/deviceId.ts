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
 * الحصول على معرف الجهاز الحالي
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * إعادة تعيين معرف الجهاز
 */
export function resetDeviceId(): void {
  // No local storage to clear - device ID is managed by backend
}

/**
 * مقارنة بسيطة: هل البصمات متطابقة
 */
export function compareDeviceIds(savedDeviceId: string, currentDeviceId: string): boolean {
  return savedDeviceId === currentDeviceId;
}
