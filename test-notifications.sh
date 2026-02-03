#!/bin/bash

# اختبار API الإشعارات
# قبل تشغيل هذا الملف، تأكد من أن السيرفر يعمل: npm run dev

API_URL="http://localhost:3000/api"
BEARER_TOKEN="your_jwt_token_here"

echo "=== اختبار نظام الإشعارات ==="
echo ""

# 1. اختبار الحصول على الإشعارات
echo "1️⃣ اختبار الحصول على الإشعارات:"
echo "طلب: GET $API_URL/notifications"
curl -s -X GET "$API_URL/notifications" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 2. اختبار إسناد lead (يجب أن ينشئ إشعار)
echo "2️⃣ اختبار إسناد lead (من الأدمن):"
echo "طلب: POST $API_URL/leads/assign"
curl -s -X POST "$API_URL/leads/assign" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_id_here",
    "employeeId": "employee_id_here",
    "reason": "اختبار الإشعارات"
  }' | jq '.'
echo ""

# 3. اختبار وضع علامة على الإشعار كمقروء
echo "3️⃣ اختبار وضع علامة على الإشعار كمقروء:"
echo "طلب: PATCH $API_URL/notifications/{notificationId}"
curl -s -X PATCH "$API_URL/notifications/notification_id_here" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 4. اختبار وضع علامة على جميع الإشعارات كمقروء
echo "4️⃣ اختبار وضع علامة على جميع الإشعارات كمقروء:"
echo "طلب: PATCH $API_URL/notifications/mark-all-read"
curl -s -X PATCH "$API_URL/notifications/mark-all-read" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 5. اختبار حذف إشعار
echo "5️⃣ اختبار حذف إشعار:"
echo "طلب: DELETE $API_URL/notifications/{notificationId}"
curl -s -X DELETE "$API_URL/notifications/notification_id_here" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

echo "✅ انتهى الاختبار"
