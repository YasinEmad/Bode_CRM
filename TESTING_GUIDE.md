# تعليمات الاختبار - تزامن بيانات Team Leader

## الملفات المعدلة:

1. **`/src/lib/teamLeaderDataCalculator.ts`** (جديد)
   - Helper function موحدة لحساب بيانات قائد الفريق
   - تقرأ من TeamLeaderPerformance و TeamPerformance
   - تدمجهما وتحسبها بشكل صحيح

2. **`/src/app/api/admin/team-leaders-performance/route.ts`**
   - استخدام الـ helper بدل logic معقد
   - تنقية الـ response الزائدة

3. **`/src/app/api/teams/performance/route.ts`**
   - استخدام الـ helper للقائد
   - توحيد الحسابات بين الـ pages

---

## خطوات الاختبار

### 1️⃣ السيناريو الأساسي - التعديل من Admin يظهر فوراً

**الخطوات:**
1. سجل دخول بحساب Admin
2. اذهب إلى: **Admin > Team Leaders Daily Report**
3. اختر شهر وسنة (مثلاً: February 2026)
4. اختر أي Team Leader
5. اضغط على أي day (مثلاً: Day 1) و غيّر قيمة "Sheets" من 0 إلى 5
6. اضغط الزر الأخضر لحفظ البيانات ✓
7. اذهب إلى: **Admin > Monthly Employee Report**
8. اختر نفس الشهر والسنة
9. أبحث عن نفس Team Leader
10. **✅ يجب أن ترى الـ Sheets الجديدة = 5** (قبل الإصلاح كان يبقى 0)

---

### 2️⃣ السيناريو المتقدم - دمج بيانات Admin و Team Leader

**الخطوات:**
1. Admin يعدل: Sheets Day 1 = 10 (يحفظ)
2. سجل دخول بحساب Team Leader (نفس الفريق)
3. اذهب إلى: **Sales > Team Report**
4. اضغط على نفسك (Your Entries - الكاف الشخصية)
5. اضغط على Day 1 و غيّر "Meetings" من 0 إلى 3
6. اضغط Save ✓
7. اذهب مرة أخرى إلى Admin > Monthly Employee Report
8. اختر نفس الشهر والسنة
9. أبحث عن نفس Team Leader
10. **✅ يجب أن ترى:**
    - **Sheets Day 1 = 10** (من Admin)
    - **Meetings Day 1 = 3** (من Team Leader)

---

### 3️⃣ السيناريو - عدم وجود Cache Issues

**الخطوات:**
1. Admin يعدل بيانات Team Leader (مثلاً: Sheets Day 2 = 7)
2. بدون تحديث الصفحة أو عمل أي شيء آخر
3. اذهب إلى: **Admin > Team Leaders Daily Report** > نفس الشهر
4. **✅ يجب أن ترى البيانات الجديدة مباشرة**
5. سجل دخول بحساب Team Leader
6. اذهب إلى: **Sales > Team Report**
7. **✅ يجب أن ترى نفس البيانات المحتفظة بـ Sheets Day 2 = 7**

---

### 4️⃣ السيناريو - تعديلات متعددة تراكمية

**الخطوات:**
1. Admin يعدل عدة أيام:
   - Sheets Day 1 = 5
   - Sheets Day 2 = 8
   - Assessments Day 1 = 2
2. اذهب إلى Monthly Report
3. **✅ يجب أن ترى كل التعديلات**
4. اذهب إلى صفحة Daily Report للـ Team Leader
5. **✅ يجب أن ترى نفس البيانات**

---

## ملخص ما تم إصلاحه:

| المشكلة | الحل |
|--------|------|
| 3 مصادر مختلفة للبيانات | مصدر واحد: `calculateTeamLeaderPerformance()` |
| Sync يحتاج لتسجيل دخول التيمليدر | تحديث فوري للـ API |
| Logic معقد وفيه bugs | كود موحد وبسيط |
| Caching issues | قراءة DB مباشرة في كل request |

---

## التحقق السريع

### من Frontend (اختبار يدوي):
- ✅ التعديل من Admin يظهر في Monthly Report فوراً
- ✅ بدون تحديث الصفحة أو تسجيل دخول
- ✅ البيانات في جميع الصفحات متسقة

### من Backend (اختبار API):

```bash
# 1. احفظ بيانات Team Leader
curl -X POST http://localhost:3000/api/admin/team-leaders-performance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TEAM_LEADER_ID",
    "month": "2026-02",
    "sheets": {"day1": 10, "day2": 8}
  }'

# 2. استجب البيانات مباشرة
curl http://localhost:3000/api/admin/team-leaders-performance?month=2026-02 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. يجب أن ترى في الـ response:
{
  "performances": [
    {
      "userId": "TEAM_LEADER_ID",
      "leaderPersonal": {
        "sheets": {"day1": 10, "day2": 8, ...},
        ...
      },
      "sheets": {"day1": 10, "day2": 8, ...},
      ...
    }
  ]
}
```

---

## Notes:

- الـ helper `calculateTeamLeaderPerformance()` هي الآن مسؤولة عن كل الحسابات
- جميع الـ data sources متدمجة فيها (TeamLeaderPerformance + TeamPerformance)
- لا توجد caching في الـ helper (قراءة DB فوراً)
- التزامن الآن فوري بدون تأخير
