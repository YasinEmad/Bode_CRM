# KPI Management System - Complete Documentation

## Overview

نظام إدارة KPI متكامل يسمح للأدمن بتحديد مؤشرات الأداء الرئيسية (KPI) وأوزانها، ويحسب تلقائياً نسبة KPI لكل موظف في تقرير الأداء الشهري.

---

## Features

### 1. KPI Settings Configuration
- إعدادات قابلة للتعديل في أي وقت
- خمسة مؤشرات أساسية: Attendance, Deals, Calls, Meetings, Assessments
- تحديد Target و Weight لكل مؤشر
- التحقق من صحة البيانات (مجموع الأوزان = 100%)

### 2. Automatic KPI Calculation
- حساب تلقائي لـ KPI لكل موظف
- معادلة محاسبية واضحة ومعايرة
- دعم حسابات تناسبية للمؤشرات

### 3. Database Integration
- تخزين الإعدادات في قاعدة البيانات
- سجل واحد فقط للإعدادات
- قابل للتوسع لاحقاً

---

## KPI Calculation Formula

### المعادلة الأساسية

```
Achievement % = Actual Value / Target Value

Max Achievement = 100% (للمؤشرات العامة)

KPI Score = Achievement % × Weight %

Total KPI = مجموع جميع KPI Scores
```

### مثال عملي

#### الإعدادات:
- Attendance: Target = 95%, Weight = 12.5%
- Deals: Target = 2, Weight = 50%
- Calls: Target = 20, Weight = 12.5%
- Meetings: Target = 5, Weight = 12.5%
- Assessments: Target = 3, Weight = 12.5%

#### بيانات الموظف:
- Attendance: 90%
- Deals: 1
- Calls: 18
- Meetings: 4
- Assessments: 2

#### الحسابات:

**Attendance:**
- Achievement = 90 / 95 = 94.7%
- KPI Score = 94.7% × 12.5% = 11.84%

**Deals:**
- Achievement = 1 / 2 = 50%
- KPI Score = 50% × 50% = 25%

**Calls:**
- Achievement = 18 / 20 = 90%
- KPI Score = 90% × 12.5% = 11.25%

**Meetings:**
- Achievement = 4 / 5 = 80%
- KPI Score = 80% × 12.5% = 10%

**Assessments:**
- Achievement = 2 / 3 = 66.7%
- KPI Score = 66.7% × 12.5% = 8.34%

**Total KPI = 11.84 + 25 + 11.25 + 10 + 8.34 = 66.43%**

---

## System Architecture

### Models

#### KPISetting Model (`src/models/KPISetting.ts`)
```typescript
interface IKPISetting extends Document {
  indicators: KPIIndicator[];
  totalWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

interface KPIIndicator {
  name: string; // 'attendance' | 'deals' | 'calls' | 'meetings' | 'assessments'
  target: number;
  weight: number;
}
```

### API Endpoints

#### GET /api/kpi-settings
- جلب إعدادات KPI الحالية
- إذا لم توجد، يتم إنشاء إعدادات افتراضية
- يتطلب: Admin role

**Response:**
```json
{
  "kpiSettings": {
    "_id": "...",
    "indicators": [
      { "name": "attendance", "target": 95, "weight": 12.5 },
      { "name": "deals", "target": 2, "weight": 50 },
      { "name": "calls", "target": 20, "weight": 12.5 },
      { "name": "meetings", "target": 5, "weight": 12.5 },
      { "name": "assessments", "target": 3, "weight": 12.5 }
    ],
    "totalWeight": 100
  }
}
```

#### PUT /api/kpi-settings
- تحديث إعدادات KPI
- يتطلب: Admin role
- Validation: مجموع الأوزان يجب أن يساوي 100%

**Request Body:**
```json
{
  "indicators": [
    { "name": "attendance", "target": 95, "weight": 12.5 },
    { "name": "deals", "target": 2, "weight": 50 },
    { "name": "calls", "target": 20, "weight": 12.5 },
    { "name": "meetings", "target": 5, "weight": 12.5 },
    { "name": "assessments", "target": 3, "weight": 12.5 }
  ]
}
```

**Response:**
```json
{
  "kpiSettings": {...},
  "message": "KPI settings updated successfully"
}
```

### Utility Functions

#### `kpiCalculator.ts`

**Function: `calculateEmployeeKPI(metrics, indicators)`**

حساب KPI الكامل لموظف

```typescript
interface EmployeeMetrics {
  attendancePercentage: number;
  closedDealsCount: number;
  callsCount: number;
  meetingsCount: number;
  assessmentsCount: number;
}

interface KPIScores {
  attendance: number;
  deals: number;
  calls: number;
  meetings: number;
  assessments: number;
  total: number;
}

const kpiScores = calculateEmployeeKPI(metrics, indicators);
```

---

## UI Pages

### KPI Settings Page (`/admin/settings/kpi`)

#### Features:
- عرض جميع المؤشرات في بطاقات منفصلة
- تعديل Target و Weight لكل مؤشر
- عرض شريط تقدم للوزن الفردي
- عرض مجموع الأوزان مع التحقق من الصحة
- رسائل خطأ واضحة عند عدم تصحيح البيانات
- زر حفظ (معطل إذا كانت الأوزان غير صحيحة)

#### الحقول:
- **Target**: القيمة المستهدفة للمؤشر
  - Attendance: نسبة مئوية (مثال: 95)
  - Deals: عدد صحيح (مثال: 2)
  - Calls: عدد صحيح (مثال: 20)
  - Meetings: عدد صحيح (مثال: 5)
  - Assessments: عدد صحيح (مثال: 3)

- **Weight**: الوزن من إجمالي KPI (0-100%)

#### Validation Rules:
1. Target يجب أن يكون > 0
2. Weight يجب أن يكون بين 0 و 100
3. مجموع جميع الأوزان يجب أن يساوي 100%

### Settings Main Page (`/admin/settings`)

- تم إضافة قسم KPI Settings
- زر للانتقال المباشر إلى صفحة KPI Settings
- سهل الوصول من لوحة التحكم الرئيسية

### Monthly Employee Report (`/admin/monthly-employee-report`)

#### Updates:
- جلب إعدادات KPI عند تحميل الصفحة
- حساب KPI تلقائي لكل موظف
- عرض نسبة KPI في الجدول
- تحذير إذا فشل تحميل إعدادات KPI

#### عمود KPI:
- يعرض النسبة النهائية (0-100%)
- لون أخضر/أزرق للقيم العالية
- لون أحمر للقيم المنخفضة

---

## Default Settings

عند إنشاء إعدادات جديدة للمرة الأولى، يتم استخدام القيم الافتراضية التالية:

```
Attendance: Target = 95%, Weight = 12.5%
Deals: Target = 2, Weight = 50%
Calls: Target = 20, Weight = 12.5%
Meetings: Target = 5, Weight = 12.5%
Assessments: Target = 3, Weight = 12.5%
```

يمكن تغيير هذه القيم في أي وقت من صفحة KPI Settings.

---

## Files Created/Modified

### Created Files:
1. `src/models/KPISetting.ts` - نموذج قاعدة البيانات
2. `src/app/api/kpi-settings/route.ts` - API endpoints
3. `src/lib/kpiCalculator.ts` - دوال حساب KPI
4. `src/app/admin/settings/kpi/page.tsx` - صفحة الإعدادات

### Modified Files:
1. `src/app/admin/settings/page.tsx` - إضافة قسم KPI
2. `src/app/admin/monthly-employee-report/page.tsx` - دمج حسابات KPI

---

## Usage Guide

### Step 1: Navigate to KPI Settings
```
Admin Dashboard → System Settings → KPI Settings
```

### Step 2: Configure KPI Indicators
1. تحديد Target لكل مؤشر
2. تحديد Weight لكل مؤشر
3. التأكد من أن مجموع الأوزان = 100%

### Step 3: Save Settings
- الضغط على زر "Save KPI Settings"
- سيتم عرض رسالة تأكيد

### Step 4: View Reports
```
Admin Dashboard → Monthly Employee Report
```
- سيتم حساب KPI تلقائياً لكل موظف
- يمكن تصدير البيانات إلى CSV

---

## Error Handling

### Validation Errors:
- **"Target must be greater than 0"**: قيمة الهدف سالبة أو صفر
- **"Weight must be between 0 and 100"**: الوزن خارج النطاق المسموح
- **"Total weight must equal 100%"**: مجموع الأوزان لا يساوي 100%
- **"Missing required indicators"**: أحد المؤشرات المطلوبة مفقودة

### API Errors:
- **401 Unauthorized**: لم يتم توفير token أو token غير صالح
- **403 Forbidden**: المستخدم ليس Admin
- **400 Bad Request**: البيانات المرسلة غير صحيحة
- **500 Internal Server Error**: خطأ في الخادم

---

## Best Practices

### 1. تحديد الأهداف الواقعية
- يجب أن تكون الأهداف قابلة للتحقيق
- يجب أن تحفز الموظفين بدون أن تكون مستحيلة

### 2. التوازن بين المؤشرات
- تجنب الترجيح الكبير جداً لمؤشر واحد
- ضع في الاعتبار أهمية كل مؤشر للعمل

### 3. المراجعة الدورية
- راجع الإعدادات شهرياً أو ربع سنوياً
- اضبط الأهداف بناءً على الأداء الفعلي

### 4. الشفافية
- تأكد من أن جميع الموظفين يفهمون معايير KPI
- شارك الإعدادات مع الفريق

---

## Troubleshooting

### KPI Percentages are showing 0%
- تحقق من أن إعدادات KPI تم حفظها بنجاح
- تأكد من أن جميع المؤشرات موجودة

### Total weight won't save
- تحقق من أن مجموع الأوزان يساوي بالضبط 100%
- استخدم الآلة الحاسبة للتأكد (مثال: 12.5 + 50 + 12.5 + 12.5 + 12.5 = 100)

### API returns 403 Forbidden
- تأكد من أن المستخدم الحالي له دور Admin
- جرب تسجيل الدخول مرة أخرى

---

## Future Enhancements

### Planned Features:
1. **KPI History**: تتبع تغييرات الإعدادات عبر الوقت
2. **KPI Benchmarking**: مقارنة KPI بين الموظفين والفترات الزمنية
3. **KPI Goals**: تحديد أهداف KPI فردية للموظفين
4. **KPI Alerts**: تنبيهات عند انخفاض KPI عن حد معين
5. **KPI Analytics**: تحليلات متقدمة وتنبؤات

---

## Support & Contact

للأسئلة والدعم الفني، يرجى الاتصال بفريق التطوير.
