#!/bin/bash
# Quick verification script for Aggregation Mode implementation

echo "🔍 Checking Aggregation Mode Implementation..."
echo ""

# 1. Check if aggregationMode field exists in KPISetting model
echo "✅ Step 1: Checking KPISetting model..."
if grep -q "aggregationMode" "/home/yasin/Desktop/bode-crm/src/models/KPISetting.ts"; then
  echo "   ✓ aggregationMode field found in model"
else
  echo "   ✗ aggregationMode field NOT found"
fi

# 2. Check if helper functions exist
echo ""
echo "✅ Step 2: Checking helper functions..."
if grep -q "getAggregationConfig" "/home/yasin/Desktop/bode-crm/src/lib/kpiCalculator.ts"; then
  echo "   ✓ getAggregationConfig function found"
else
  echo "   ✗ getAggregationConfig function NOT found"
fi

if grep -q "shouldIncludeTeamData" "/home/yasin/Desktop/bode-crm/src/lib/kpiCalculator.ts"; then
  echo "   ✓ shouldIncludeTeamData function found"
else
  echo "   ✗ shouldIncludeTeamData function NOT found"
fi

# 3. Check if API imports the helpers
echo ""
echo "✅ Step 3: Checking API imports..."
if grep -q "getAggregationConfig\|shouldIncludeTeamData" "/home/yasin/Desktop/bode-crm/src/app/api/admin/team-leaders-performance/route.ts"; then
  echo "   ✓ API imports aggregation helpers"
else
  echo "   ✗ API does NOT import helpers"
fi

# 4. Check if Monthly Report uses aggregated data
echo ""
echo "✅ Step 4: Checking Monthly Report data usage..."
if grep -q "leaderStats as any\).sheets" "/home/yasin/Desktop/bode-crm/src/app/admin/monthly-employee-report/page.tsx"; then
  echo "   ✓ Monthly Report uses aggregated sheets data"
else
  echo "   ✗ Monthly Report NOT using aggregated sheets"
fi

if grep -q "teamLeadsCount\|teamDealsCount" "/home/yasin/Desktop/bode-crm/src/app/admin/monthly-employee-report/page.tsx"; then
  echo "   ✓ Monthly Report uses aggregated leads/deals data"
else
  echo "   ✗ Monthly Report NOT using aggregated leads/deals"
fi

# 5. Check if KPI Settings UI has toggles
echo ""
echo "✅ Step 5: Checking KPI Settings UI..."
if grep -q "Team Leader Only\|Team Leader + Team" "/home/yasin/Desktop/bode-crm/src/app/admin/settings/kpi/page.tsx"; then
  echo "   ✓ KPI Settings UI has aggregation mode toggles"
else
  echo "   ✗ KPI Settings UI missing toggles"
fi

if grep -q "handleAggregationModeSave" "/home/yasin/Desktop/bode-crm/src/app/admin/settings/kpi/page.tsx"; then
  echo "   ✓ KPI Settings has immediate save handler"
else
  echo "   ✗ KPI Settings missing save handler"
fi

# 6. Check if Daily Report page exists
echo ""
echo "✅ Step 6: Checking Daily Report page..."
if [ -f "/home/yasin/Desktop/bode-crm/src/app/admin/team-leaders-daily-report/page.tsx" ]; then
  echo "   ✓ Daily Report page exists"
  if grep -q "sheets\|meetings\|meetings\|requests" "/home/yasin/Desktop/bode-crm/src/app/admin/team-leaders-daily-report/page.tsx"; then
    echo "   ✓ Daily Report displays metrics"
  fi
else
  echo "   ✗ Daily Report page NOT found"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ All checks completed!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📝 Next Steps:"
echo "1. Restart development server: npm run dev"
echo "2. Go to Admin > KPI Settings > Team Leader"
echo "3. Toggle aggregation modes for each indicator"
echo "4. Check Monthly Report for correct calculations"
echo "5. Check browser console for debug logs"
echo ""
