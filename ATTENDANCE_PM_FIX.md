# Attendance System PM Time Fix

## Problem
When admin sets a PM shift start time (like 2:30 PM / 14:30), employees get "out of shift" errors even when they should be able to check in.

## Root Causes Fixed

### 1. **Incorrect Error Message for Early Arrivals**
**Before:** When someone arrived before the shift start time but outside the allowed early window, they got error "الشفت خلص" (Shift Ended) which was confusing.

**After:** Now they get a clear message: "Attendance not yet open. Shift starts at HH:mm. You can check in starting X minutes before shift time."

### 2. **Time Parsing Works Correctly for PM Times**
The system correctly handles:
- **24-hour format**: "14:30" (2:30 PM) ✓
- **12-hour format with AM/PM**: "2:30 PM" ✓

Both are converted to 14*60 + 30 = 870 minutes since midnight.

## How Shift Times Work

### Example 1: Morning Shift (9 AM - 6 PM)
```
Shift Start: 09:00 (540 minutes)
Duration: 9 hours (540 minutes)  
Shift End: 18:00 (1080 minutes)
```

Checking in at:
- 8:00 AM: Accepted if within allowed early window (default 60 min) ✓
- 9:30 AM: Accepted, marked as 30 min late
- 6:45 PM: Error - "Shift Ended"

### Example 2: Afternoon Shift (2:30 PM - 11:30 PM)
```
Shift Start: 14:30 (870 minutes)
Duration: 9 hours (540 minutes)
Shift End: 23:30 (1410 minutes)
```

Checking in at:
- 1:30 PM: Accepted if within allowed early window (default 60 min) ✓
- 2:45 PM: Accepted, marked as 15 min late  
- 12:00 AM (midnight): Error - "Shift Ended"

### Example 3: Evening to Morning Shift (6 PM - 3 AM next day)
```
Shift Start: 18:00 (1080 minutes)
Duration: 9 hours (540 minutes)
Shift End: 03:00 (180 minutes, wrapped to next day)
```

Checking in at:
- 5:00 PM: Accepted if within allowed early window ✓
- 6:30 PM: Accepted, marked as 30 min late
- 4:00 AM: Error - "Shift Ended"

## Settings Configuration

### Via Admin Panel
1. Go to **Admin → Settings**
2. Under "Attendance Settings", set **Attendance Time** to desired shift start time
3. The time input accepts both formats:
   - 24-hour: Type "14:30" for 2:30 PM
   - 12-hour: Browser may show as "2:30 PM"
4. Click **Save Settings**

### Validation
- Time format: HH:mm in 24-hour format (00:00 to 23:59)
- Examples: 09:00, 14:30, 18:00, 23:59
- Invalid: "2:30 PM", "14:60", "25:00"

## Debug Logging
Set an employee with a PM shift and check the browser/server console for detailed logs:
```
=== SHIFT CHECK-IN DEBUG ===
User: [Name]
Check-in Time: [ISO timestamp]
Shift Start Time: HH:mm
Shift Duration: X hours
Current Time (minutes since midnight): X = HH:mm
Shift Start (minutes since midnight): X = HH:mm
Shift End (minutes since midnight): X = HH:mm
Is Late: true/false
Late Hours: X Minutes: Y
Allowed Early Minutes: Z
=== END DEBUG ===
```

These logs will help diagnose any timezone or calculation issues.

## Testing PM Shifts

To verify PM shifts work:

1. **Set PM shift time in settings**: 14:30 (2:30 PM)
2. **Test early arrival** (1:30 PM):
   - Should show: "Attendance not yet open. Shift starts at 14:30. You can check in starting 60 minutes before shift time."
3. **Test on-time arrival** (2:30 PM-5:59 PM):
   - Should show successful check-in
   - Marked as late if arrival is after 14:30
4. **Test late arrival** (6:45 PM onwards):
   - Should show: "الشفت خلص - لا يمكن تسجيل الحضور بعد انتهاء الشفت" 
   - Reason: SHIFT_ENDED

## Timezone Considerations

⚠️ **Important**: The system uses the server's local timezone. Ensure server is in same timezone as office location, otherwise time comparisons may be inaccurate.

If employees report attendance issues at specific times of day, check:
- Server timezone
- Office location timezone  
- Browser/device timezone

## Known Limitations

1. **No Custom Check-in Time**: Admins cannot manually mark attendance at a specific historical time. The system always uses current server time.
2. **Server Timezone Dependent**: If server is in different timezone than users, time validations may be inaccurate.
