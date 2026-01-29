# KPI System - Troubleshooting Guide

## ✅ تم إصلاح المشكلة

### المشكلة الأصلية:
```
Error fetching KPI settings: Error: Failed to fetch KPI settings
```

### السبب:
كان API endpoint `/api/kpi-settings` يتطلب صلاحية Admin فقط، لكن Monthly Employee Report تحتاج إلى جلب الإعدادات لحساب KPI.

### الحل المطبق:
تم تعديل الـ GET endpoint للسماح لأي مستخدم مصرح (لا يقتصر على Admin):
- **GET**: متاح لجميع المستخدمين المصرح لهم ✅
- **PUT**: محصور لـ Admin فقط (التعديل) ✅

---

## 🔧 التعديلات المطبقة

### 1. API Endpoint (`src/app/api/kpi-settings/route.ts`)
```typescript
// قبل (خطأ):
if (!payload || payload.role !== 'admin') {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
}

// بعد (صحيح):
if (!payload) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// السماح لأي مستخدم مصرح بمشاهدة الإعدادات
```

### 2. معالجة الأخطاء (`src/app/admin/monthly-employee-report/page.tsx`)
```typescript
// أضيفت معالجة أفضل للأخطاء
const errorData = await res.json().catch(() => ({}));
console.error('KPI API Error:', res.status, errorData);
setKpiLoadError(errorData.error || 'Failed to load KPI settings');
```

---

## 📋 خطوات التحقق

### ✅ التحقق 1: البناء
```bash
npm run build
# يجب أن ترى: ✓ Compiled successfully
```

### ✅ التحقق 2: تشغيل الخادم
```bash
npm run dev
# يجب أن يبدأ بدون أخطاء
```

### ✅ التحقق 3: اختبار API مباشرة
```bash
# الحصول على KPI Settings
curl -X GET http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# يجب أن تحصل على:
{
  "kpiSettings": {
    "_id": "...",
    "indicators": [...],
    "totalWeight": 100
  }
}
```

---

## 🚀 الاستخدام الآن

### 1. الوصول للتقرير الشهري
```
Admin Dashboard 
  → Monthly Employee Report
    → اختر شهر وسنة
```

### 2. يجب أن تظهر:
- ✅ تحميل بيانات الموظفين
- ✅ حساب KPI تلقائياً
- ✅ عمود "KPI %" في الجدول
- ✅ بدون رسائل خطأ

### 3. إذا كان هناك تحذير:
```
⚠️ KPI Settings Warning
Failed to load KPI settings. 
KPI percentages will not be calculated.
```

**الحل**: انتقل لـ System Settings → KPI Settings وتأكد من حفظ الإعدادات.

---

## 🔍 اختبار KPI Calculation

### مثال اختبار يدوي:

**البيانات:**
- Attendance: 85%
- Deals: 2
- Calls: 25
- Meetings: 6
- Assessments: 4

**مع الإعدادات الافتراضية:**
- Attendance Target: 95%, Weight: 12.5%
- Deals Target: 2, Weight: 50%
- Calls Target: 20, Weight: 12.5%
- Meetings Target: 5, Weight: 12.5%
- Assessments Target: 3, Weight: 12.5%

**النتيجة المتوقعة:**
```
Attendance: (85/95) × 12.5% = 11.18%
Deals: (2/2) × 50% = 50%
Calls: (25/20) × 12.5% = 12.5% (محدود بـ 100%)
Meetings: (6/5) × 12.5% = 12.5% (محدود بـ 100%)
Assessments: (4/3) × 12.5% = 12.5% (محدود بـ 100%)
─────────────────────────
Total KPI: 98.68%
```

---

## 📊 رسائل الأخطاء المتوقعة

### 1. "Failed to fetch KPI settings" 
**الأسباب المحتملة:**
- ❌ Token منتهي الصلاحية → الحل: أعد تسجيل الدخول
- ❌ قاعدة البيانات غير متصلة → الحل: تحقق من MongoDB
- ❌ خطأ في الخادم → الحل: تحقق من الـ console logs

**الخطوات:**
1. افتح `Console` في المتصفح (F12)
2. ابحث عن رسالة خطأ تفصيلية
3. اقرأ في `Network` tab المجلدة للـ API

### 2. "Admin access required"
**السبب:** حاولت تعديل الإعدادات (PUT) بدون صلاحية Admin
**الحل:** استخدم حساب Admin فقط للتعديل

### 3. "Total weight must equal 100%"
**السبب:** مجموع أوزان المؤشرات ≠ 100%
**الحل:** 
- افتح KPI Settings
- تحقق من أن المجموع = 100%
- اضغط Save

---

## 🧪 اختبار شامل

### Checklist:

- [ ] قم بفتح Developer Tools (F12)
- [ ] قم بتسجيل الدخول كـ Admin
- [ ] انتقل للـ Settings → KPI Settings
- [ ] تحقق من أن الإعدادات تحملت بنجاح
- [ ] غيّر قيمة أو وزن
- [ ] اضغط Save
- [ ] انتقل للـ Monthly Employee Report
- [ ] اختر شهر وسنة
- [ ] تحقق من أن:
  - [ ] البيانات حملت
  - [ ] عمود KPI موجود
  - [ ] القيم محسوبة (ليست 0)
  - [ ] لا توجد رسائل خطأ في console

---

## 💾 حفظ البيانات

### متى يتم التحديث:
1. **أول زيارة**: تُنشأ إعدادات افتراضية
2. **بعد التعديل**: تُحفظ في قاعدة البيانات
3. **عند الحساب**: تُجلب من قاعدة البيانات

### التحقق من قاعدة البيانات:
```javascript
// في MongoDB:
db.kpisettings.find()
// يجب أن ترى سجل واحد فقط
```

---

## 🔐 الصلاحيات (Fixed)

### GET /api/kpi-settings
| User Type | Access |
|-----------|--------|
| Admin | ✅ |
| Team Leader | ✅ |
| Sales Rep | ✅ |
| Guest | ❌ |

### PUT /api/kpi-settings
| User Type | Access |
|-----------|--------|
| Admin | ✅ |
| Others | ❌ |

---

## 📝 ملاحظات هامة

### 1. Caching
- البيانات تُحمل عند كل تحديث للشهر/السنة
- لا يوجد caching client-side (يتحدث دائماً مع الخادم)

### 2. Performance
- حساب KPI يتم على client-side (سريع)
- جلب الإعدادات يتم مرة واحدة فقط

### 3. Reliability
- إذا فشل تحميل الإعدادات، يتم عرض تحذير
- KPI = 0 إذا لم تحمل الإعدادات (أفضل من الخطأ الكامل)

---

## 🎯 التالي

### لقد تم:
✅ إنشاء نظام KPI كامل
✅ دمج مع Monthly Reports
✅ إصلاح مشاكل الصلاحيات
✅ تحسين معالجة الأخطاء

### الخطوات التالية:
- [ ] اختبر النظام بنفسك
- [ ] أخبرني بأي مشاكل أخرى
- [ ] نمّي النظام بميزات جديدة

---

**آخر تحديث**: 2026-01-29  
**الحالة**: ✅ تم إصلاح المشكلة
