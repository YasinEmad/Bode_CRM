# Debugging Attendance Late Records

## الخطوات للعثور على المشكلة:

### 1️⃣ افتح الـ Browser Developer Tools (F12)
- اذهب إلى tab "Console"

### 2️⃣ اذهب إلى صفحة الحضور (Attendance)
- اضغط على زر Check-in
- بعد ما يرجع الرد، شوف الـ console

### 3️⃣ ابحث عن الـ logs التالية:

```
🔍 SAVED RECORD IN DB: { ... }
🔍 FIRST RECORD RETURNED: { ... }
===== ATTENDANCE RESPONSE =====
```

### 4️⃣ اكتب الـ logs في الـ Terminal الخاص بك وقول لي:
- هل `isLate` في الـ response يساوي `true` أم `false`؟
- هل `lateMinutes` يحتوي على رقم؟

### 5️⃣ افتح صفحة الـ Admin Attendance Records
- شوف إذا كان "Late" ولا "Present"

## الـ Server Logs:
بعد ما تعمل check-in، شوف الـ terminal حيث مشغل `pnpm dev` 
ابحث عن الـ logs:
- `🔍 SAVED RECORD IN DB:`
- `🔍 GET ATTENDANCE - FETCHING:`
- `🔍 FIRST RECORD RETURNED:`

## الـ Frontend Logs:
في الـ Browser Console بتتوقع تشوف:
- `🔍 FETCHED ATTENDANCE RECORDS:`
- `===== ATTENDANCE RESPONSE =====`
