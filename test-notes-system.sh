#!/bin/bash

# اختبار نظام Notes

echo "=========================================="
echo "Testing Notes System"
echo "=========================================="

# ألوان للـ output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# استخدام curl للاختبار

# البيانات
ADMIN_TOKEN="your_admin_token_here"
TEAM_LEADER_TOKEN="your_team_leader_token_here"
SALES_TOKEN="your_sales_token_here"
API_URL="http://localhost:3000/api"

echo -e "${BLUE}1. Test Admin sending note to Employee${NC}"
curl -X POST "$API_URL/notes/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "receiverId": "target_user_id",
    "message": "Hello from Admin"
  }' \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}2. Test Team Leader sending note to team member${NC}"
curl -X POST "$API_URL/notes/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEAM_LEADER_TOKEN" \
  -d '{
    "receiverId": "team_member_id",
    "message": "Hello from Team Leader"
  }' \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}3. Test getting notes${NC}"
curl -X GET "$API_URL/notes" \
  -H "Authorization: Bearer $SALES_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}4. Test marking note as read${NC}"
curl -X PATCH "$API_URL/notes/note_id_here" \
  -H "Authorization: Bearer $SALES_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}5. Test deleting note${NC}"
curl -X DELETE "$API_URL/notes/note_id_here" \
  -H "Authorization: Bearer $SALES_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}6. Test getting allowed receivers (Admin)${NC}"
curl -X GET "$API_URL/notes/allowed-receivers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${BLUE}7. Test getting allowed receivers (Team Leader)${NC}"
curl -X GET "$API_URL/notes/allowed-receivers" \
  -H "Authorization: Bearer $TEAM_LEADER_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n${GREEN}=========================================="
echo "Testing Complete"
echo "==========================================${NC}"
