# KPI System - Advanced Debugging Guide

## 🐛 تشخيص المشكلة: "Failed to fetch KPI settings"

### السبب الجذري المحتمل:
1. ❌ **MongoDB Connection Timeout** - قد تكون الاتصال ببطء
2. ❌ **Invalid Token** - Token منتهي الصلاحية
3. ❌ **Network Error** - مشكلة في الاتصال
4. ❌ **Server Error** - خطأ في الخادم

---

## 🔍 خطوات التشخيص

### الخطوة 1: افتح Developer Tools
```
F12 → Console Tab
```

### الخطوة 2: تحقق من الـ Logs
ستظهر رسائل debug مثل:
```
🔵 GET /api/kpi-settings - Starting
Token extracted: true
Token verified: true Role: admin
🔵 Connecting to DB...
✅ Connected to DB
🔵 Finding KPI settings...
Found existing: false
🔵 Creating default KPI settings...
✅ Created default settings
✅ Returning KPI settings
```

### الخطوة 3: تحقق من Network Tab
```
1. اضغط Network Tab
2. حدّث الصفحة (F5)
3. ابحث عن: /api/kpi-settings
4. اضغط عليها:
   - Headers: تحقق من Authorization header
   - Response: يجب أن تكون JSON
   - Status: يجب أن يكون 200
```

---

## 🔧 الحلول الممكنة

### Solution 1: تحديث الصفحة
```
Ctrl+Shift+R (بدون Cache)
أو
F5 (تحديث عادي)
```

### Solution 2: تحقق من Authentication
```javascript
// في Console:
const token = localStorage.getItem('token');
console.log('Token:', token ? 'EXISTS' : 'MISSING');
console.log('Token length:', token?.length);
```

**النتيجة المتوقعة:**
```
Token: EXISTS
Token length: 200+ (طول Token الحقيقي)
```

**إذا كان MISSING:** 
- تسجيل الدخول مرة أخرى

### Solution 3: اختبر API مباشرة
```javascript
// في Console:
const token = localStorage.getItem('token');

fetch('/api/kpi-settings', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(d => console.log('Data:', d))
  .catch(e => console.error('Error:', e));
```

### Solution 4: تحقق من الـ Network
```bash
# في Terminal:
curl -X GET http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

---

## 📊 شرح الـ Logs الجديدة

### عند النجاح:
```
🔵 GET /api/kpi-settings - Starting      ← بدء الطلب
Token extracted: true                     ← Token موجود
Token verified: true Role: admin          ← Token صحيح
🔵 Connecting to DB...                    ← محاولة الاتصال
✅ Connected to DB                        ← اتصال نجح
🔵 Finding KPI settings...                ← البحث عن البيانات
Found existing: true                      ← البيانات موجودة
✅ Returning KPI settings                 ← إرجاع النتيجة
```

### عند الفشل:
```
Token extracted: false                    ← ❌ لا توجد token
// أو
Token verified: false                     ← ❌ token غير صحيح
// أو
🔵 Connecting to DB...                    ← الانتظار طويل
🔵 Finding KPI settings...                ← قد يتأخر كثيراً
```

---

## 🚨 رسائل الخطأ الشائعة

### Error 1: "Failed to fetch KPI settings"
**السبب المحتمل:** Network timeout

**الحل:**
```javascript
// زيادة timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني

fetch('/api/kpi-settings', {
  headers: { Authorization: `Bearer ${token}` },
  signal: controller.signal
})
  .then(r => r.json())
  .finally(() => clearTimeout(timeoutId));
```

### Error 2: "HTTP 401"
**السبب:** Token غير صحيح

**الحل:**
```javascript
// تحقق من Token
const token = localStorage.getItem('token');
if (!token) {
  console.log('No token, redirect to login');
  window.location.href = '/login';
}
```

### Error 3: "HTTP 500"
**السبب:** خطأ في الخادم

**الحل:**
```javascript
// اطلع على server logs
// تحقق من MongoDB connection
// تحقق من أن KPISetting model تم import بشكل صحيح
```

---

## 🔐 تصحيح الصلاحيات

### تحقق من دورك:
```javascript
// في Console:
const user = JSON.parse(localStorage.getItem('user'));
console.log('Role:', user?.role);
```

**يجب أن يكون:**
- `admin` - يمكنك تعديل الإعدادات
- أي دور آخر - يمكنك فقط مشاهدة الإعدادات

### إذا كنت غير admin:
```javascript
// لا تستطيع استخدام PUT
// لكن GET يجب أن يعمل
```

---

## 📈 Performance Debugging

### قيس سرعة الاتصال:
```javascript
console.time('KPI Fetch');
fetch('/api/kpi-settings', {...})
  .then(r => r.json())
  .then(d => {
    console.timeEnd('KPI Fetch');
    return d;
  });
```

**النتائج المتوقعة:**
```
KPI Fetch: 100-500ms  ← طبيعي
KPI Fetch: 1000ms+    ← بطيء (MongoDB)
KPI Fetch: 10000ms+   ← جداً بطيء (timeout قريب)
```

---

## 🔧 حل شامل

إذا استمرت المشكلة، اتبع هذه الخطوات:

### الخطوة 1: نظف localStorage
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### الخطوة 2: سجل الدخول مرة أخرى
```
Admin Dashboard → Login
استخدم بيانات admin صحيحة
```

### الخطوة 3: اختبر API مباشرة
```bash
# احصل على token جديد
TOKEN="token_from_login"

# اختبر GET
curl -X GET http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer $TOKEN"
```

### الخطوة 4: تحقق من Server Logs
```bash
# اطلع على console logs في npm run dev
# يجب أن ترى الـ debug messages
```

---

## 💡 نصائح مفيدة

### استخدم DevTools الكاملة:
```
F12 → Sources Tab
- ضع breakpoint في fetchKpiSettings
- تابع خطوة خطوة (F10)
- افحص variables في كل خطوة
```

### استخدم Network Throttling:
```
F12 → Network Tab
- Select: "Slow 3G" أو "Offline"
- لاختبار مع اتصال بطيء
```

### استخدم Redux DevTools (إن وجدت):
```javascript
// اطلع على state في Redux
// يجب أن ترى kpiSettings
```

---

## 📝 Checklist للـ Debugging

- [ ] تحديث الصفحة (Ctrl+Shift+R)
- [ ] تسجيل الدخول مرة أخرى
- [ ] فحص Console للأخطاء
- [ ] فحص Network Tab للـ status
- [ ] اختبار API مباشرة (curl)
- [ ] تفعيل Debug Logs
- [ ] مراجعة Server Logs
- [ ] تجربة في incognito window
- [ ] تنظيف localStorage
- [ ] إعادة تشغيل Browser

---

## 🚀 الحل النهائي

إذا لم يعمل أي شيء:

```bash
# 1. نظف كل شيء
rm -rf .next node_modules
npm install

# 2. أعد البناء
npm run build

# 3. شغّل الخادم
npm run dev

# 4. اختبر مرة أخرى
# زر http://localhost:3000
```

---

**🎓 الآن لديك كل أدوات الـ debugging التي تحتاجها!**
