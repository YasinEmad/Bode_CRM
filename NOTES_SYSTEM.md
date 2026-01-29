# نظام Notes (الرسائل) - التوثيق الكامل

## 🎯 النظرة العامة

نظام Notes يسمح للـ Admin و Team Leader بإرسال رسائل للموظفين بصلاحيات محددة ومضبوطة.

## 📋 الصلاحيات والقواعد

### 1. Admin (مسؤول النظام)
- ✅ يستطيع إرسال رسائل لأي مستخدم في النظام
- ✅ يستطيع عرض جميع الموظفين مع زر "Send Note"
- ✅ لا يوجد قيود على المستقبلين

### 2. Team Leader (قائد الفريق)
- ✅ يستطيع إرسال رسائل فقط لأعضاء فريقه
- ✅ زر "Send Note" يظهر فقط جنب موظفيه في صفحة My Team
- ✅ لا يستطيع إرسال رسائل لـ Admin أو Team Leaders آخرين
- ✅ أي محاولة لإرسال خارج الفريق يتم رفضها من الـ Backend

### 3. الموظف (Sales)
- ✅ لا يستطيع إرسال رسائل
- ✅ يستطيع عرض الرسائل الموجهة له في صفحة Notes
- ✅ يستطيع وضع علامة "مقروء" على الرسائل
- ✅ يستطيع حذف الرسائل الخاصة به

## 📁 البنية الفنية

### Models
```
src/models/Note.ts
├── sender: ObjectId (User)
├── receiver: ObjectId (User)
├── message: String
├── read: Boolean (default: false)
├── createdAt: Date
└── updatedAt: Date
```

### API Endpoints

#### 1. إرسال رسالة
```
POST /api/notes/send
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  receiverId: "user_id",
  message: "محتوى الرسالة"
}

Response:
{
  message: "Note sent successfully",
  note: { ... }
}
```

**الصلاحيات:**
- Admin: يمكنه الإرسال لأي مستخدم
- Team Leader: يمكنه الإرسال فقط لأعضاء فريقه
- Sales: مرفوض

#### 2. الحصول على الرسائل
```
GET /api/notes
Authorization: Bearer <token>

Response:
{
  notes: [
    {
      _id: "note_id",
      sender: { name, username, role, position },
      receiver: "user_id",
      message: "محتوى الرسالة",
      read: false,
      createdAt: "2024-..."
    }
  ]
}
```

#### 3. وضع علامة مقروء
```
PATCH /api/notes/:id
Authorization: Bearer <token>

Response:
{
  message: "Note marked as read",
  note: { ... }
}
```

#### 4. حذف رسالة
```
DELETE /api/notes/:id
Authorization: Bearer <token>

Response:
{
  message: "Note deleted successfully"
}
```

#### 5. الحصول على المستقبلين المسموحين
```
GET /api/notes/allowed-receivers
Authorization: Bearer <token>

Response:
{
  receivers: [
    { _id, name, username, position },
    ...
  ]
}
```

## 🎨 Frontend Components

### SendNoteModal.tsx
- مكون modal لإرسال الرسائل
- Input textarea لكتابة الرسالة
- معالجة الأخطاء والـ loading state
- Props:
  - `isOpen`: boolean
  - `onClose`: function
  - `receiverId`: string
  - `receiverName`: string
  - `token`: string
  - `onSuccess`: function

## 📄 الصفحات

### 1. صفحة الموظفين (Admin) - `/admin/employees`
- عرض قائمة بجميع الموظفين
- زر "Send Note" بجانب كل موظف
- عند الضغط يفتح SendNoteModal

### 2. صفحة فريقي (Team Leader) - `/sales/my-team`
- عرض أعضاء الفريق
- زر "Send Note" بجانب كل عضو
- زر "View Leads" للعضو
- على الـ Desktop و Mobile

### 3. صفحة النوتات (الموظف) - `/sales/notes`
- عرض جميع الرسائل الموجهة للموظف
- ترتيب زمني (الأحدث أولا)
- عرض معلومات المُرسل (الاسم، الدور، الموقع)
- وقت الإرسال نسبي (مثل "2h ago")
- زر "Mark as Read" للرسائل غير المقروءة
- زر Delete لحذف الرسالة
- عدد الرسائل غير المقروءة

### 4. Navbar
- إضافة link "Notes" في الـ Navbar للموظفين
- أيقونة Mail مع النص
- يظهر فقط لـ Sales users

## 🔐 الأمان والحماية

### Backend Validation
```typescript
// في endpoint /api/notes/send
1. التحقق من وجود Token
2. التحقق من صحة Token وأخذ userId
3. حسب Role:
   - Admin: السماح لأي receiverId
   - Team Leader: التحقق من أن receiver ضمن teamMembers
   - Sales: رفض دائم
4. التحقق من وجود المستقبل في النظام
```

### Frontend Validation
- إخفاء الزر حسب الدور
- منع محاولات يدوية للإرسال خارج النطاق

## 📊 مثال الاستخدام

### سيناريو 1: Admin يرسل رسالة
```
1. ذهاب Admin إلى /admin/employees
2. اختيار أي موظف والضغط على "Send Note"
3. كتابة الرسالة والضغط "Send"
4. الموظف يرى الرسالة في /sales/notes
```

### سيناريو 2: Team Leader يرسل رسالة
```
1. ذهاب Team Leader إلى /sales/my-team
2. اختيار موظف من فريقه والضغط على "Send Note"
3. كتابة الرسالة والضغط "Send"
4. الموظف يرى الرسالة في /sales/notes
5. لو حاول إرسال لموظف خارج فريقه → خطأ من الـ Backend
```

### سيناريو 3: الموظف يرى الرسائل
```
1. ذهاب الموظف إلى /sales/notes (من Navbar)
2. عرض جميع الرسائل الموجهة له
3. يمكنه وضع علامة "مقروء"
4. يمكنه حذف الرسالة
```

## 🚀 التحسينات المستقبلية

- [ ] إضافة تصفية للرسائل (مقروءة/غير مقروءة)
- [ ] إضافة بحث في الرسائل
- [ ] إشعارات push/email عند وصول رسالة جديدة
- [ ] رسائل جماعية (إرسال لمجموعة موظفين)
- [ ] إضافة ملفات مرفقة
- [ ] رد على الرسائل
- [ ] أرشفة الرسائل

## 📌 ملاحظات تقنية

1. الرسائل لا تُحذف من DB عند Mark as Read
2. حذف الرسالة يحدث فقط من قبل المستقبل
3. المرسل لا يستطيع تحرير أو حذف الرسالة بعد الإرسال
4. إضافة Index على receiver و createdAt لتسريع الاستعلامات
5. كل رسالة لديها timestamps (createdAt, updatedAt)

## 📞 الدعم

للمزيد من المعلومات أو الأسئلة، تواصل مع فريق التطوير.
