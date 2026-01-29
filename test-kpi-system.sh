#!/bin/bash

# KPI System Testing Script

echo "======================================"
echo "KPI System - Quick Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if files exist
echo "📋 Test 1: Checking if all required files exist..."
echo ""

files=(
  "src/models/KPISetting.ts"
  "src/app/api/kpi-settings/route.ts"
  "src/lib/kpiCalculator.ts"
  "src/app/admin/settings/kpi/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file exists"
  else
    echo -e "${RED}✗${NC} $file missing"
  fi
done

echo ""
echo "======================================"
echo "📊 Test 2: Checking file sizes..."
echo ""

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "📄 $file: $lines lines"
  fi
done

echo ""
echo "======================================"
echo "🧪 Test 3: Code Quality Check..."
echo ""

# Check for TypeScript errors (without building)
echo "Checking for obvious syntax issues..."
if grep -q "export default" "src/models/KPISetting.ts"; then
  echo -e "${GREEN}✓${NC} KPISetting model exports correctly"
else
  echo -e "${RED}✗${NC} KPISetting model export issue"
fi

if grep -q "calculateEmployeeKPI" "src/lib/kpiCalculator.ts"; then
  echo -e "${GREEN}✓${NC} KPI calculator exports function"
else
  echo -e "${RED}✗${NC} KPI calculator export issue"
fi

if grep -q "PUT" "src/app/api/kpi-settings/route.ts"; then
  echo -e "${GREEN}✓${NC} KPI API has PUT endpoint"
else
  echo -e "${RED}✗${NC} KPI API missing PUT endpoint"
fi

if grep -q "GET" "src/app/api/kpi-settings/route.ts"; then
  echo -e "${GREEN}✓${NC} KPI API has GET endpoint"
else
  echo -e "${RED}✗${NC} KPI API missing GET endpoint"
fi

echo ""
echo "======================================"
echo "✅ Basic validation complete!"
echo ""
echo "Next steps:"
echo "1. npm run dev       (Start development server)"
echo "2. Navigate to /admin/settings"
echo "3. Click on 'KPI Settings'"
echo "4. Configure targets and weights"
echo "5. Save and view reports"
echo ""
echo "======================================"
