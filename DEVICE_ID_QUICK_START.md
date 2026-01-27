# 🔐 تطبيق ميزة التحقق من معرف الجهاز

## ✅ ما تم إنجازه بالفعل (Backend)

الكود الخاص بـ Backend جاهز بالكامل في الملفات التالية:
- ✅ `src/models/User.ts` - تم إضافة حقل `deviceId`
- ✅ `src/models/Attendance.ts` - تم إضافة حقل `deviceId`
- ✅ `src/app/api/attendance/route.ts` - تم إضافة منطق التحقق

## 🎯 الخطوات التالية (Frontend)

### خطوة 1: تحديث صفحة Attendance

اسم الملف: `src/app/sales/attendance/page.tsx`

في أعلى الملف، أضف هذا الاستيراد:
```typescript
import { getDeviceId } from '@/lib/deviceId';
```

### خطوة 2: تحديث دالة handleMarkAttendance

ابحث عن دالة `handleMarkAttendance` وجد السطر حيث يتم إرسال الطلب:

```typescript
// ابحث عن هذا الجزء:
const res = await fetch('/api/attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    latitude: position.latitude,
    longitude: position.longitude,
    // ← أضف هنا
  }),
});
```

اجعله بهذا الشكل:

```typescript
// احصل على معرف الجهاز
const deviceId = getDeviceId();

const res = await fetch('/api/attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    latitude: position.latitude,
    longitude: position.longitude,
    deviceId: deviceId, // أضفنا هنا ✅
  }),
});
```

### خطوة 3: معالجة خطأ Device Mismatch

في دالة `handleMarkAttendance`، عدّل جزء معالجة الخطأ:

```typescript
if (!res.ok) {
  const errorData = await res.json();
  
  // أضف هذا الشرط
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
```

---

## 📚 ملفات التوثيق

- 📖 **[DEVICE_ID_FEATURE.md](DEVICE_ID_FEATURE.md)** - شرح مفصل لكيفية عمل الميزة
- 📖 **[DEVICE_ID_CHANGES_SUMMARY.md](DEVICE_ID_CHANGES_SUMMARY.md)** - ملخص التغييرات
- 📖 **[DEVICE_ID_IMPLEMENTATION_EXAMPLE.ts](DEVICE_ID_IMPLEMENTATION_EXAMPLE.ts)** - مثال عملي كامل

---

## 🧪 اختبار سريع

### 1. تشغيل الخادم
```bash
pnpm dev
```

### 2. اختبر من جهازك أو باستخدام curl:

```bash
# اختبار أول check-in (حفظ deviceId)
curl -X POST http://localhost:3000/api/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 24.7136,
    "longitude": 46.6753,
    "deviceId": "test-device-001"
  }'
```

**النتيجة المتوقعة:** ✅ نجاح التسجيل

```bash
# اختبار check-in من جهاز مختلف
curl -X POST http://localhost:3000/api/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 24.7136,
    "longitude": 46.6753,
    "deviceId": "test-device-999"
  }'
```

**النتيجة المتوقعة:** ❌ خطأ 403 مع رسالة `DEVICE_MISMATCH`

---

## 💾 ما هو localStorage؟

المكتبة `src/lib/deviceId.ts` تستخدم `localStorage` لحفظ معرف الجهاز:
- يُحفظ في متصفح المستخدم بشكل آمن
- لا يُحذف إلا إذا فرغ المستخدم بيانات المتصفح
- يستمر طالما لم يُفرغ التخزين

---

## ⚠️ نقاط مهمة

1. **لا تقلق من معرف الجهاز**: المكتبة تنشئه تلقائياً في أول مرة
2. **المستخدم لا يفعل شيء**: كل شيء يحدث تلقائياً في الخلفية
3. **أمان**: لا يمكن لموظف تسجيل حضور موظف آخر حتى لو كان لديه كلمة السر

---

## 🔍 استكشاف الأخطاء

إذا واجهت مشكلة:

1. **خطأ "Device ID is required"**
   - تأكد من إرسال `deviceId` في الطلب

2. **خطأ "Invalid device"**
   - هذا الخطأ مقصود! الموظف يحاول استخدام جهاز مختلف

3. **مشكلة localStorage**
   - جرب فتح developer tools (F12) وفحص Application → localStorage

---

## ✨ ميزات إضافية (اختيارية)

إذا أردت في المستقبل:

- ❓ اسمح للموظف باستخدام أجهزة متعددة
- ❓ أضف خيار "نسيت جهازي؟" في واجهة تسجيل الدخول
- ❓ أضف لوحة تحكم Admin لإعادة تعيين deviceId

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع ملفات التوثيق أعلاه
2. تحقق من رسائل الخطأ في console
3. جرب الأمثلة في DEVICE_ID_FEATURE.md
