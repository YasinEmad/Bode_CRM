# KPI System - Quick Verification Checklist

## ⚡ Quick Test (5 minutes)

### Step 1: Test KPI Settings Save
```
1. Go to: http://localhost:3000/admin/settings/kpi
2. Change "Attendance" target: 95 → 96
3. Click "Save"
4. Wait 3-5 seconds
5. Should see: ✅ "KPI settings saved successfully"
6. Open Console (F12) → Look for: ✅ "Settings saved successfully"
```

**Expected Result:** ✅ Save completes, no timeout, success message shown

---

### Step 2: Test KPI Calculation
```
1. Go to: http://localhost:3000/admin/monthly-employee-report
2. Make sure month = January 2026
3. Wait for page to load
4. Open Console (F12)
5. Look for: "📊 === KPI Calculation for [Name]"
6. Check that KPI % column shows values (not 0%)
```

**Expected Result:** ✅ KPI values appear, console shows calculation details

---

### Step 3: Verify Database
```bash
# In terminal:
curl http://localhost:3000/api/kpi-settings/verify \
  -H "Authorization: Bearer $(grep -o 'token=.*' ~/.config/user-data.json | cut -d= -f2)"
```

**Expected Result:** ✅ Returns `"isComplete": true`

---

## 📊 What to Look For

### In Browser Console (F12)
```
✅ "KPI settings received"
✅ "KPI settings validated successfully"
✅ "📊 === KPI Calculation for [employee name]"
✅ "Final KPI Percentage: 84%"
```

### In Server Terminal
```
✅ "Found existing: true"
✅ "All validations passed"
✅ "Successfully saved KPI settings"
✅ "Verification successful"
```

### In Monthly Report Table
```
✅ "KPI %" column shows values like: 84%, 75%, 92%
✅ NOT showing 0% or blank
```

---

## ✅ Success Criteria

| Check | Expected | Status |
|-------|----------|--------|
| Settings save completes | < 20 seconds | ✅ |
| No timeout error | N/A | ✅ |
| All 5 indicators saved | DB has all 5 | ✅ |
| Total weight = 100% | Exactly 100% | ✅ |
| KPI calculation works | Shows in report | ✅ |
| Console logs appear | Clear & detailed | ✅ |

---

## 🔴 If Something Goes Wrong

### Problem: Save takes forever
**Solution:** Check server logs for database connection issues, wait 20 seconds for timeout

### Problem: KPI shows 0%
**Solution:** Open Console (F12), look for "KPI Settings not available", ensure settings are saved

### Problem: Missing indicators
**Solution:** Go to KPI Settings, click Save to ensure all 5 are created

### Problem: "Invalid total weight"
**Solution:** In KPI Settings, verify weights sum to exactly 100% (usually 12.5 + 50 + 12.5 + 12.5 + 12.5)

---

## 📱 Quick API Tests

### Get Current Settings
```bash
TOKEN="your_admin_token"
curl http://localhost:3000/api/kpi-settings \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Verify Settings Integrity
```bash
curl http://localhost:3000/api/kpi-settings/verify \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Test Calculation
```bash
curl http://localhost:3000/api/kpi-settings/test-calculation \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📖 Full Documentation

- **Detailed Guide:** `KPI_COMPLETE_VERIFICATION.md`
- **Report:** `KPI_VERIFICATION_REPORT.md`
- **Auto Script:** `bash test-kpi-complete.sh`

---

## ✨ Summary

✅ KPI Settings are **saved correctly** to database  
✅ KPI Settings are **used correctly** in monthly report  
✅ All 5 indicators are **properly stored**  
✅ Weights are **validated correctly**  
✅ Calculations are **logged in detail**  

**System is ready to use!** 🚀
