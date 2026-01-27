/**
 * مثال لتحديث الـ handleMarkAttendance في src/app/sales/attendance/page.tsx
 * 
 * هذا ملف توثيقي يوضح كيفية استخدام ميزة deviceId في صفحة الحضور
 * انسخ الكود الأساسي من هنا وادمجه في صفحتك
 */

// ============================================
// الخطوة 1: إضافة الاستيراد في الأعلى
// ============================================
// في بداية الملف src/app/sales/attendance/page.tsx، أضف:
import { getDeviceId } from '@/lib/deviceId'; // استيراد مكتبة deviceId


// ============================================
// الخطوة 2: تحديث دالة handleMarkAttendance
// ============================================
/*
استبدل دالة handleMarkAttendance الحالية بهذا الكود:

const handleMarkAttendance = async () => {
  if (!navigator.geolocation) {
    addToast('Geolocation not supported on this device', 'error');
    return;
  }

  setIsMarking(true);
  const toastId = addToast('Getting your location...', 'loading');

  try {
    // الحصول على موقع المستخدم
    const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    // 🆕 الحصول على معرف الجهاز (الكود الجديد)
    const deviceId = getDeviceId();

    console.log('Check-in attempt:', { 
      latitude: position.latitude, 
      longitude: position.longitude,
      accuracy: position.accuracy,
      deviceId: deviceId  // معرف الجهاز الفريد
    });

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: position.latitude,
        longitude: position.longitude,
        deviceId: deviceId,  // 🆕 إضافة deviceId إلى الطلب
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      
      // 🆕 معالجة خاصة لخطأ device mismatch
      if (errorData.reason === 'DEVICE_MISMATCH') {
        updateToast(
          toastId,
          '🔒 خطأ: أنت تحاول تسجيل الحضور من جهاز مختلف. يرجى استخدام الجهاز المسجل معك.',
          'error'
        );
      } else {
        throw new Error(errorData.error || 'Failed to mark attendance');
      }
      return;
    }

    const data = await res.json();

    if (data.isLate) {
      const hours = Math.floor(data.lateMinutes / 60);
      const minutes = data.lateMinutes % 60;
      let lateMessage = `⏰ You are ${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}${hours > 0 && minutes > 0 ? ' and ' : ''}${hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : ''} late!`;
      updateToast(toastId, lateMessage, 'error');
    } else {
      updateToast(toastId, '✓ Attendance marked successfully on time!', 'success');
    }

    fetchAttendance();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to mark attendance';
    console.error('Attendance error:', errorMsg);
    updateToast(
      toastId,
      errorMsg,
      'error'
    );
  } finally {
    setIsMarking(false);
  }
};
*/
