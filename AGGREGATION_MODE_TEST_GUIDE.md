# Aggregation Mode Testing Guide

## Problem Solved
Team Leader metrics in Monthly Report were not respecting the `aggregationMode` setting from KPI Settings. The frontend was using raw personal data instead of aggregation-mode-adjusted data from the API.

## Solution Implemented

### 1. **Data Flow** (Fixed)
```
KPI Settings (Admin sets per indicator):
  ├─ attendance: leader+team
  ├─ deals: leader-only
  └─ sheets: leader+team

↓ Saved in DB

Monthly Report fetches:
  
/api/admin/team-leaders-performance
  ├─ Reads aggregationMode from KPI settings
  ├─ For each metric, checks if should include team:
  │  ├─ sheets: shouldIncludeTeamData returns false (leader-only)
  │  ├─ reads: leaderPersonalSheets only
  │  └─ returns: sheets: {...} (leader-only)
  │
  ├─ deals: shouldIncludeTeamData returns true (leader+team)
  │  ├─ reads: all team members' deals + leader
  │  ├─ aggregates total
  │  └─ returns: aggregated.aggregatedDeals (full team)
  │
  └─ Returns all data with correct aggregation

Frontend (Monthly Report):
  ├─ Receives aggregated data
  ├─ Uses sheets directly (leader-only)
  ├─ Uses teamDealsCount (leader+team)
  └─ Displays correct values
```

### 2. **Key Changes Made**

#### **Frontend: `/src/app/admin/monthly-employee-report/page.tsx`**

**BEFORE (Incorrect):**
```typescript
const sheetsCount = explicitLeader
  ? calculateTotal(explicitLeader.sheets)  // ❌ Raw personal data
  : performanceStats
  ? calculateTotal(performanceStats.sheets)
  : 0;
```

**AFTER (Correct):**
```typescript
const sheetsCount = leaderStats
  ? calculateTotal((leaderStats as any).sheets || {})  // ✅ API returns with aggregationMode applied
  : performanceStats
  ? calculateTotal(performanceStats.sheets)
  : 0;
```

#### **Console Logging (Added)**
```typescript
// Shows which aggregation mode is used for each metric
console.log('🔹 Aggregation Modes Applied:');
indicatorsToUse.forEach((ind: any) => {
  const mode = ind.aggregationMode || 'leader+team';
  console.log(`   - ${ind.name}: ${mode}`);
});
```

### 3. **Testing Scenarios**

#### **Scenario 1: All metrics "leader+team" (Default)**
```
Admin Config:
  • Attendance: leader+team
  • Deals: leader+team
  • Sheets: leader+team

Expected Result:
  Team Leader KPI = (Team Leader's metrics + All team members' metrics)
```

**Test:**
1. Go to Admin > KPI Settings > Team Leader
2. Verify all toggles show "Team Leader + Team"
3. Open Monthly Report
4. Check Team Leader row:
   - Sheets should include all team members' sheets
   - Deals should include team's deals
   - Attendance should reflect aggregated team attendance

#### **Scenario 2: Mixed Modes**
```
Admin Config:
  • Attendance: leader-only
  • Deals: leader+team
  • Sheets: leader-only

Expected Result:
  Team Leader attendance only from leader
  Team Leader deals from leader + team
  Team Leader sheets only from leader
```

**Test:**
1. Go to Admin > KPI Settings > Team Leader
2. Set toggles as above and save
3. Open Monthly Report, look at Team Leader row
4. Check console logging (F12 > Console):
   ```
   Is Team Leader: true
   🔹 Aggregation Modes Applied:
      - attendance: leader-only
      - deals: leader+team
      - sheets: leader-only
   ```
5. Verify metrics match expected values

#### **Scenario 3: All metrics "leader-only"**
```
Admin Config:
  • Attendance: leader-only
  • Deals: leader-only
  • Sheets: leader-only

Expected Result:
  Team Leader KPI = Only Team Leader's personal metrics
  (Team members' data completely excluded)
```

**Test:**
1. Go to Admin > KPI Settings > Team Leader
2. Toggle all to "Team Leader Only"
3. Open Monthly Report in new tab (without clearing cache)
4. Team Leader row should show:
   - Exact same values as "Team Leader (You)" personal row
   - Different from team member individual values

### 4. **Verification Checklist**

- [ ] **KPI Settings Page**
  - [ ] Toggle buttons appear for Team Leader scope only
  - [ ] Toggles save immediately (no "Save" button click needed)
  - [ ] Success toast appears after toggle
  - [ ] Page re-fetches data after save

- [ ] **API Response** (Use DevTools Network tab)
  - [ ] `/api/admin/team-leaders-performance` returns:
    - [ ] `sheets`: data with aggregationMode applied
    - [ ] `aggregated.sheets`: same as above
    - [ ] `teamLeadsCount`: respects aggregationMode
    - [ ] `teamDealsCount`: respects aggregationMode

- [ ] **Monthly Report Display**
  - [ ] Team Leader row shows correct metrics
  - [ ] Metrics change when aggregationMode toggled
  - [ ] No duplicate counting of leader data
  - [ ] Console shows correct aggregation modes

- [ ] **Team Leaders Daily Report**
  - [ ] Shows today's data with aggregationMode applied
  - [ ] Team totals respect the mode settings
  - [ ] Leader personal totals show separately

- [ ] **Team Perfor mance Report (Sales perspective)**
  - [ ] Team Lead row reflects aggregationMode
  - [ ] Team member individual rows unaffected
  - [ ] Page updates when visiting again

### 5. **Debug Commands** (Browser Console)

```javascript
// Check what aggregationMode was applied last time
localStorage.getItem('lastAggregationMode');

// Monitor API calls
// Open DevTools > Network > XHR
// Look for /api/admin/team-leaders-performance
// Check response -> performances[0].sheets vs aggregated.sheets
```

### 6. **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| Team Leader row shows aggregated even when set to "leader-only" | Old data cached | Clear browser cache, reload page |
| Aggregation mode toggle doesn't save | Network error | Check browser console for error, check network tab |
| KPI percentage wrong | Wrong indicators used | Check console log which indicators were used |
| Team Lead row same as personal row | Correct behavior for "leader-only" mode | Verify aggregationMode is actually set to leader-only |

### 7. **Manual SQL Check**

To verify aggregationMode is saved in DB:

```javascript
// In MongoDB shell
db.kpisettings.findOne({ scope: 'team-leader' })

// Expected output should include:
{
  "_id": ObjectId(...),
  "scope": "team-leader",
  "indicators": [
    {
      "name": "attendance",
      "target": 95,
      "weight": 10,
      "aggregationMode": "leader-only"  // ✅ Should be here
    },
    {
      "name": "deals",
      "target": 2,
      "weight": 20,
      "aggregationMode": "leader+team"   // ✅ Should be here
    },
    ...
  ]
}
```

## Files Modified

1. `/src/app/admin/monthly-employee-report/page.tsx` - Fixed data selection logic
2. `/src/app/admin/settings/kpi/page.tsx` - Already had proper toggle UI
3. `/src/app/api/admin/team-leaders-performance/route.ts` - Already implements aggregationMode
4. `/src/lib/kpiCalculator.ts` - Already has helper functions

## Performance Impact

- **No additional queries**: API uses cached KPI settings
- **No data duplication**: Complex aggregation happens server-side
- **Instant UI updates**: Toggle saves immediately, page refetches data

## Rollback Plan

If issues arise:
1. Revert aggregationMode logic in Monthly Report to use `explicitLeader` instead
2. Falls back to "always aggregated" behavior (pre-implementation)
3. No data loss, only UX regression
