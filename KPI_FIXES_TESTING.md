# KPI System - Testing & Fixes Guide

## ✅ Fixes Applied

### 1. **Save Operation Timeout Fix**
- **Changed**: Increased timeout from 10 seconds to 20 seconds
- **Added**: Better debug logging in both client and server
- **Result**: Save operations now provide clear feedback

**Files Modified**:
- `src/app/admin/settings/kpi/page.tsx` - Enhanced `handleSave` function
- `src/app/api/kpi-settings/route.ts` - Added detailed PUT logging

### 2. **KPI Calculation Enhancement**
- **Changed**: Added case-insensitive indicator lookup
- **Added**: Comprehensive logging for each calculation step
- **Fixed**: Better error handling when indicators are missing

**Files Modified**:
- `src/lib/kpiCalculator.ts` - Enhanced `calculateEmployeeKPI` function
- `src/app/admin/monthly-employee-report/page.tsx` - Better debug logging

---

## 🧪 Testing Steps

### Test 1: Save KPI Settings

1. **Open KPI Settings Page**
   - Go to: Admin → Settings → KPI Settings
   - URL: `http://localhost:3000/admin/settings/kpi`

2. **Modify a Value**
   - Change one of the values (e.g., Attendance target from 95 to 96)
   - Verify total weight still equals 100%

3. **Click Save**
   - Watch the browser console (F12)
   - Should see messages like:
     ```
     📤 Sending KPI settings update...
     Indicators: [...]
     ✅ Response received: 200
     ✅ Settings saved successfully
     ```

4. **Expected Results**
   - ✅ Save completes within 20 seconds
   - ✅ Success toast appears
   - ✅ No "Request timeout" error
   - ✅ Console shows all debug messages

---

### Test 2: KPI Calculation in Monthly Report

1. **Open Monthly Employee Report**
   - Go to: Admin → Monthly Employee Report
   - URL: `http://localhost:3000/admin/monthly-employee-report`

2. **Select a Month**
   - Choose current month (January 2026)
   - Wait for data to load

3. **Check Console Logs**
   - Open browser console (F12)
   - Look for messages starting with `📊 === KPI Calculation for [Employee Name]`
   - Should see:
     ```
     📊 === KPI Calculation for yasin emad ===
     🔹 Metrics: { attendancePercentage: 80, closedDealsCount: 2, ... }
     🔹 Available Indicators: [attendance (target: 95, weight: 12.5), ...]
     📊 Indicator loaded: attendance -> target: 95, weight: 12.5
     📊 Attendance: 80% / target: 95% = 10.67
     📊 Deals: 2 / target: 2 = 50
     📊 Calls: 15 / target: 20 = 7.5
     📊 Meetings: 3 / target: 5 = 7.5
     📊 Assessments: 2 / target: 3 = 8.33
     🎯 Total KPI Score: 84.00
     ✅ Final KPI Percentage: 84%
     ```

4. **Verify KPI % in Table**
   - Check the "KPI %" column in the report table
   - Should show calculated percentages (not 0)
   - Should match the console logs

5. **Expected Results**
   - ✅ KPI % shows calculated values
   - ✅ Console logs show all calculation steps
   - ✅ No "KPI Settings not available" message
   - ✅ Indicators are properly recognized

---

## 🔧 Troubleshooting

### Issue: Save Still Takes Too Long
**Solution**:
1. Check server logs for database connection issues
2. Open Console and look for timeout message
3. Check MongoDB connection status
4. If persistently slow, increase timeout further in code

### Issue: KPI Shows 0 or is Not Calculated
**Solution**:
1. Check console for "KPI Settings not available" message
2. Verify KPI Settings were saved successfully first
3. Open KPI Settings page and verify weights = 100%
4. Check that employees have performance data (calls, meetings, etc.)

### Issue: Console Shows Missing Indicators
**Solution**:
1. Verify all 5 indicators exist:
   - attendance
   - deals
   - calls
   - meetings
   - assessments
2. Go to KPI Settings and save to ensure all indicators are present
3. Refresh Monthly Report page

---

## 📊 Debug Information

### API Endpoints
- **GET /api/kpi-settings**: Fetch current KPI configuration
- **PUT /api/kpi-settings**: Update KPI settings (Admin only)

### Console Logs
- **Server (Terminal)**: Look for 🟡, ✅, ❌ color codes
- **Browser (F12)**: Look for 📊, 📤, ✅, ❌, 🔹, 🎯 emoji prefixes

### Expected Data Flow
1. User opens Monthly Report
2. System fetches KPI settings from `/api/kpi-settings`
3. System fetches employee data, leads, attendance, performance
4. For each employee:
   - Collect metrics (attendance %, deals count, etc.)
   - Load indicators from KPI settings
   - Calculate score for each indicator
   - Sum all scores for total KPI %

---

## 📝 Quick Reference

### Files Changed
| File | Change | Purpose |
|------|--------|---------|
| `src/lib/kpiCalculator.ts` | Added debug logging | Better visibility into calculations |
| `src/app/admin/settings/kpi/page.tsx` | Enhanced save with timeout | Prevent hanging saves |
| `src/app/api/kpi-settings/route.ts` | Added detailed logging | Track API operations |
| `src/app/admin/monthly-employee-report/page.tsx` | Better debug output | Clearer calculation logs |

### Timeout Settings
- **Client Timeout**: 20 seconds (in KPI Settings page)
- **Database Operation**: MongoDB default (usually 30 seconds)

---

## ✨ Success Criteria

Your fixes are working if:
- ✅ Save operations complete within 20 seconds
- ✅ Console shows detailed calculation logs
- ✅ KPI % values appear in Monthly Report table
- ✅ No errors in console after loading
- ✅ Settings persist after page refresh

---

## 🚀 Next Steps

If all tests pass:
1. Monitor the system for any remaining issues
2. Collect feedback from users about calculation accuracy
3. Consider adjusting target values based on actual performance data
4. Set up automated reports for monthly monitoring
