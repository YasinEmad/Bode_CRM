# Admin Data Lock Implementation - تطبيق قفل بيانات الأدمن

## Overview - النظرة العامة
This implementation ensures that once an Admin edits Team Leader data, Team Leaders cannot modify that data again. The protection is implemented at both Backend (API validation) and Frontend (UI locking) levels.

## Changes Made - التغييرات المنجزة

### 1. Database Models Update - تحديث نماذج قاعدة البيانات

#### TeamLeaderPerformance Model (`src/models/TeamLeaderPerformance.ts`)
- Added `editedByAdmin?: boolean` field
- Default value: `false`
- Indicates if data was edited by admin

#### TeamPerformance Model (`src/models/TeamPerformance.ts`)
- Added `editedByAdmin?: boolean` field
- Default value: `false`
- Applies to team member performance data

### 2. Backend API Changes - تحديثات الـ API

#### Admin API - `/api/admin/team-leaders-performance` (POST)
- Sets `editedByAdmin: true` when admin saves data
```typescript
editedByAdmin: true, // Mark as edited by admin
```

#### Team Leader API - `/api/teams/performance` (POST/GET)
- **Validation Check**: Rejects edit attempts if `editedByAdmin === true`
```typescript
if (existingPerformance && existingPerformance.editedByAdmin) {
  return NextResponse.json(
    { error: 'This data was edited by admin and cannot be modified by team members' },
    { status: 403 }
  );
}
```
- **GET Response**: Includes `editedByAdmin` flag in response for UI awareness
- **Protection Level**: Backend validation ensures no workarounds at API level

### 3. Frontend UI Changes - تغييرات الـ UI

#### Team Performance Report (`src/app/sales/team-report/page.tsx`)

**Data Handling**:
- Receives `editedByAdmin` flag from API
- Added to `PerformanceData` interface
- Passed through data formatting

**Input Disable Logic**:
```typescript
disabled={
  !!employee.aggregated || 
  !isToday ||
  !!employee.editedByAdmin ||
  !!(employee.leaderPersonal && employee.adminLocks && ...)
}
```

**Visual Indicators**:
- Red warning message: "🔒 Data is locked - Admin has modified these entries"
- Red styling on locked cells (border-red-600, bg-red-900/20)
- Input fields show red background when data edited by admin

**Save Button**:
- Disabled when `editedByAdmin === true`
- Tooltip explains why button is disabled
- Visual feedback with grayed-out styling

### 4. Protection Mechanism Summary - ملخص آلية الحماية

| Layer | Mechanism | Description |
|-------|-----------|-------------|
| **Database** | `editedByAdmin` flag | Persistent marker for admin-edited records |
| **Backend** | API validation | 403 error rejects attempts to modify locked data |
| **Frontend** | UI disable | Inputs disabled, save button hidden, warning displayed |

## Usage Flow - تدفق الاستخدام

### Admin Flow - سير العمل للأدمن
1. Admin opens: **Admin > Team Leaders Daily Report**
2. Admin edits Team Leader's data (e.g., Sheets Day 5 = 10)
3. Admin saves data
4. `editedByAdmin = true` is set in database

### Team Leader Flow - سير العمل لقائد الفريق
1. Team Leader opens: **Sales > Team Performance Report**
2. Sees their own performance data with admin-edited entries
3. **If data was edited by admin**:
   - Inputs are disabled
   - Red warning message displayed
   - Save button is grayed out/disabled
   - Cannot modify the data
4. **If data was NOT edited by admin**:
   - Can edit today's data normally
   - Can save changes

## Testing Checklist - قائمة الاختبار

### Scenario 1: Admin Edits Data
- [ ] Admin opens Team Leaders Daily Report
- [ ] Admin modifies Team Leader's data
- [ ] Admin saves changes
- [ ] `editedByAdmin` flag is set to `true` in database

### Scenario 2: Team Leader Cannot Edit Locked Data
- [ ] Team Leader opens Team Performance Report
- [ ] Team Leader sees admin-edited data with red styling
- [ ] Team Leader cannot type in locked fields (disabled)
- [ ] Save button is disabled with message
- [ ] Attempts to save via API receive 403 error

### Scenario 3: Normal Data Editing Still Works
- [ ] Admin makes different edit (different day)
- [ ] Team Leader opens report
- [ ] Non-locked data can still be edited
- [ ] Today's date can be edited if not locked by admin

## Error Messages - رسائل الأخطاء

### Frontend Messages
- **UI Locked**: "🔒 Data is locked - Admin has modified these entries. You cannot edit this data."
- **Save Disabled Tooltip**: "Admin has locked this data - you cannot save"

### Backend Messages
- **API Rejection**: "This data was edited by admin and cannot be modified by team members"

## API Responses - استجابات الـ API

### GET /api/teams/performance
```json
{
  "performances": [
    {
      "userId": "...",
      "name": "John Doe",
      "editedByAdmin": true,
      "sheets": { "day1": 5, "day2": 3 },
      ...
    }
  ],
  "leaderPersonal": { ... }
}
```

### POST /api/teams/performance (When Locked)
```json
{
  "error": "This data was edited by admin and cannot be modified by team members",
  "status": 403
}
```

## Security Notes - ملاحظات الأمان

✅ **Backend Validation**: All edit attempts are validated on backend
✅ **Flag Persistence**: Flag is stored in database, survives page refresh
✅ **No Workarounds**: UI disabling is backed by API rejection
✅ **Audit Trail**: `editedByAdmin` flag acts as audit marker
✅ **Role-Based**: Only admins can set `editedByAdmin = true`

## Future Enhancements - التحسينات المستقبلية

1. **Audit Log**: Store who edited data and when
2. **Admin Unlock**: Allow admin to unlock data for re-editing
3. **Change History**: Show previous values before admin edit
4. **Notifications**: Notify Team Leader when their data is edited by admin
5. **Bulk Unlock**: Allow admin to bulk unlock data for multiple leaders

---

## Verification Commands - أوامر التحقق

### Check Model Schema
```bash
# Verify editedByAdmin field exists in MongoDB
db.teamleaderperformances.findOne() 
# Should show: { ..., editedByAdmin: true/false, ... }
```

### Test API Endpoints

**1. Admin Save (Should succeed)**
```bash
curl -X POST http://localhost:3000/api/admin/team-leaders-performance \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "leader_id",
    "month": "2026-02",
    "sheets": { "day1": 5 }
  }'
# Response should have editedByAdmin: true
```

**2. Team Leader Edit (Should fail with 403)**
```bash
curl -X POST http://localhost:3000/api/teams/performance \
  -H "Authorization: Bearer <leader_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "leader_id",
    "month": "2026-02",
    "sheets": { "day1": 10 }
  }'
# Response: { error: "This data was edited by admin...", status: 403 }
```

**3. GET Data (Should show editedByAdmin flag)**
```bash
curl http://localhost:3000/api/teams/performance?month=2026-02 \
  -H "Authorization: Bearer <leader_token>"
# Each performance object should include: editedByAdmin: true/false
```
