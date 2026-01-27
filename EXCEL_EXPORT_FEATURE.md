# Excel Export Feature - توثيق الميزات الجديدة

## نظرة عامة
تم إضافة ميزة تصدير البيانات إلى ملفات Excel في ثلاث صفحات إدارية رئيسية:

1. **Attendance Records** - تصدير سجلات الحضور
2. **Manage Leads** - تصدير بيانات العملاء المحتملين
3. **Sales Employees** - تصدير بيانات الموظفين

## الملفات المضافة والمعدلة

### 1. ملف المكتبة الجديد: `src/lib/exportExcel.ts`
يحتوي على ثلاث دوال رئيسية:

#### `exportAttendanceToExcel(data, filename)`
تصدير سجلات الحضور إلى Excel مع الأعمدة التالية:
- Employee Name (اسم الموظف)
- Date (التاريخ)
- Check-In Time (وقت تسجيل الحضور)
- Status (الحالة: Present/Late)
- Late Minutes (دقائق التأخير)
- Device ID (معرف الجهاز)

#### `exportLeadsToExcel(data, filename)`
تصدير بيانات العملاء المحتملين مع الأعمدة التالية:
- Lead Name (اسم العميل)
- Budget (الميزانية)
- Phone (رقم الهاتف)
- Status (الحالة: new/connected/negotiation/closed/lost)
- Source (المصدر)
- Assigned To (المسؤول)
- Notes (ملاحظات)

#### `exportEmployeesToExcel(data, filename)`
تصدير بيانات الموظفين مع الأعمدة التالية:
- Employee Name (اسم الموظف)
- Email (البريد الإلكتروني)
- Phone (رقم الهاتف)
- Position (المنصب)
- Salary (الراتب)
- Total Leads (إجمالي العملاء)
- Closed Deals (الصفقات المغلقة)
- Conversion Rate (معدل التحويل)

### 2. صفحة Attendance Records: `src/app/admin/attendance-records/page.tsx`
**التغييرات:**
- إضافة import للدالة `exportAttendanceToExcel`
- إضافة icon `Download` من lucide-react
- إضافة دالة `handleExportToExcel()` لمعالجة التصدير
- إضافة زر "Export to Excel" في واجهة المستخدم بجانب اختيار الشهر والسنة

**الميزات:**
- يصدر البيانات للشهر المحدد فقط
- الملف يُسمى تلقائياً بـ `attendance_YYYY-MM_DATE.xlsx`
- يظهر رسالة نجاح بعد التصدير

### 3. صفحة Leads: `src/app/admin/leads/page.tsx`
**التغييرات:**
- إضافة import للدالة `exportLeadsToExcel`
- إضافة icon `Download` من lucide-react
- إضافة دالة `handleExportToExcel()` لمعالجة التصدير
- إضافة زر "Export to Excel" بجانب زر "Add Lead"

**الميزات:**
- يطبق نفس الفلاتر المطبقة على الصفحة (البحث والحالة والمصدر)
- الملف يُسمى تلقائياً بـ `leads_DATE.xlsx`
- يصدر البيانات المفلترة فقط

### 4. صفحة Employees: `src/app/admin/employees/page.tsx`
**التغييرات:**
- إضافة import للدالة `exportEmployeesToExcel`
- إضافة icon `Download` من lucide-react
- إضافة دالة `handleExportToExcel()` لمعالجة التصدير
- تحديث رأس الصفحة ليتضمن زر "Export to Excel"

**الميزات:**
- يصدر جميع بيانات الموظفين
- الملف يُسمى تلقائياً بـ `employees_DATE.xlsx`
- يحسب معدل التحويل تلقائياً

## تفاصيل التنفيذ

### معالجة التصدير
```typescript
// جميع الدوال تتبع نفس النمط:
1. التحقق من وجود البيانات
2. تحويل البيانات إلى الصيغة المناسبة
3. إنشاء workbook جديد
4. تطبيق الأسلوب على رؤوس الأعمدة
5. إنشاء blob وتنزيل الملف
6. عرض رسالة نجاح
```

### تنسيق الملفات
- **نوع الملف:** XLSX (Excel 2007+)
- **Styling:** رؤوس ملونة بخطوط سميكة وحدود
- **Encoding:** UTF-8 لدعم النصوص العربية
- **الأعمدة:** عرض تلقائي مناسب

### التسمية التلقائية
الملفات تُسمى بتنسيق:
```
{name}_{YYYY-MM-DD}.xlsx
```
مثال: `attendance_2026-01-27.xlsx`

## تجربة الميزة

### من صفحة Attendance Records:
1. اذهب إلى Admin > Attendance Records
2. اختر الشهر والسنة المطلوبة
3. انقر على زر "Export to Excel"
4. سيتم تنزيل ملف بسجلات الحضور

### من صفحة Leads:
1. اذهب إلى Admin > Manage Leads
2. طبق الفلاتر والبحث المطلوب
3. انقر على زر "Export to Excel"
4. سيتم تنزيل ملف بالعملاء المفلترين

### من صفحة Employees:
1. اذهب إلى Admin > Sales Employees
2. انقر على زر "Export to Excel"
3. سيتم تنزيل ملف بجميع الموظفين وبيانات الأداء

## المتطلبات
- مكتبة `xlsx` (موجودة بالفعل في `package.json`)

## ملاحظات مهمة

1. **الأذونات:** جميع هذه الميزات متاحة فقط للمسؤولين (Admin)
2. **التصفية:** في صفحة Leads، يتم تطبيق جميع الفلاتر الحالية على البيانات المصدرة
3. **الأخطاء:** إذا لم تكن هناك بيانات للتصدير، سيتم عرض رسالة خطأ
4. **الأداء:** التصدير يعمل بسرعة حتى مع كميات كبيرة من البيانات

## المستقبل
يمكن تحسين هذه الميزة بإضافة:
- خيارات التخصيص (اختيار الأعمدة)
- تصدير البيانات الإحصائية
- جداول محورية (Pivot Tables)
- تصدير متعدد الصيغ (CSV, PDF)
