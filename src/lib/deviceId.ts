// src/lib/deviceId.ts
// مكتبة للتعامل مع deviceId

/**
 * توليد معرف فريد للجهاز
 * يعتمد على معلومات المتصفح وخصائص الجهاز
 */
export function generateDeviceId(): string {
  // محاولة الحصول على معرف فريد من localStorage أولاً
  const stored = localStorage.getItem('app_device_id');
  if (stored) {
    return stored;
  }

  // إذا لم يوجد، نولد واحد جديد
  const deviceId = createUniqueDeviceId();
  localStorage.setItem('app_device_id', deviceId);
  return deviceId;
}

/**
 * إنشاء معرف جهاز فريد بناءً على معلومات المتصفح
 */
function createUniqueDeviceId(): string {
  const navigator_data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
  ].join('|');

  const device_id = `${btoa(navigator_data)}-${Date.now()}`;
  return device_id;
}

/**
 * الحصول على معرف الجهاز الحالي
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * إعادة تعيين معرف الجهاز (يمكن استخدامه عند تسجيل الخروج)
 */
export function resetDeviceId(): void {
  localStorage.removeItem('app_device_id');
}
