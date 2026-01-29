# Browser Console Testing Guide

## 🧪 اختبار KPI System من Console

### الخطوة 1: فتح Developer Tools
```
Windows/Linux: F12 أو Ctrl+Shift+I
Mac: Cmd+Option+I
```

### الخطوة 2: اختبار API GET

انسخ والصق في **Console** tab:

```javascript
// احصل على الـ Token من LocalStorage
const token = localStorage.getItem('token');
console.log('Token:', token);

// اختبر API GET
fetch('/api/kpi-settings', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ KPI Settings:', data);
    console.log('Indicators:', data.kpiSettings.indicators);
    console.log('Total Weight:', data.kpiSettings.totalWeight);
  })
  .catch(err => console.error('❌ Error:', err));
```

### الخطوة 3: اختبر حساب KPI يدوياً

```javascript
// محاكاة حساب KPI
const indicators = [
  { name: 'attendance', target: 95, weight: 12.5 },
  { name: 'deals', target: 2, weight: 50 },
  { name: 'calls', target: 20, weight: 12.5 },
  { name: 'meetings', target: 5, weight: 12.5 },
  { name: 'assessments', target: 3, weight: 12.5 }
];

const metrics = {
  attendancePercentage: 90,
  closedDealsCount: 1,
  callsCount: 18,
  meetingsCount: 4,
  assessmentsCount: 2
};

function calculateKPI(actual, target) {
  return Math.min((actual / target) * 100, 100);
}

const scores = {
  attendance: (calculateKPI(metrics.attendancePercentage, 95) / 100) * 12.5,
  deals: (calculateKPI(metrics.closedDealsCount, 2) / 100) * 50,
  calls: (calculateKPI(metrics.callsCount, 20) / 100) * 12.5,
  meetings: (calculateKPI(metrics.meetingsCount, 5) / 100) * 12.5,
  assessments: (calculateKPI(metrics.assessmentsCount, 3) / 100) * 12.5
};

const totalKPI = Object.values(scores).reduce((a, b) => a + b, 0);

console.log('📊 KPI Scores:');
console.log('Attendance:', scores.attendance.toFixed(2) + '%');
console.log('Deals:', scores.deals.toFixed(2) + '%');
console.log('Calls:', scores.calls.toFixed(2) + '%');
console.log('Meetings:', scores.meetings.toFixed(2) + '%');
console.log('Assessments:', scores.assessments.toFixed(2) + '%');
console.log('─────────────────────────');
console.log('Total KPI:', totalKPI.toFixed(2) + '%');
```

### الخطوة 4: اختبر API PUT (تعديل)

```javascript
// تحديث الإعدادات
const token = localStorage.getItem('token');
const newSettings = {
  indicators: [
    { name: 'attendance', target: 90, weight: 12.5 },  // غيرنا الـ target
    { name: 'deals', target: 2, weight: 50 },
    { name: 'calls', target: 20, weight: 12.5 },
    { name: 'meetings', target: 5, weight: 12.5 },
    { name: 'assessments', target: 3, weight: 12.5 }
  ]
};

fetch('/api/kpi-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify(newSettings)
})
  .then(res => res.json())
  .then(data => console.log('✅ Updated:', data))
  .catch(err => console.error('❌ Error:', err));
```

---

## 📋 Request Examples

### cURL Command (من Terminal):

```bash
# احصل على Token أولاً من login
TOKEN="your_token_here"

# GET request
curl -X GET http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer $TOKEN"

# PUT request
curl -X PUT http://localhost:3000/api/kpi-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
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

## 🔍 Debugging Tips

### 1. تحقق من الـ Token
```javascript
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);
console.log('Token:', token?.substring(0, 20) + '...');
```

### 2. تحقق من Network Tab
```
1. افتح Network tab (F12)
2. حدّث الصفحة
3. ابحث عن: /api/kpi-settings
4. اضغط عليها
5. تحقق من:
   - Status: 200 OK
   - Response: JSON صحيح
```

### 3. تحقق من Console Errors
```
الأحمر = خطأ
الأصفر = تحذير
الأزرق = معلومات

انقر على Error لرؤية التفاصيل
```

---

## ✅ Test Checklist

- [ ] API GET يعيد البيانات
- [ ] البيانات تحتوي 5 مؤشرات
- [ ] Total Weight = 100
- [ ] حساب KPI يدوي صحيح
- [ ] API PUT يقبل البيانات الصحيحة
- [ ] API PUT يرفض البيانات الخاطئة
- [ ] Status code 200 للنجاح
- [ ] Status code 400 للخطأ
- [ ] Status code 401 للـ unauthorized
- [ ] رسائل الخطأ واضحة

---

## 🎯 Expected Responses

### GET Success (200):
```json
{
  "kpiSettings": {
    "_id": "507f1f77bcf86cd799439011",
    "indicators": [
      {
        "name": "attendance",
        "target": 95,
        "weight": 12.5
      },
      // ...
    ],
    "totalWeight": 100,
    "createdAt": "2026-01-29T...",
    "updatedAt": "2026-01-29T..."
  }
}
```

### PUT Success (200):
```json
{
  "kpiSettings": { ... },
  "message": "KPI settings updated successfully"
}
```

### Error (400):
```json
{
  "error": "Total weight must equal 100%, current total: 99.50%"
}
```

### Unauthorized (401):
```json
{
  "error": "Unauthorized"
}
```

---

## 🚀 Testing Scenarios

### Scenario 1: Admin تحديث الإعدادات
```javascript
// 1. جلب الإعدادات الحالية
// 2. تعديل قيمة واحدة
// 3. إرسال PUT مع الإعدادات الجديدة
// 4. التحقق من النجاح
```

### Scenario 2: أي مستخدم جلب الإعدادات
```javascript
// 1. انقل لـ Monthly Report
// 2. يجب أن تحمل الإعدادات بدون خطأ
// 3. يجب أن تظهر قيم KPI
```

### Scenario 3: Unauthorized عند التعديل
```javascript
// 1. السجل كـ non-admin
// 2. حاول PUT
// 3. يجب أن يرجع 403 Forbidden
```

---

## 📊 Performance Testing

### مراقبة الأداء:
```javascript
// قيس وقت الجلب
console.time('KPI Fetch');
fetch('/api/kpi-settings', {...})
  .then(res => res.json())
  .then(data => console.timeEnd('KPI Fetch'));

// يجب أن يكون < 100ms
```

### حجم الـ Response:
```javascript
fetch('/api/kpi-settings', {...})
  .then(res => {
    const size = res.headers.get('content-length');
    console.log('Response size:', size, 'bytes');
  });

// يجب أن يكون < 1KB
```

---

## 🔐 Security Testing

### Test Authorization:
```javascript
// بدون Token
fetch('/api/kpi-settings')
  .then(res => console.log(res.status)); // 401

// Token خاطئ
fetch('/api/kpi-settings', {
  headers: { Authorization: 'Bearer invalid' }
}).then(res => console.log(res.status)); // 401

// Token صحيح
fetch('/api/kpi-settings', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.status)); // 200
```

---

**🎓 الآن أنت جاهز لاختبار النظام بنفسك!**
