# دليل فحص وحل مشكلة عدم ظهور بيانات Team Leader

## 🔧 الإصلاحات المطبقة

### 1. تحسين `fetchLeaderData` في [page.tsx](src/app/admin/team-leaders-monthly-report/page.tsx#L102)
✅ **المشكلة**: البيانات المُجلبة قد لا تكون محدثة بشكل صحيح أو قد تكون فارغة
✅ **الحل**: 
- استخراج `leaderPersonal` في متغير منفصل `safeLeaderPersonal`
- التأكد من أن جميع الأيام الفارغة تُملأ بصفر
- دمج البيانات من API بشكل صريح

```typescript
const safeLeaderPersonal = {
  sheets: { ...emptyDays, ...(p.leaderPersonal?.sheets || {}) },
  assessments: { ...emptyDays, ...(p.leaderPersonal?.assessments || {}) },
  meetings: { ...emptyDays, ...(p.leaderPersonal?.meetings || {}) },
  requests: { ...emptyDays, ...(p.leaderPersonal?.requests || {}) },
};

return {
  ...p,
  leaderPersonal: safeLeaderPersonal,  // ✅ يُستخدم للعرض
  sheets: { ...emptyDays },             // لا يُستخدم للعرض
  assessments: { ...emptyDays },        // لا يُستخدم للعرض
  meetings: { ...emptyDays },           // لا يُستخدم للعرض
  requests: { ...emptyDays },           // لا يُستخدم للعرض
};
```

### 2. تحسين `updateCellValue` في الصفحة
✅ **المشكلة**: عند الحفظ، قد لا تُعدل البيانات الفوري
✅ **الحل**:
- تحديث state محلياً **قبل** جلب البيانات من API
- هذا يضمن أن العرض يُحدثّ فوراً

```typescript
// 1️⃣ تحديث state محلياً فوراً
setLeaderData((prevData) =>
  prevData.map((l) => {
    if (l.userId === leader.userId) {
      return {
        ...l,
        leaderPersonal: {
          sheets:
            category === 'sheets'
              ? { ...(l.leaderPersonal?.sheets || {}), [day]: newValue }
              : (l.leaderPersonal?.sheets || {}),
          // ... other categories
        },
      };
    }
    return l;
  })
);

// 2️⃣ ثم جلب البيانات من API للتحقق والتحديث النهائي
await fetchLeaderData();
```

### 3. تحسين `calculateTeamLeaderPerformance` في [lib/teamLeaderDataCalculator.ts](src/lib/teamLeaderDataCalculator.ts#L117)
✅ **المشكلة**: البيانات قد لا تُدمج من مصادرها المختلفة بشكل صحيح
✅ **الحل**: 
- الفصل الواضح بين جلب البيانات وتحويلها
- التأكد من أن كل conversion يتم بشكل صريح

```typescript
// جلب من TeamPerformance (بيانات اللاعب)
if (teamLeaderPerf) {
  const sheets = convertMongoMapToObject(teamLeaderPerf.sheets);
  leaderPersonalSheets = { ...emptyDays, ...sheets };
}

// جلب من TeamLeaderPerformance (تعديلات الأدمن)
if (adminLeaderPerf) {
  const sheets = convertMongoMapToObject(adminLeaderPerf.sheets);
  // الأدمن edits override لاعب edits
  leaderPersonalSheets = { ...leaderPersonalSheets, ...sheets };
}
```

---

## 🧪 خطوات الاختبار

### السيناريو 1️⃣: Admin يضيف بيانات جديدة

```javascript
1. افتح صفحة /admin/team-leaders-monthly-report
2. اختر شهر وعرض Team Leader
3. في grid الأيام، غيّر قيمة في day 10 مثلاً
4. القيمة تجب أن تُعدل في العرض **فوراً** (بدون الضغط على Save)
5. اضغط على "Save" (زر أزرق)
6. تجب أن تظهر رسالة "تم الحفظ بنجاح"
7. المجموع في أعلى ("Personal Total") يجب أن يُعدل فوراً
```

### السيناريو 2️⃣: التحقق من البيانات المحفوظة

```javascript
1. أغلق الصفحة أو اختر Team Leader آخر
2. افتح نفس الشهر والـ Team Leader مرة أخرى
3. البيانات التي حفظتها تجب أن تكون موجودة في نفس الأيام
4. إذا لم تكن موجودة = مشكلة في الحفظ (backend issue)
5. إذا كانت موجودة = الحل نجح ✅
```

### السيناريو 3️⃣: اختبار Admin Locks

```javascript
1. Admin يضيف بيانات لـ day 5 من خلال صفحة الأدمن (يُفترض أن يرسل فقط اليوم المعدل)
   - تأكد أن السيرفر لم يقُم بقفل الأيام الأخرى.
2. Team Leader يفتح صفحة team-report ويشاهد أنه لا يوجد أي خلية مقفلة على باقي الأيام.
3. Team Leader يحاول تعديل day 5 من نفس الصفحة
   - يجب أن تكون الخانة معطّلة (🔒 تظهر) ولا يمكنه الكتابة فيها.
   - عند الضغط "Save" على هذه الخانة، يجب أن تظهر رسالة خطأ من السيرفر تحذّر من قفل الإدمن.
4. Team Leader يحاول تعديل أي يوم آخر (غير الـ 5)
   - يجب أن يسمح له بذلك، ويتم حفظ التغييرات وتظهر في الجدول.

### السيناريو 4️⃣: التأكد من عدم محو بيانات قائد الفريق عند تعديل الأدمن

```javascript
1. Team Leader يحفظ قيمة في day 10 (مثلاً 7) من صفحته.
2. Admin يفتح صفحة إدارة قادة الفريق ويُحدّث day 5 فقط.
   - تحقق من أن السيرفر عيّن قفل لـ day 5 فقط وأنه لم يمسّ جميع الأيام.
3. Team Leader يعود إلى صفحة team-report ثم يضغط "Refresh".
   - بياناته في day 10 يجب أن تبقى "7".
   - day 5 يجب أن تظهر مقفلة ولا يمكن تعديلها.
```
---

## 🐛 تشخيص المشكلة

### إذا كانت البيانات لا تزال لا تظهر:

#### ✅ الخطوة 1: التحقق من تسجيل الدخول والصلاحيات
```javascript
// في browser console
console.log(user?.role);  // يجب أن يكون "admin"
```

#### ✅ الخطوة 2: فحص API Response
```javascript
// أثناء الحفظ، افتح Network tab وتفقد الطلب:
// POST /api/admin/team-leaders-performance
// Response يجب أن يحتوي على: { "performance": { ... } }
```

#### ✅ الخطوة 3: فحص GET Response
```javascript
// بعد Save، افتح Request:
// GET /api/admin/team-leaders-performance?month=2026-02
// Response يجب أن يحتوي على:
{
  "performances": [
    {
      "userId": "...",
      "leaderPersonal": {
        "sheets": { "day5": 10, "day10": 5, ... },
        "assessments": { ... },
        ...
      }
    }
  ]
}
```

#### ✅ الخطوة 4: فحص State في Browser
```javascript
// في React DevTools > Components > TeamLeadersMonthlyReport
// تحقق من state leaderData
// يجب أن يحتوي على leaderPersonal مع البيانات الصحيحة
leaderData[0].leaderPersonal.sheets  // يجب أن يكون موجود
```

---

## 📋 قائمة بحث المشاكل

### 🔴 المشكلة: البيانات لا تُعرض في الجدول
**الأسباب المحتملة:**
1. ❌ API لا يُرسل `leaderPersonal` → تحقق من `/api/admin/team-leaders-performance` GET
2. ❌ `calculateTeamLeaderPerformance` لا يجلب البيانات بشكل صحيح → تحقق من جلب `TeamLeaderPerformance`
3. ❌ Frontend لا يُعدل state بشكل صحيح → تحقق من `fetchLeaderData`

### 🔴 المشكلة: البيانات تُعرض لكن تختفي بعد Refresh
**الأسباب المحتملة:**
1. ❌ البيانات لا تُحفظ في قاعدة البيانات → تحقق من MongoDB
2. ❌ البيانات تُحفظ في مكان خاطئ (TeamPerformance بدلاً من TeamLeaderPerformance) → تحقق من POST handler

### 🔴 المشكلة: رسالة "تم الحفظ بنجاح" لكن لا توجد بيانات
**الأسباب المحتملة:**
1. ❌ API يُرجع 200 لكن لا يحفظ البيانات فعلياً → تحقق من MongoDB operations
2. ❌ البيانات المُرسلة من Frontend فارغة → تحقق من `saveLeaderChanges` payload
3. ❌ قيود adminLocks تمنع الحفظ → تحقق من AdminLock logic

---

## 🔗 الملفات المُعدلة

| الملف | التعديل |
|------|--------|
| [src/app/admin/team-leaders-monthly-report/page.tsx](src/app/admin/team-leaders-monthly-report/page.tsx) | تحسين `fetchLeaderData` و `updateCellValue` |
| [src/lib/teamLeaderDataCalculator.ts](src/lib/teamLeaderDataCalculator.ts) | تحسين `calculateTeamLeaderPerformance` |

---

## 📊 مخطط تدفق البيانات (بعد الإصلاح)

```
┌─────────────────────────────────┐
│  Admin يفتح الصفحة              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  fetchLeaderData()              │
│  ├─ GET /api/admin/...          │
│  └─ safeLeaderPersonal ✅        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  setLeaderData(normalized)      │
│  ├─ leaderPersonal filled ✅    │
│  └─ UI updates immediately ✅   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Admin يعدل cell value          │
│  └─ handleLocalChange ✅        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  UI updates immediately ✅       │
│  (Personal Total changes)       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Admin يضغط Save                │
│  └─ saveLeaderChanges()         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Step 1: setLeaderData (local) ✅│
│         (UI shows data)         │
│ Step 2: POST /api/admin/...     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ API saves to TeamLeaderPerf ✅  │
│ └─ adminLocks updated ✅        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ fetchLeaderData() re-runs ✅    │
│ GET /api/admin/... (verification)
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ calculateTeamLeaderPerformance  │
│ └─ merges from 2 sources ✅     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ API returns complete data ✅    │
│ ├─ leaderPersonal ✅            │
│ ├─ aggregated ✅                │
│ └─ adminLocks ✅                │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ setLeaderData(normalized) ✅    │
│ └─ UI fully updated ✅          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Success Toast ✅                │
│ "Data saved successfully!"      │
└─────────────────────────────────┘
```

---

## 🚀 اختبار نهائي

```bash
# 1. تشغيل التطبيق
npm run dev

# 2. التنقل إلى الصفحة
http://localhost:3000/admin/team-leaders-monthly-report

# 3. اتباع السيناريوهات أعلاه
# 4. التحقق من Network tab في DevTools
# 5. التحقق من console logs للأخطاء
```

---

## ✅ علامات النجاح

- ✅ البيانات تُعرض فوراً عند التعديل
- ✅ رسالة "تم الحفظ بنجاح" تظهر
- ✅ البيانات تبقى محفوظة بعد Refresh
- ✅ لا توجد أخطاء في Network tab
- ✅ no race conditions في Browser Console
