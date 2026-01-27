#!/bin/bash
# test-device-id.sh
# اختبر ميزة deviceId بسهولة

# الألوان للطباعة
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}اختبار ميزة التحقق من معرف الجهاز${NC}"
echo -e "${YELLOW}================================================${NC}\n"

# استبدل هذه بقيمتك
TOKEN="YOUR_JWT_TOKEN_HERE"
API_URL="http://localhost:3000/api/attendance"

if [ "$TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
  echo -e "${RED}❌ خطأ: لم تعيّن JWT_TOKEN${NC}"
  echo "يرجى تعديل هذا الملف وإضافة token صحيح"
  echo ""
  echo "كيفية الحصول على token:"
  echo "1. سجل دخول إلى التطبيق"
  echo "2. افتح Developer Tools (F12)"
  echo "3. ادهب إلى Console وشغل: localStorage.getItem('token')"
  echo "4. انسخ القيمة وضعها في المتغير TOKEN"
  exit 1
fi

echo -e "${YELLOW}📝 معلومات الاختبار:${NC}"
echo "API URL: $API_URL"
echo "Token: ${TOKEN:0:20}..."
echo ""

# البيانات الثابتة للاختبار
LATITUDE="24.7136"
LONGITUDE="46.6753"
DEVICE_ID_1="test-device-$(date +%s)"
DEVICE_ID_2="different-device-$(date +%s)"

echo -e "${YELLOW}[اختبار 1] أول check-in - حفظ deviceId${NC}"
echo "deviceId: $DEVICE_ID_1"
echo ""

RESPONSE1=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $LATITUDE,
    \"longitude\": $LONGITUDE,
    \"deviceId\": \"$DEVICE_ID_1\"
  }")

echo "الرد:"
echo "$RESPONSE1" | jq '.' 2>/dev/null || echo "$RESPONSE1"

if echo "$RESPONSE1" | grep -q "Checked in"; then
  echo -e "${GREEN}✅ النجاح: تم حفظ deviceId${NC}\n"
else
  echo -e "${RED}❌ فشل الاختبار الأول${NC}\n"
  echo "التحقق من الأخطاء المحتملة:"
  echo "- هل الموقع صحيح؟"
  echo "- هل token صحيح؟"
  echo "- هل الخادم يعمل؟"
  exit 1
fi

echo -e "${YELLOW}[اختبار 2] check-in من جهاز مختلف - يجب أن يفشل${NC}"
echo "deviceId: $DEVICE_ID_2"
echo ""

RESPONSE2=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $LATITUDE,
    \"longitude\": $LONGITUDE,
    \"deviceId\": \"$DEVICE_ID_2\"
  }")

echo "الرد:"
echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"

if echo "$RESPONSE2" | grep -q "DEVICE_MISMATCH"; then
  echo -e "${GREEN}✅ النجاح: تم رفض الجهاز المختلف${NC}\n"
else
  echo -e "${RED}⚠️  تحذير: لم يتم رفض الجهاز المختلف${NC}\n"
fi

echo -e "${YELLOW}================================================${NC}"
echo -e "${GREEN}✅ الاختبار اكتمل${NC}"
echo -e "${YELLOW}================================================${NC}"
