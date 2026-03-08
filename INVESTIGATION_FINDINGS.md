# Investigation: Monthly Report Showing Employee Data as Zeros

**Date:** March 8, 2026  
**Status:** ROOT CAUSE IDENTIFIED

---

## Executive Summary

Regular employees show 0s for sheets, meetings, and assessments in the monthly-employee-report, while team leaders display correctly. This is **not a display bug** but a **data availability issue** caused by an architectural requirement that regular employees must be assigned to a team to save any performance data.

---

## Root Cause Analysis

### The Critical Architectural Requirement

Regular employees who are **NOT assigned to any team cannot save daily performance data**. Here's why:

#### 1. Data Save Requirement (`/api/sales/daily-report` POST)

```typescript
// File: src/app/api/sales/daily-report/route.ts (lines ~63-68)

// Find user's team (either as member or as leader)
const team = await Team.findOne({ 
  $or: [{ members: user._id }, { leader: user._id }] 
});

if (!team) {
  return NextResponse.json({ 
    error: 'User is not assigned to a team' 
  }, { status: 403 });
}
```

**Impact:** If an employee is not part of any team AND not a team leader, they receive a **403 Forbidden** error and cannot save any data.

---

## Data Flow Comparison

### ✅ Team Leaders (Working Correctly)

1. **Data saved in TWO sources:**
   - `TeamLeaderPerformance` collection (via `/api/admin/team-leaders-daily-report` POST)
     - Used for admin edits with per-day admin locks
   - `TeamPerformance` collection (via `/api/sales/daily-report` POST as a team member)
     - Used for leader's personal data

2. **Data retrieved for monthly report:**
   - `/api/admin/team-leaders-performance?month=2026-03` returns:
     - `leaderPersonal` - leader's own daily data from TeamLeaderPerformance
     - `aggregated.sheets/meetings/etc` - aggregated team data respecting aggregationMode
     - `aggregatedDaily.sheets/meetings/etc` - daily buckets with aggregationMode applied

3. **Display logic in monthly-employee-report:**
   ```typescript
   const sheetsCount = leaderStats
     ? calculateTotal((leaderStats as any).aggregatedDaily?.sheets || {})
     : performanceStats ? calculateTotal(performanceStats.sheets)
     : 0;
   ```
   - Uses `leaderStats.aggregatedDaily` (has data) ✅

---

### ❌ Regular Employees (Showing Zeros)

1. **Data saved in ONE source only:**
   - `TeamPerformance` collection (via `/api/sales/daily-report` POST)
   - **ONLY if employee is part of a team**
   - If not in a team → receives 403 → no data saved

2. **Data retrieved for monthly report:**
   - `/api/admin/team-performance?month=2026-03?` returns:
     - All `TeamPerformance` records for that month
     - Populated with user name only
     - Raw `sheets`, `meetings`, `assessments` data

3. **Display logic in monthly-employee-report:**
   ```typescript
   const sheetsCount = leaderStats
     ? calculateTotal((leaderStats as any).aggregatedDaily?.sheets || {})
     : performanceStats ? calculateTotal(performanceStats.sheets)
     : 0;  // ← DEFAULTS TO 0 IF performanceStats IS NULL
   ```
   - If employee not in a team → no TeamPerformance record → `performanceStats` is undefined → shows 0 ❌

---

## Code Analysis

### `/api/admin/team-performance/route.ts` - Line-by-Line Review

```typescript
// Line 35-38: Simple query with no filtering
const performances = await TeamPerformance.find({ month }).populate(
  'userId',
  '_id name'
);

// Returns all TeamPerformance records for that month
// Does NOT check if employee is in a team (already filtered at save time)
// Does NOT aggregate or calculate anything
```

**Key Insight:** The API returns **only what exists in the database**. If a regular employee was never part of a team, their TeamPerformance record was never created.

---

### `/api/sales/daily-report/route.ts` - The Gatekeeper

```typescript
// Lines ~63-68: BLOCKING REQUIREMENT
const team = await Team.findOne({ 
  $or: [{ members: user._id }, { leader: user._id }] 
});

if (!team) {
  return NextResponse.json(
    { error: 'User is not assigned to a team' }, 
    { status: 403 }
  );
}

// Lines ~78-79: Create/Find performance
let perf = await TeamPerformance.findOne({ 
  userId: user._id, 
  teamId: team._id,  // ← Requires teamId
  month 
});
```

**Critical Path:** 
1. Employee tries to submit daily report
2. API checks if they're in ANY team
3. If NO → returns 403 → data not saved
4. If YES → creates/updates TeamPerformance record

---

## Verification Steps

### To Confirm the Issue

1. **Check if employees are assigned to teams:**
   ```bash
   # In MongoDB console:
   db.users.find({ role: 'sales' }).projection({ _id: 1, name: 1 })
   # Then check each user ID in Team.members:
   db.teams.find({ members: ObjectId("...") })
   ```

2. **Check if TeamPerformance records exist:**
   ```bash
   db.teamperformances.count({ month: "2026-03" })
   # Compare to number of sales employees
   db.users.count({ role: 'sales' })
   ```

3. **Test the daily-report API directly:**
   ```bash
   # As a regular employee user (not in any team)
   GET /api/sales/daily-report
   # Should show empty data

   # Try a POST
   POST /api/sales/daily-report
   # Should return 403: "User is not assigned to a team"
   ```

---

## Root Cause Summary

| Aspect | Team Leaders | Regular Employees |
|--------|--------------|-------------------|
| **Can save data?** | ✅ Yes (auto-part of team) | ❌ No if not assigned to team |
| **Data table** | TeamLeaderPerformance + TeamPerformance | TeamPerformance only |
| **Monthly report source** | `/api/admin/team-leaders-performance` | `/api/admin/team-performance` |
| **Shows as 0?** | ❌ No | ✅ Yes (if not in team) |
| **Why 0?** | N/A | No TeamPerformance record exists |

---

## Missing Architecture Documentation

The system has a **critical implicit requirement** that is not enforced at the UI level:

> **Regular employees MUST be assigned to a team to participate in daily performance reporting.**

If an employee is not in any team:
- They cannot save sheets/meetings/requests
- They will not appear in the monthly report (or appear with all zeros)
- The UI does not warn them of this requirement
- The error is only visible if they try the API directly

---

## Recommended Fixes

### Option 1: Enforce Team Assignment in UI (Recommended)
- Prevent creating sales/media-buyer users without assigning them to a team
- Display warning on daily-report page if employee is not in a team
- Auto-assign unassigned employees to a default team

### Option 2: Allow Orphan Employee Reporting
- Modify `/api/sales/daily-report` to allow teamless employees
- Create default team records for unassigned employees
- Update monthly report logic to handle non-team-bound employees

### Option 3: Add Admin Override
- Let admins manually create TeamPerformance records for unassigned employees
- Provide UI to assign employees to teams from monthly-employee-report page

---

## Data Retrieval Chain Summary

```
Monthly Report Page
  ├─ /api/employees → Gets ALL sales/media buyer employees
  ├─ /api/admin/team-performance?month=2026-03
  │  └─ TeamPerformance.find({ month })
  │     └─ Returns ONLY records where employee had data saved
  │        (requires employee in a team)
  │
  ├─ /api/admin/team-leaders-performance?month=2026-03
  │  └─ For each team leader, aggregates team data
  │     (works because leaders are always in teams)
  │
  └─ Display Logic:
     ├─ If employee in leaderPerformanceData → use aggregated data ✅
     └─ If employee NOT in performanceByEmployee → show 0s ❌
```

---

## Next Steps

1. **Verify database:** Check how many sales employees are NOT assigned to any team
2. **Check daily-report errors:** Review server logs for 403 errors from daily-report API
3. **Decide on solution:** Choose Option 1, 2, or 3 above
4. **Implement:** Add UI warnings or modify API behavior
5. **Document:** Add this requirement to project README/API docs

