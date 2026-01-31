# GPS/Geolocation Quick Reference Guide

## 🎯 في 30 ثانية

تم إنشاء مكتبة GPS موحدة تضمن قراءة دقيقة وموثوقة للموقع في جميع أنحاء التطبيق.

**الملف**: `src/lib/geolocation.ts`

## 📦 الدوال المتاحة

### 1. `getCurrentPosition()`
قراءة موقع المستخدم بدقة عالية:

```typescript
import { getCurrentPosition, ACCURACY_THRESHOLDS } from '@/lib/geolocation';

getCurrentPosition(
  (result) => {
    console.log(result.latitude);
    console.log(result.longitude);
    console.log(result.accuracy); // بالمتر
  },
  (error) => {
    console.error(error.message);
  },
  {
    minAccuracyThreshold: ACCURACY_THRESHOLDS.GOOD,
    requireHighAccuracy: true,
  }
);
```

### 2. `isValidCoordinate()`
التحقق من صحة الإحداثيات:

```typescript
import { isValidCoordinate } from '@/lib/geolocation';

isValidCoordinate(33.3128, 44.3615) // ✅ true
isValidCoordinate(0, 0)              // ❌ false
isValidCoordinate(91, 180)           // ❌ false (خارج النطاق)
```

### 3. `isAccuracyAcceptable()`
التحقق من دقة الموقع:

```typescript
import { isAccuracyAcceptable, ACCURACY_THRESHOLDS } from '@/lib/geolocation';

isAccuracyAcceptable(25, ACCURACY_THRESHOLDS.GOOD) // ✅ true
isAccuracyAcceptable(50, ACCURACY_THRESHOLDS.GOOD) // ❌ false
```

### 4. `getAccuracyLevel()`
تصنيف مستوى الدقة:

```typescript
import { getAccuracyLevel } from '@/lib/geolocation';

getAccuracyLevel(15)  // "EXCELLENT"
getAccuracyLevel(35)  // "ACCEPTABLE"
getAccuracyLevel(150) // "POOR"
```

### 5. `formatAccuracy()`
تنسيق الدقة للعرض:

```typescript
import { formatAccuracy } from '@/lib/geolocation';

formatAccuracy(25)  // "Good (~25m)"
formatAccuracy(150) // "Poor (~150m)"
```

## 🎛️ معايير الدقة

```typescript
import { ACCURACY_THRESHOLDS } from '@/lib/geolocation';

ACCURACY_THRESHOLDS.EXCELLENT  // 10
ACCURACY_THRESHOLDS.GOOD       // 30 ⭐ مطلوب للحضور
ACCURACY_THRESHOLDS.ACCEPTABLE // 50
ACCURACY_THRESHOLDS.POOR       // 100
ACCURACY_THRESHOLDS.VERY_POOR  // 200
```

## 🔧 أمثلة عملية

### استخدام في صفحة جديدة

```typescript
'use client';

import { useToast } from '@/components/Toast';
import { getCurrentPosition, ACCURACY_THRESHOLDS, formatAccuracy } from '@/lib/geolocation';

export default function MyPage() {
  const { addToast } = useToast();

  const handleGetLocation = () => {
    getCurrentPosition(
      (result) => {
        addToast(
          `✅ Location: ${formatAccuracy(result.accuracy)}`,
          'success'
        );
        // استخدم result.latitude و result.longitude
      },
      (error) => {
        addToast(`❌ Error: ${error.message}`, 'error');
      },
      {
        minAccuracyThreshold: ACCURACY_THRESHOLDS.GOOD,
        requireHighAccuracy: true,
      }
    );
  };

  return (
    <button onClick={handleGetLocation}>
      Get Location
    </button>
  );
}
```

## ✅ الصفحات المحدثة

| الصفحة | التحديث |
|-------|---------|
| Admin Settings | ✅ يستخدم الدالة الجديدة |
| Sales Attendance | ✅ يستخدم الدالة الجديدة |
| Attendance API | ✅ يحقق من الإحداثيات |

## 🧪 الاختبار

```bash
# اختبر نقطة التحقق من الموقع
curl -X POST http://localhost:3000/api/debug/validate-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 33.3128,
    "longitude": 44.3615,
    "accuracy": 25
  }'
```

## ❌ الأخطاء الشائعة

| المشكلة | السبب | الحل |
|--------|------|------|
| "Geolocation not supported" | متصفح قديم | استخدم Chrome/Firefox حديث |
| "Location permission denied" | لم تقبل الأذونات | اسمح للموقع في إعدادات المتصفح |
| "The request timed out" | لا يوجد إشارة GPS | انتقل إلى مكان مفتوح |
| "Accuracy exceeds threshold" | GPS ضعيف جداً | انتظر قليلاً أو انتقل |

## 📚 ملفات إضافية

- `docs/GPS_IMPROVEMENTS.md` - شرح تفصيلي
- `LOCATION_FIXES_SUMMARY.md` - ملخص التغييرات
- `src/app/api/debug/validate-location/route.ts` - API للاختبار

## 🚀 للبدء

1. استيراد المكتبة في صفحتك
2. استدعي `getCurrentPosition()`
3. التعامل مع النجاح والفشل
4. ارسل البيانات للخادم

```typescript
import { getCurrentPosition, ACCURACY_THRESHOLDS } from '@/lib/geolocation';

// كل شيء جاهز الآن! 🎉
```

---

التحديث الأخير: 31 يناير 2026 - جاهز للإنتاج ✅
