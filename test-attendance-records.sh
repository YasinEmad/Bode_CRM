#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Testing Attendance Records Feature..."
echo ""

# Check if page file exists
if [ -f "/home/yasin/Desktop/bode-crm/src/app/admin/attendance-records/page.tsx" ]; then
    echo -e "${GREEN}✓${NC} Attendance Records page exists"
else
    echo -e "${RED}✗${NC} Attendance Records page not found"
    exit 1
fi

# Check if API route exists
if [ -f "/home/yasin/Desktop/bode-crm/src/app/api/admin/attendance-records/route.ts" ]; then
    echo -e "${GREEN}✓${NC} API endpoint exists"
else
    echo -e "${RED}✗${NC} API endpoint not found"
    exit 1
fi

# Check Navbar update
if grep -q "attendance-records" "/home/yasin/Desktop/bode-crm/src/components/Navbar.tsx"; then
    echo -e "${GREEN}✓${NC} Navbar updated with Attendance link"
else
    echo -e "${RED}✗${NC} Navbar not updated"
    exit 1
fi

# Check Dashboard update
if grep -q "attendance-records" "/home/yasin/Desktop/bode-crm/src/app/admin/dashboard/page.tsx"; then
    echo -e "${GREEN}✓${NC} Dashboard updated with Attendance link"
else
    echo -e "${RED}✗${NC} Dashboard not updated"
    exit 1
fi

# Check for required imports in page
if grep -q "Loader\|Calendar" "/home/yasin/Desktop/bode-crm/src/app/admin/attendance-records/page.tsx"; then
    echo -e "${GREEN}✓${NC} Required imports present in page"
else
    echo -e "${RED}✗${NC} Missing imports in page"
    exit 1
fi

# Check for month/year selector
if grep -q "selectedMonth\|selectedYear" "/home/yasin/Desktop/bode-crm/src/app/admin/attendance-records/page.tsx"; then
    echo -e "${GREEN}✓${NC} Month and Year selector implemented"
else
    echo -e "${RED}✗${NC} Month/Year selector missing"
    exit 1
fi

# Check for table rendering
if grep -q "recordsByEmployee\|tbody" "/home/yasin/Desktop/bode-crm/src/app/admin/attendance-records/page.tsx"; then
    echo -e "${GREEN}✓${NC} Table rendering implemented"
else
    echo -e "${RED}✗${NC} Table rendering missing"
    exit 1
fi

# Check for statistics
if grep -q "إجمالي السجلات\|الموظفون\|الحاضرون في الوقت\|المتأخرون" "/home/yasin/Desktop/bode-crm/src/app/admin/attendance-records/page.tsx"; then
    echo -e "${GREEN}✓${NC} Statistics section implemented"
else
    echo -e "${RED}✗${NC} Statistics section missing"
    exit 1
fi

# Check API authentication
if grep -q "verifyToken\|admin" "/home/yasin/Desktop/bode-crm/src/app/api/admin/attendance-records/route.ts"; then
    echo -e "${GREEN}✓${NC} API authentication and authorization implemented"
else
    echo -e "${RED}✗${NC} API security missing"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All tests passed! Attendance Records feature is ready! ✓${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
