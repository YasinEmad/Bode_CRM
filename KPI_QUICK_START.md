# KPI Management System - Quick Start Guide

## ✅ تم الإنجاز

تم إضافة نظام إدارة KPI متكامل إلى تطبيق Bode CRM.

## 📋 الملفات المنشأة/المعدلة

### ملفات جديدة:
1. ✅ `src/models/KPISetting.ts` - نموذج قاعدة البيانات
2. ✅ `src/app/api/kpi-settings/route.ts` - API endpoints
3. ✅ `src/lib/kpiCalculator.ts` - دوال حساب KPI (160+ سطر)
4. ✅ `src/app/admin/settings/kpi/page.tsx` - صفحة إعدادات KPI (بواجهة عربية/إنجليزية)

### ملفات معدلة:
1. ✅ `src/app/admin/settings/page.tsx` - إضافة زر KPI Settings
2. ✅ `src/app/admin/monthly-employee-report/page.tsx` - دمج حسابات KPI

---

## 🚀 الميزات الرئيسية

### 1. إدارة المؤشرات (5 مؤشرات)
- **نسبة الحضور** (Attendance)
  - Target: مثلاً 95%
  - Weight: مثلاً 12.5%
  
- **الصفقات المغلقة** (Deals)
  - Target: مثلاً 2 صفقة
  - Weight: مثلاً 50%
  
- **المكالمات** (Calls)
  - Target: مثلاً 20 مكالمة
  - Weight: مثلاً 12.5%
  
- **الاجتماعات** (Meetings)
  - Target: مثلاً 5 اجتماعات
  - Weight: مثلاً 12.5%
  
- **التقييمات** (Assessments)
  - Target: مثلاً 3 تقييمات
  - Weight: مثلاً 12.5%

### 2. معادلة الحساب
```
النسبة المحققة = القيمة الفعلية / الهدف
القيمة المكتسبة = النسبة المحققة × الوزن
إجمالي KPI = مجموع القيم المكتسبة
```

### 3. التحقق من صحة البيانات
- مجموع الأوزان يجب أن يساوي 100%
- لا يمكن حفظ البيانات إذا كانت غير صحيحة
- رسائل خطأ واضحة

### 4. التخزين والاسترجاع
- حفظ في قاعدة البيانات
- سجل واحد فقط
- قابل للتعديل في أي وقت

---

## 📝 كيفية الاستخدام

### الخطوة 1: الوصول لإعدادات KPI
```
Admin Dashboard 
  → System Settings 
    → (قسم KPI Settings جديد)
      → اضغط على "Open KPI Settings Page"
```

### الخطوة 2: تحديث الإعدادات
1. عدّل قيم Target و Weight لكل مؤشر
2. تأكد من أن مجموع الأوزان = 100%
3. اضغط "Save KPI Settings"

### الخطوة 3: عرض التقارير
```
Admin Dashboard 
  → Monthly Employee Report
    → سيتم حساب KPI تلقائياً
      → عمود KPI الجديد يظهر في الجدول
```

---

## 🔧 API Endpoints

### GET /api/kpi-settings
جلب إعدادات KPI الحالية

```bash
curl -X GET http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### PUT /api/kpi-settings
تحديث إعدادات KPI

```bash
curl -X PUT http://localhost:3000/api/kpi-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "indicators": [
      {"name": "attendance", "target": 95, "weight": 12.5},
      {"name": "deals", "target": 2, "weight": 50},
      {"name": "calls", "target": 20, "weight": 12.5},
      {"name": "meetings", "target": 5, "weight": 12.5},
      {"name": "assessments", "target": 3, "weight": 12.5}
    ]
  }'
```

---

## 📊 مثال حسابي تفصيلي

### الإعدادات الافتراضية:
| المؤشر | Target | Weight |
|-------|--------|--------|
| Attendance | 95% | 12.5% |
| Deals | 2 | 50% |
| Calls | 20 | 12.5% |
| Meetings | 5 | 12.5% |
| Assessments | 3 | 12.5% |

### بيانات الموظف (أحمد):
| المؤشر | القيمة الفعلية |
|-------|-----------------|
| Attendance | 90% |
| Deals | 1 |
| Calls | 18 |
| Meetings | 4 |
| Assessments | 2 |

### الحسابات:

**1. Attendance:**
- النسبة المحققة = 90 / 95 = 94.74%
- KPI = 94.74% × 12.5% = **11.84%**

**2. Deals:**
- النسبة المحققة = 1 / 2 = 50%
- KPI = 50% × 50% = **25%**

**3. Calls:**
- النسبة المحققة = 18 / 20 = 90%
- KPI = 90% × 12.5% = **11.25%**

**4. Meetings:**
- النسبة المحققة = 4 / 5 = 80%
- KPI = 80% × 12.5% = **10%**

**5. Assessments:**
- النسبة المحققة = 2 / 3 = 66.67%
- KPI = 66.67% × 12.5% = **8.33%**

### **إجمالي KPI للموظف = 66.41%**

---

## 🎨 واجهة المستخدم

### صفحة KPI Settings
- عرض كارت لكل مؤشر
- مدخلات للـ Target و Weight
- شرائط تقدم بصرية
- تحذيرات الأخطاء
- زر حفظ ذكي (معطل عند عدم صحة البيانات)

### صفحة Monthly Employee Report
- عمود جديد "KPI %" 
- حساب تلقائي
- تحذير عند فشل تحميل الإعدادات
- تصدير CSV متضمن KPI

---

## ✨ قواعد حساب KPI

### القيم الفردية:
- **الحضور**: إذا أقل من الهدف يتم خصم تناسبي
- **باقي المؤشرات**: محدودة بـ 100% حد أقصى

### القيمة النهائية:
- مجموع الأوزان = 100% (مضمون)
- إجمالي KPI لا يتجاوز 100%

---

## 📚 المراجع

- **Documentation**: `KPI_SYSTEM_DOCUMENTATION.md`
- **Code Location**: `src/models/KPISetting.ts`, `src/lib/kpiCalculator.ts`
- **API Code**: `src/app/api/kpi-settings/route.ts`
- **UI Code**: `src/app/admin/settings/kpi/page.tsx`

---

## 🔐 الصلاحيات

- الوصول لإعدادات KPI: Admin فقط
- الوصول للتقارير: Admin فقط
- الحفظ والتعديل: Admin فقط

---

## 🐛 استكشاف الأخطاء

### المشكلة: KPI يعرض 0%
✅ الحل:
- تحقق من أن إعدادات KPI تم حفظها
- زر "Save KPI Settings" يجب أن يظهر رسالة نجاح

### المشكلة: لا يمكن حفظ الإعدادات
✅ الحل:
- تأكد من أن مجموع الأوزان = 100% بالضبط
- استخدم الآلة الحاسبة للتحقق

### المشكلة: خطأ Unauthorized
✅ الحل:
- تأكد من أنك Admin
- جرب تسجيل الدخول مرة أخرى

---

## 📈 الخطوات التالية

### Planned Features:
- [ ] تتبع تاريخ تغييرات الإعدادات
- [ ] مقارنة KPI بين الموظفين
- [ ] أهداف KPI فردية لكل موظف
- [ ] تنبيهات KPI تلقائية
- [ ] تحليلات متقدمة

---

## 📞 التواصل والدعم

لأي استفسارات أو مشاكل تقنية، يرجى التواصل مع فريق التطوير.

---

**آخر تحديث**: 2026-01-29
**الحالة**: ✅ جاهز للاستخدام
