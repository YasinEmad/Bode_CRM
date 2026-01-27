# ميزة التحقق من معرف الجهاز (Device ID Verification)

## الوصف
تم إضافة نظام التحقق من معرف الجهاز في عملية تسجيل الحضور (Check-in) لمنع الموظفين من تسجيل حضور بدلاً من موظفين آخرين حتى لو امتلكوا كلمات المرور.

## آلية العمل

### 1. أول عملية Check-in
عند قيام موظف بتسجيل الحضور لأول مرة:
- يرسل **deviceId** من الجهاز الذي يستخدمه
- النظام يحفظ هذا **deviceId** في قاعدة البيانات على حساب الموظف
- يتم السماح بإكمال عملية التسجيل

### 2. عمليات Check-in اللاحقة
في أي تسجيل حضور جديد:
- الموظف يرسل **deviceId** من الجهاز الحالي
- النظام يقارن **deviceId** الحالي مع **deviceId** المحفوظ في قاعدة البيانات
- **إذا تطابق**: يتم السماح بالتسجيل ✅
- **إذا اختلف**: يتم رفض العملية برسالة خطأ 🔒

## التغييرات المطبقة

### 1. نموذج User (`src/models/User.ts`)
```typescript
// تم إضافة الحقل الجديد:
deviceId?: string; // Device ID for check-in verification
```

### 2. نموذج Attendance (`src/models/Attendance.ts`)
```typescript
// تم إضافة الحقل الجديد:
deviceId: string; // Device ID used for check-in
```

### 3. API Attendance (`src/app/api/attendance/route.ts`)

#### التغييرات الرئيسية:
1. **استيراد نموذج User**
   ```typescript
   import User from '@/models/User';
   ```

2. **قراءة deviceId من الطلب**
   ```typescript
   const { latitude, longitude, deviceId } = await req.json();
   ```

3. **التحقق من deviceId**
   ```typescript
   // الحصول على المستخدم
   const user = await User.findById(payload.userId);

   // إذا كان لديه deviceId محفوظ، يجب أن يطابق الحالي
   if (user.deviceId) {
     if (user.deviceId !== deviceId) {
       // رفض العملية
       return NextResponse.json(
         { 
           error: 'Invalid device. You are trying to check in from a different device.',
           reason: 'DEVICE_MISMATCH'
         },
         { status: 403 }
       );
     }
   } else {
     // أول مرة: حفظ deviceId
     user.deviceId = deviceId;
     await user.save();
   }
   ```

4. **حفظ deviceId في سجل الحضور**
   ```typescript
   const attendance = await Attendance.create({
     // ... باقي البيانات
     deviceId, // Save the device ID used for check-in
   });
   ```

## كيفية التكامل من جانب Frontend

### إرسال طلب Check-in مع deviceId

```typescript
// الحصول على deviceId من الجهاز (Browser/Native App)
const getDeviceId = async () => {
  // اختر أحد الطرق:
  
  // 1. للتطبيقات الويب (Web)
  const deviceId = `web-${navigator.userAgent.substring(0, 50)}`;
  
  // 2. للتطبيقات الأصلية (React Native/Native)
  // استخدم مكتبة مثل: react-native-device-info
  
  return deviceId;
};

// إرسال طلب Check-in
const checkIn = async (latitude, longitude) => {
  const deviceId = await getDeviceId();
  
  const response = await fetch('/api/attendance', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      latitude,
      longitude,
      deviceId, // إضافة deviceId
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (data.reason === 'DEVICE_MISMATCH') {
      // عرض رسالة خطأ خاصة للجهاز الخاطئ
      console.error('جهاز مختلف عن الجهاز المسجل');
    }
  }
  
  return data;
};
```

## رسائل الأخطاء

### 1. Device ID مفقود
```json
{
  "error": "Device ID is required for check-in",
  "status": 400
}
```

### 2. جهاز غير متطابق
```json
{
  "error": "Invalid device. You are trying to check in from a different device. Please use the device you registered with.",
  "reason": "DEVICE_MISMATCH",
  "status": 403
}
```

## الفوائد الأمنية

✅ **منع التزييف**: يمنع موظف من تسجيل حضور باستخدام بيانات موظف آخر  
✅ **التتبع الآمن**: يضمن أن الحضور يتم من الجهاز المسجل فقط  
✅ **سجل مراجعة**: كل سجل حضور يحفظ معرف الجهاز المستخدم  
✅ **سهل التنفيذ**: يتكامل بسهولة مع الأنظمة الموجودة  

## ملاحظات مهمة

1. **طاقة الحوسبة**: يمكن للمسؤول إعادة تعيين deviceId لموظف من خلال لوحة التحكم (قد نحتاج إضافة هذه الميزة)
2. **الأجهزة المتعددة**: إذا أراد موظف استخدام أجهزة متعددة، سيحتاج إلى تغيير من البداية
3. **الأمان**: تأكد من استخدام deviceId قوي وفريد لكل جهاز

## خطوات الاختبار

```bash
# 1. إعادة تشغيل الخادم
pnpm dev

# 2. اختبر first check-in مع deviceId
curl -X POST http://localhost:3000/api/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 24.7136,
    "longitude": 46.6753,
    "deviceId": "device-123"
  }'

# 3. اختبر check-in من نفس الجهاز (نفس deviceId)
# يجب أن ينجح ✅

# 4. اختبر check-in من جهاز مختلف (deviceId مختلف)
# يجب أن يفشل ❌
```
