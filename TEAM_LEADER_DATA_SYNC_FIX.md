# Team Leader Data Synchronization Fix

## المشكلة الأصلية

كانت هناك مشكلة في عدم تزامن بيانات الـ Team Leader بين الصفحات الثلاث:

1. **Admin - Team Leaders Daily Report**: عندما يعدل الأدمن بيانات الـ Team Leader
2. **Team Leader - Team Performance Report**: صفحة الـ Team Leader لعرض أدائه
3. **Admin - Monthly Report**: صفحة الأدمن لعرض تقرير شهري للموظفين

### السيناريو الذي يكسر:

1. الأدمن يعدل بيانات الـ Team Leader من صفحة Daily Report
2. التعديل يتحفظ بنجاح
3. الأدمن يروح صفحة Monthly Report
4. البيانات لم تتحدث (لا يرى التعديل الجديد)

لكن:
5. عندما يسجل دخول قائد الفريق ويفتح صفحة Team Performance Report
6. ثم يضغط Save (حتى لو لم يغير شيء)
7. ثم يرجع الأدمن لـ Monthly Report
8. هنا يشاهد البيانات الصحيحة!

### السبب الجذري

المشكلة كانت في وجود **ثلاثة مصادر مختلفة للبيانات**:

1. **TeamLeaderPerformance** - حيث يحفظ الأدمن تعديلاته
2. **TeamPerformance** - حيث يحفظ قائد الفريق تعديلاته (نفس النموذج للموظفين العاديين)
3. **كل صفحة تقرأ من مصدر مختلف** أو تحاول دمج المصادرين بطريقة خاطئة

**الحلقة المفرغة:**
- عندما يحفظ قائد الفريق من `Team Performance Report`، يشغل عملية إعادة حساب النتائج المجمعة
- هذه العملية فقط هي التي تدمج بيانات `TeamLeaderPerformance` (من الأدمن) مع `TeamPerformance` (من القائد)
- بدون حفظ من قائد الفريق، البيانات الملتقطة من الأدمن لا تظهر في Monthly Report

---

## الحل المطبق

### 1. إنشاء Helper موحدة: `teamLeaderDataCalculator.ts`

```typescript
export async function calculateTeamLeaderPerformance(
  leaderId: string,
  month: string
): Promise<LeaderPerformanceData | null>
```

هذه Function تكون **المصدر الوحيد من الحقيقة** لكل حسابات بيانات قائد الفريق:

**ما تفعله:**
- تقرأ من **كلا المصدرين** `TeamLeaderPerformance` و `TeamPerformance`
- تدمجهما بالترتيب الصحيح (التعديلات من الأدمن لها الأولوية)
- تحسب الـ aggregation بناءً على KPI Settings
- تعيد بيانات كاملة شاملة:
  - `leaderPersonal`: بيانات القائد الشخصية فقط
  - `aggregated`: البيانات المجمعة (قائد + فريق إذا كان مطلوب)
  - `leaderOwnLeads` و `leaderOwnDeals`: الإحصائيات

### 2. تحديث `/api/admin/team-leaders-performance`

```typescript
// الحل القديم: 80+ سطر من logic معقد لكل قائد
// الحل الجديد:
const perfData = await calculateTeamLeaderPerformance(leaderId, month);
```

الآن:
- ✅ عندما يعدل الأدمن البيانات وتُحفظ في `TeamLeaderPerformance`
- ✅ المرة القادمة التي يطلب فيها البيانات، `calculateTeamLeaderPerformance` ستقرأ المعديلة الجديدة
- ✅ يعيد البيانات الصحيحة فوراً

### 3. تحديث `/api/teams/performance` 

استبدال الـ logic المعقدة لدمج البيانات (التي كانت بها bugs) بـ:

```typescript
const calcResult = await calculateTeamLeaderPerformance(String(team.leader), month);
if (calcResult) {
  leaderPersonal = { ...calcResult.leaderPersonal, ... };
  aggregatedLeaderData = calcResult.aggregated;
}
```

الآن:
- ✅ صفحة Team Performance Report تستخدم نفس الـ calculation logic كـ Monthly Report
- ✅ عندما يحفظ قائد الفريق، هو يحفظ فقط `TeamPerformance` الخاص به
- ✅ لا يحتاج لعملية "سحرية" من إعادة حساب

### 4. صفحة Monthly Report تستفيد من التحديثات

لم نحتج لتغيير الـ logic في Monthly Report! 

لأن:
- API `/api/admin/team-leaders-performance` تعيد البيانات الصحيحة الآن
- البيانات المعادة تحتوي على `leaderPersonal` و `sheets`/`assessments`/إلخ (aggregated)
- Monthly Report تقرأ من نفس API فتحصل على البيانات الصحيحة فوراً

---

## الفوائد

✅ **علاج جذري**: مصدر واحد من الحقيقة لكل حسابات بيانات قائد الفريق  
✅ **تزامن فوري**: أي تعديل من الأدمن يظهر فوراً بدون الحاجة لتسجيل دخول القائد  
✅ **إزالة التعقيد**: كود أقل، منطق أوضح، bugs أقل  
✅ **قابلية الصيانة**: تغيير logic الكسب مرة واحدة في الـ helper، يتأثر كل الـ pages  
✅ **بدون cache issues**: الـ helper تقرأ من الـ DB مباشرة في كل مرة  

---

## الملفات المعدلة

1. **`/src/lib/teamLeaderDataCalculator.ts`** - جديد، Helper موحدة
2. **`/src/app/api/admin/team-leaders-performance/route.ts`** - استخدم Helper
3. **`/src/app/api/teams/performance/route.ts`** - استخدم Helper للقائد

---

## الاختبار

### منطوط الاختبار:

1. سجل دخول بحساب الأدمن
2. روح صفحة "Team Leaders Daily Report"
3. عدّل بيانات أي Team Leader (مثلاً غيّر "Sheets" لـ day 1 من 5 إلى 10)
4. حفظ البيانات ✓
5. روح صفحة "Monthly Report"
6. اضغط على فلتر/تحديث البيانات
7. **استوعب البيانات الجديدة فوراً** ✓ (كان يبقى محتفظاً بالقيمة القديمة قبل)
8. بدون الحاجة لتسجيل دخول قائد الفريق أو عمل أي شيء آخر

### الاختبار المتقدم:

1. في نفس الجلسة بدون تحديث الصفحة
2. اطلب `/api/admin/team-leaders-performance?month=2026-02`
3. يجب أن ترى البيانات المحدثة فوراً في الـ response
