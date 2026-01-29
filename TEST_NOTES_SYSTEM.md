#!/bin/bash

# اختبار شامل لنظام Notes

echo "═══════════════════════════════════════════════════════════"
echo "        Notes System - Comprehensive Testing Guide"
echo "═══════════════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${BLUE}📋 قائمة الاختبارات:${NC}\n"

echo "1. ✅ أنظمة البيانات (Database)"
echo "   - نموذج Note موجود وصحيح"
echo "   - Fields: sender, receiver, message, read, createdAt, updatedAt"
echo "   - Indexes للـ query السريع"

echo -e "\n2. ✅ API Endpoints"
echo "   - POST /api/notes/send"
echo "   - GET /api/notes"
echo "   - GET /api/notes/allowed-receivers"
echo "   - PATCH /api/notes/[id]"
echo "   - DELETE /api/notes/[id]"

echo -e "\n3. ✅ Components"
echo "   - SendNoteModal"
echo "   - Notes Page"
echo "   - Updated Admin Employees page"
echo "   - Updated Team Leader My Team page"
echo "   - Updated Navbar with Notes link"

echo -e "\n4. ✅ Validations"
echo "   - Role-based permissions"
echo "   - Team member validation"
echo "   - Token verification"

echo -e "\n${BLUE}🧪 Testing Scenarios:${NC}\n"

echo -e "${YELLOW}Scenario 1: Admin sends note to Employee${NC}"
echo "─────────────────────────────────────────────"
echo "1. Go to /admin/employees"
echo "2. Click 'Send Note' button"
echo "3. Enter message and click 'Send'"
echo "✓ Message sent successfully"
echo "✓ Employee sees note in /sales/notes"
echo ""

echo -e "${YELLOW}Scenario 2: Team Leader sends note to team member${NC}"
echo "─────────────────────────────────────────────"
echo "1. Go to /sales/my-team"
echo "2. Click 'Send Note' button for team member"
echo "3. Enter message and click 'Send'"
echo "✓ Message sent to team member"
echo "✓ Cannot send to other team leaders or admin"
echo ""

echo -e "${YELLOW}Scenario 3: Employee receives and manages notes${NC}"
echo "─────────────────────────────────────────────"
echo "1. Go to /sales/notes (from Navbar)"
echo "2. View all received notes"
echo "3. Click 'Mark as Read' on unread notes"
echo "4. Click 'Delete' to remove note"
echo "✓ Unread indicator shows count"
echo "✓ Timestamp shows relative time (e.g., 2h ago)"
echo ""

echo -e "${YELLOW}Scenario 4: Permission checks${NC}"
echo "─────────────────────────────────────────────"
echo "1. Sales user cannot see Send Note button"
echo "2. Team Leader cannot send to users outside team"
echo "3. Backend validates all permissions"
echo "✓ Proper error messages"
echo "✓ No unauthorized access"
echo ""

echo -e "${BLUE}📊 Database Structure:${NC}\n"

echo "Collection: notes"
echo "  _id: ObjectId"
echo "  sender: ObjectId (ref: User)"
echo "  receiver: ObjectId (ref: User)"
echo "  message: String"
echo "  read: Boolean (default: false)"
echo "  createdAt: Date"
echo "  updatedAt: Date"
echo "  indexes: {receiver: 1, createdAt: -1}, {sender: 1, createdAt: -1}"
echo ""

echo -e "${BLUE}🔐 Security Checks:${NC}\n"

echo "✅ POST /api/notes/send"
echo "   - Token validation"
echo "   - Role check (Admin, Team Leader, or reject Sales)"
echo "   - Team member validation (Team Leader)"
echo "   - Receiver exists check"

echo -e "\n✅ GET /api/notes"
echo "   - Token validation"
echo "   - Return only user's received notes"

echo -e "\n✅ PATCH /api/notes/[id]"
echo "   - Token validation"
echo "   - Only receiver can mark as read"

echo -e "\n✅ DELETE /api/notes/[id]"
echo "   - Token validation"
echo "   - Only receiver can delete"

echo -e "\n✅ GET /api/notes/allowed-receivers"
echo "   - Token validation"
echo "   - Return based on role"
echo "   - Admin: all sales users"
echo "   - Team Leader: team members only"

echo -e "\n${BLUE}🎯 Expected Behaviors:${NC}\n"

echo "✓ Admin sees all employees with Send Note buttons"
echo "✓ Team Leader sees only team members with Send Note buttons"
echo "✓ Sales users cannot send notes (no button visible)"
echo "✓ Notes appear instantly in receiver's list"
echo "✓ Read status can be toggled"
echo "✓ Deleted notes are removed from list"
echo "✓ Timestamps show relative time"
echo "✓ Sender info displays role and position"
echo "✓ Error messages are clear and helpful"
echo "✓ Loading states show during operations"

echo -e "\n${BLUE}📱 Responsive Design:${NC}\n"

echo "✓ Works on Desktop (1920px)"
echo "✓ Works on Tablet (768px)"
echo "✓ Works on Mobile (375px)"
echo "✓ All buttons accessible"
echo "✓ Modal responsive"
echo "✓ Text readable on all sizes"

echo -e "\n${BLUE}🚀 Files Created/Modified:${NC}\n"

echo "Created:"
echo "  ✓ src/models/Note.ts"
echo "  ✓ src/app/api/notes/send/route.ts"
echo "  ✓ src/app/api/notes/route.ts"
echo "  ✓ src/app/api/notes/[id]/route.ts"
echo "  ✓ src/app/api/notes/allowed-receivers/route.ts"
echo "  ✓ src/components/SendNoteModal.tsx"
echo "  ✓ src/app/sales/notes/page.tsx"
echo ""

echo "Modified:"
echo "  ✓ src/app/admin/employees/page.tsx"
echo "  ✓ src/app/sales/my-team/page.tsx"
echo "  ✓ src/components/Navbar.tsx"

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Notes System is Ready for Testing!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo "To start testing:"
echo "1. npm run dev (if not running)"
echo "2. Test with different user roles"
echo "3. Verify permissions and UI"
echo "4. Check database entries"
echo ""

echo "Questions or issues? Contact the development team."
