# نظام الإشعارات - Notifications System

## مُلخّص الميزة
نظام إشعارات شامل للموظفين والـ Team Leaders لتلقي إشعارات عند إسناد leads جديدة إليهم.

## المكونات المُنشأة

### 1. نموذج Database (Notification)
📁 `src/models/Notification.ts`
- تخزين الإشعارات في MongoDB
- تتبع حالة القراءة (isRead)
- ربط الإشعار بـ Lead والموظف والمُرسِل

### 2. API Endpoints

#### الحصول على جميع الإشعارات
```
GET /api/notifications
Authorization: Bearer {token}
```
**الاستجابة:**
```json
{
  "notifications": [...],
  "unreadCount": 3
}
```

#### وضع علامة على إشعار كمقروء
```
PATCH /api/notifications/{notificationId}
Authorization: Bearer {token}
```

#### حذف إشعار
```
DELETE /api/notifications/{notificationId}
Authorization: Bearer {token}
```

#### وضع علامة على جميع الإشعارات كمقروء
```
PATCH /api/notifications/mark-all-read
Authorization: Bearer {token}
```

### 3. مكونات الواجهة

#### NotificationsBell (Component)
📁 `src/components/NotificationsBell.tsx`
- جرس الإشعارات في شريط التنقل
- عرض عدد الإشعارات غير المقروءة
- dropdown بسيط لعرض الإشعارات الأخيرة
- أزرار سريعة للتفاعل مع الإشعارات

#### صفحة الإشعارات الكاملة
📁 `src/app/sales/notifications/page.tsx`
- صفحة كاملة لعرض جميع الإشعارات
- مرشحات (الكل / غير المقروء)
- عرض تفاصيل العميل والـ Lead
- وظائف الحذف والوضع علامة على المقروء

### 4. تحديثات API التسجيل

#### عند إسناد lead من الأدمن
📁 `src/app/api/leads/assign/route.ts`
- الأدمن ينقر على موظف → إشعار للموظف
- الرسالة: "تم إسناد ليد جديد لك: [اسم العميل]"

#### عند إسناد lead من Team Leader
📁 `src/app/api/leads/assign/route.ts`
- Team Leader ينقر على موظف في فريقه → إشعار للموظف
- الرسالة: "تم إسناد ليد جديد لك من [اسم القائد]: [اسم العميل]"

#### عند إسناد عدة leads من الأدمن
📁 `src/app/api/leads/bulk-assign/route.ts`
- إذا كانت الـ leads ≤ 5: إشعار منفصل لكل lead
- إذا كانت الـ leads > 5: إشعار واحد عام "تم إسناد X lead جديد"

## كيفية الاستخدام

### للموظفين:
1. **عرض الإشعارات الفورية**: جرس الإشعارات في الـ Navbar (يظهر عدد الإشعارات غير المقروءة)
2. **عرض جميع الإشعارات**: أنقر على "Notifications" في الـ Navbar أو الـ sidebar
3. **وضع علامة على المقروء**: أنقر على زر ✓ أو "وضع علامة على الكل"
4. **حذف الإشعارات**: أنقر على زر الحذف

### للأدمن:
- عند إسناد lead للموظف، سيتلقى الموظف إشعار فوري
- عند إسناد عدة leads، سيتلقى إشعار واحد أو متعدد حسب العدد

### للـ Team Leaders:
- عند إسناد lead لعضو في الفريق، سيتلقى عضو الفريق إشعار
- الإشعار يوضح أن الـ lead من القائد مباشرة

## التحديثات على الـ Navbar
- تم إضافة **NotificationsBell** قبل زر Notes
- تم إضافة رابط **"Notifications"** في قائمة الـ sales navigation

## معلومات الإشعارات المُحفوظة
- **userId**: الموظف الذي يتلقى الإشعار
- **type**: نوع الإشعار (new_lead, lead_reassigned, etc)
- **title**: عنوان الإشعار
- **message**: نص الرسالة
- **leadId**: الـ lead المرتبط
- **fromUser**: من أرسل الإشعار (الأدمن أو Team Leader)
- **isRead**: هل تم قراءة الإشعار
- **createdAt/updatedAt**: الطابع الزمني

## الميزات المستقبلية الممكنة
- [ ] إشعارات بالبريد الإلكتروني
- [ ] إشعارات push على الهاتف
- [ ] تنبيهات صوتية
- [ ] إشعارات عند تغيير حالة الـ Lead
- [ ] إشعارات عند تعليقات جديدة على الـ Lead
