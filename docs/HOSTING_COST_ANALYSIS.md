# Bode CRM - Hosting & Cloud Database Cost Analysis Documentation

**Document Version:** 1.0  
**Date:** January 29, 2026  
**Last Updated:** January 29, 2026

---

## Table of Contents

1. [Database Schema & Storage Requirements](#database-schema--storage-requirements)
2. [API Documentation](#api-documentation)
3. [Data Operations & Bandwidth Analysis](#data-operations--bandwidth-analysis)
4. [Estimated Data Storage Calculations](#estimated-data-storage-calculations)
5. [Hosting Cost Estimation](#hosting-cost-estimation)
6. [Cloud Database Cost Estimation](#cloud-database-cost-estimation)
7. [Cost Optimization Recommendations](#cost-optimization-recommendations)

---

## Database Schema & Storage Requirements

### 1. Users Collection

**Model:** `User`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| username | String | 50-100 | Unique index |
| email | String | 50-100 | Optional, lowercase |
| password | String | 60 | Bcrypt hash |
| name | String | 50-100 | User full name |
| role | String | 10 | 'admin' or 'sales' |
| phone | String | 15-20 | Optional |
| position | String | 30-50 | Job title |
| salary | Number | 8 | Monthly salary |
| deviceId | String | 50-100 | Mobile device identifier |
| teamId | ObjectId | 12 | Reference to Team |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~450-550 bytes

**Indexes:**
- `username` (unique)
- `email` (optional)
- `teamId`

**Estimated Growth (per 100 employees):** ~50-55 KB

---

### 2. Leads Collection

**Model:** `Lead`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| name | String | 50-100 | Lead name |
| budget | Number | 8 | Deal value |
| phone | String | 15-20 | Contact phone |
| email | String | 50-100 | Contact email |
| status | String | 30 | Enum: 'new', 'connected', 'negotiation', 'pending_closed', 'closed_pending_approval', 'closed', 'lost' |
| source | String | 25 | Enum: 'website', 'referral', 'phone', 'email', 'facebook', 'instagram', 'google ads', 'other' |
| assignedTo | ObjectId | 12 | Reference to User (sales person) |
| notes | String | 500-2000 | Lead notes/history |
| proofImage | String | 200-500 | Image URL or base64 |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~1.0-1.5 KB

**Indexes:**
- `assignedTo` + `createdAt`
- `status`
- `source`

**Growth Pattern:** High - depends on sales activity
- **Light usage:** 100-200 leads/month
- **Medium usage:** 500-1000 leads/month
- **Heavy usage:** 2000+ leads/month

**Estimated Annual Growth:** ~500 KB to 3 MB (light to heavy usage)

---

### 3. Commissions Collection

**Model:** `Commission`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| dealId | ObjectId | 12 | Reference to Lead |
| employeeId | ObjectId | 12 | Reference to User |
| amount | Number | 8 | Commission amount |
| percentage | Number | 8 | Commission percentage |
| status | String | 15 | Enum: 'pending', 'approved', 'rejected', 'paid' |
| approvedBy | ObjectId | 12 | Reference to User (approver) |
| approvalDate | Date | 8 | Approval timestamp |
| rejectionReason | String | 100-200 | Optional reason |
| rejectionNote | String | 100-300 | Optional details |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~600-800 bytes

**Indexes:**
- `employeeId` + `createdAt`
- `dealId`
- `status`

**Growth Pattern:** Proportional to closed deals
- **Typical:** 50-200 commissions/month per 10 sales team members

---

### 4. Attendance Collection

**Model:** `Attendance`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| userId | ObjectId | 12 | Reference to User |
| date | Date | 8 | Attendance date |
| checkInTime | Date | 8 | Check-in timestamp |
| latitude | Number | 8 | GPS latitude |
| longitude | Number | 8 | GPS longitude |
| withinRadius | Boolean | 1 | Location validation |
| isLate | Boolean | 1 | Tardiness flag |
| lateMinutes | Number | 8 | Minutes late |
| deviceId | String | 50-100 | Device identifier |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~350-400 bytes

**Indexes:**
- `userId` + `date`
- `userId` + `createdAt`

**Growth Pattern:** Very high - one record per employee per work day
- **Per 100 employees/month:** ~2,000-2,400 records (~800 KB - 1 MB)
- **Annual:** ~25 MB per 100 employees

**Critical:** This collection grows the fastest and requires data archival strategies.

---

### 5. Notes Collection

**Model:** `Note`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| sender | ObjectId | 12 | Reference to User |
| receiver | ObjectId | 12 | Reference to User |
| message | String | 100-5000 | Note content |
| read | Boolean | 1 | Read status |
| readAt | Date | 8 | When read |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~500-2000 bytes

**Indexes:**
- `receiver` + `createdAt`
- `sender` + `createdAt`

**Growth Pattern:** Medium - depends on communication activity
- **Per month:** 100-500 notes

---

### 6. Teams Collection

**Model:** `Team`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| name | String | 30-80 | Team name (unique) |
| leader | ObjectId | 12 | Reference to User |
| members | ObjectId[] | 12 × count | Array of member references |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~200-400 bytes (depends on team size)
- Small team (5 members): ~260 bytes
- Medium team (10 members): ~320 bytes
- Large team (20 members): ~440 bytes

**Growth Pattern:** Slow - one team per organizational unit
- **Typical:** 5-20 teams

---

### 7. Team Leader Performance Collection

**Model:** `TeamLeaderPerformance`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| userId | ObjectId | 12 | Reference to User |
| month | String | 7 | Format: "YYYY-MM" |
| calls (week1-4) | Number × 4 | 32 | Weekly call counts |
| assessments (week1-4) | Number × 4 | 32 | Weekly assessment counts |
| meetings (week1-4) | Number × 4 | 32 | Weekly meeting counts |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~300-350 bytes

**Indexes:**
- `userId` + `month`

**Growth Pattern:** One record per team leader per month
- **Per team leader/month:** One record
- **Typical:** 5-20 records/month

---

### 8. KPI Settings Collection

**Model:** `KPISetting`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| indicators | Array | 300-500 | KPI targets and weights |
| totalWeight | Number | 8 | Sum of weights |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Indicator Structure:**
```
{
  name: String (30),  // 'attendance', 'deals', 'calls', 'meetings', 'assessments'
  target: Number (8),
  weight: Number (8)
}
```

**Average Document Size:** ~400-600 bytes

**Growth Pattern:** Minimal - typically 1-5 documents
- Usually just one configuration document

---

### 9. System Settings Collection

**Model:** `SystemSettings`

**Fields & Storage:**
| Field | Type | Size (bytes) | Notes |
|-------|------|-------------|-------|
| _id | ObjectId | 12 | MongoDB default |
| officeLatitude | Number | 8 | Office GPS latitude |
| officeLongitude | Number | 8 | Office GPS longitude |
| officeName | String | 50 | Office name |
| attendanceRadius | Number | 8 | Geofence radius in meters |
| attendanceTime | String | 5 | Shift start time (HH:mm) |
| allowedEarlyMinutes | Number | 8 | Early check-in allowance |
| shiftDuration | Number | 8 | Hours per shift |
| commissionRules | Array | 200-500 | Position-based percentages |
| createdAt | Date | 8 | Auto-generated |
| updatedAt | Date | 8 | Auto-generated |

**Average Document Size:** ~600-800 bytes

**Growth Pattern:** Minimal - typically 1-3 documents

---

## API Documentation

### Authentication APIs

#### 1. User Login
```
POST /api/auth/login
```
**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response:** JWT token + User data
**Data Size:** Request ~100 bytes, Response ~500 bytes
**Frequency:** Per user session (typically 1-3x/day per user)

#### 2. User Register
```
POST /api/auth/register
```
**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "name": "string"
}
```
**Response:** Success message
**Data Size:** Request ~150 bytes, Response ~100 bytes
**Frequency:** New user creation (typically 1-5 times/month)

#### 3. Register Device
```
POST /api/auth/register-device
```
**Request Body:**
```json
{
  "deviceId": "string"
}
```
**Response:** Confirmation
**Data Size:** Request ~80 bytes, Response ~50 bytes
**Frequency:** Once per device

#### 4. Get Current User
```
GET /api/auth/me
```
**Response:** Current user data (~350 bytes)
**Frequency:** On app load (1-3x/day per user)

#### 5. Logout
```
POST /api/auth/logout
```
**Response:** Success message
**Data Size:** Response ~50 bytes
**Frequency:** Session end (1-2x/day per user)

---

### Leads Management APIs

#### 1. Get All Leads
```
GET /api/leads?userId=USER_ID&status=STATUS
```
**Response:** Array of leads (~1.0-1.5 KB per lead)
**Frequency:** 5-20 times/day per sales user
**Typical Response Size:** 100 leads = 100-150 KB

#### 2. Create Lead
```
POST /api/leads
```
**Request Body:**
```json
{
  "name": "string",
  "budget": number,
  "phone": "string",
  "email": "string (optional)",
  "status": "new",
  "source": "string",
  "notes": "string",
  "assignedTo": "USER_ID"
}
```
**Data Size:** Request ~300-600 bytes, Response ~500 bytes
**Frequency:** 10-50 leads/day per sales user

#### 3. Update Lead
```
PUT /api/leads/:id
```
**Request Body:** Same as create (partial)
**Data Size:** Request ~200-400 bytes, Response ~500 bytes
**Frequency:** 20-100 updates/day

#### 4. Get Lead by ID
```
GET /api/leads/:id
```
**Response:** Single lead (~1.0-1.5 KB)
**Frequency:** 50-200 times/day

#### 5. Bulk Import Leads
```
POST /api/leads/bulk-import
```
**Request:** CSV file or JSON array
**Data Size:** 100 leads ~50-100 KB, 1000 leads ~500 KB-1 MB
**Frequency:** 1-5 times/week

#### 6. Bulk Assign Leads
```
POST /api/leads/bulk-assign
```
**Request Body:**
```json
{
  "leadIds": ["id1", "id2", ...],
  "assignedTo": "USER_ID"
}
```
**Data Size:** Request ~100-500 bytes (depends on lead count)
**Frequency:** 1-10 times/week

---

### Employee Management APIs

#### 1. Get All Employees
```
GET /api/employees
```
**Response:** Array of employees with stats (~400-500 bytes per employee)
**Frequency:** 2-5 times/day (admin only)
**Typical Response Size:** 50 employees = 20-25 KB

#### 2. Create Employee
```
POST /api/employees
```
**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "position": "string",
  "phone": "string (optional)",
  "salary": number
}
```
**Data Size:** Request ~200-400 bytes, Response ~300 bytes
**Frequency:** 1-5 times/month

#### 3. Update Employee
```
PUT /api/employees/:id
```
**Data Size:** Request ~200-400 bytes, Response ~300 bytes
**Frequency:** 2-10 times/month

#### 4. Delete Employee
```
DELETE /api/employees/:id
```
**Data Size:** Request ~80 bytes, Response ~100 bytes
**Frequency:** 0-2 times/month

---

### Attendance APIs

#### 1. Check-In
```
POST /api/attendance
```
**Request Body:**
```json
{
  "latitude": number,
  "longitude": number,
  "deviceId": "string"
}
```
**Data Size:** Request ~100 bytes, Response ~150 bytes
**Frequency:** Once per employee per workday (highly consistent)
**Daily Load:** 100 employees = 100 requests/day

#### 2. Get Attendance Records
```
GET /api/attendance?userId=USER_ID&date=DATE
```
**Response:** Array of attendance records (~350-400 bytes each)
**Frequency:** 5-20 times/day
**Typical Response Size:** 30 days = 10-12 KB

---

### Commission APIs

#### 1. Get Commissions
```
GET /api/commissions?employeeId=ID&status=STATUS
```
**Response:** Array of commissions (~600-800 bytes each)
**Frequency:** 5-10 times/day
**Typical Response Size:** 50 commissions = 30-40 KB

#### 2. Create Commission
```
POST /api/commissions
```
**Request Body:**
```json
{
  "dealId": "LEAD_ID",
  "employeeId": "USER_ID",
  "amount": number,
  "percentage": number
}
```
**Data Size:** Request ~200 bytes, Response ~400 bytes
**Frequency:** Upon deal closure (typically 10-50/day)

#### 3. Approve Commission
```
PUT /api/commissions/:id
```
**Request Body:**
```json
{
  "status": "approved"
}
```
**Data Size:** Request ~80 bytes, Response ~400 bytes
**Frequency:** 5-20 times/day

#### 4. Recalculate Commissions
```
POST /api/commissions/recalculate
```
**Data Size:** Request ~50 bytes, Response ~100 bytes
**Frequency:** 1-5 times/month (admin operation)

---

### Teams APIs

#### 1. Get Teams
```
GET /api/teams
```
**Response:** Array of teams (~250-400 bytes each)
**Frequency:** 2-5 times/day
**Typical Response Size:** 10 teams = 2.5-4 KB

#### 2. Create Team
```
POST /api/teams
```
**Request Body:**
```json
{
  "name": "string",
  "leaderId": "USER_ID",
  "memberIds": ["id1", "id2", ...]
}
```
**Data Size:** Request ~200-400 bytes, Response ~300 bytes
**Frequency:** 0-3 times/month

#### 3. Get Team Details
```
GET /api/teams/:id
```
**Response:** Team with members (~250-400 bytes)
**Frequency:** 5-20 times/day

#### 4. Update Team
```
PUT /api/teams/:id
```
**Data Size:** Request ~200-400 bytes, Response ~300 bytes
**Frequency:** 2-10 times/month

#### 5. Get Team Members
```
GET /api/teams/members?teamId=TEAM_ID
```
**Response:** Array of user references (~200 bytes per member)
**Frequency:** 5-10 times/day

#### 6. Check Team Leader
```
GET /api/teams/check-team-leader
```
**Response:** Boolean + user data if team leader
**Frequency:** 2-5 times/day

#### 7. My Team
```
GET /api/teams/my
```
**Response:** Current user's team (~400-500 bytes)
**Frequency:** 2-5 times/day

#### 8. My Team's Leads
```
GET /api/teams/my/leads
```
**Response:** Array of team leads (~1 KB each)
**Frequency:** 5-20 times/day

#### 9. Team Leaders List
```
GET /api/teams/leaders
```
**Response:** Array of team leaders (~350 bytes each)
**Frequency:** 2-5 times/day

---

### Notes APIs

#### 1. Get Notes
```
GET /api/notes?page=NUMBER
```
**Response:** Paginated notes (~500-2000 bytes each)
**Frequency:** 5-10 times/day
**Typical Response Size:** 20 notes per page = 10-40 KB

#### 2. Get Sent Notes
```
GET /api/notes/sent?page=NUMBER
```
**Response:** User's sent notes
**Frequency:** 2-5 times/day

#### 3. Send Note
```
POST /api/notes/send
```
**Request Body:**
```json
{
  "receiverId": "USER_ID",
  "message": "string"
}
```
**Data Size:** Request ~200-2500 bytes, Response ~100 bytes
**Frequency:** 10-50 times/day

#### 4. Get Allowed Receivers
```
GET /api/notes/allowed-receivers
```
**Response:** Array of user references (~200 bytes each)
**Frequency:** 2-5 times/day

#### 5. Mark Note as Read
```
PUT /api/notes/:id
```
**Data Size:** Request ~80 bytes, Response ~300 bytes
**Frequency:** 10-50 times/day

---

### Performance & KPI APIs

#### 1. Get My Performance
```
GET /api/performance/my-performance
```
**Response:** Performance metrics (~500-1000 bytes)
**Frequency:** 5-10 times/day

#### 2. Get System KPI Settings
```
GET /api/kpi-settings
```
**Response:** KPI configuration (~400-600 bytes)
**Frequency:** 2-5 times/day

#### 3. Update KPI Settings
```
PUT /api/kpi-settings
```
**Request Body:** KPI configuration
**Data Size:** Request ~300-500 bytes
**Frequency:** 0-2 times/month

#### 4. Test KPI Calculation
```
POST /api/kpi-settings/test-calculation
```
**Data Size:** Request ~200 bytes, Response ~500 bytes
**Frequency:** 0-5 times/week

#### 5. Verify KPI System
```
GET /api/kpi-settings/verify
```
**Response:** System status (~200 bytes)
**Frequency:** 0-2 times/week

---

### Settings APIs

#### 1. Get System Settings
```
GET /api/settings
```
**Response:** System configuration (~600-800 bytes)
**Frequency:** 2-5 times/day

#### 2. Update System Settings
```
PUT /api/settings
```
**Request Body:**
```json
{
  "officeLatitude": number,
  "officeLongitude": number,
  "attendanceRadius": number,
  "attendanceTime": "string",
  "commissionRules": [...]
}
```
**Data Size:** Request ~300-500 bytes
**Frequency:** 0-2 times/month

---

### Performance Reports APIs

#### 1. Team Performance Report
```
GET /api/admin/team-performance?month=YYYY-MM
```
**Response:** Team metrics (~1-2 KB)
**Frequency:** 2-5 times/day

#### 2. Team Leader Performance Report
```
GET /api/admin/team-leaders-performance?month=YYYY-MM
```
**Response:** Leader metrics (~800 bytes each)
**Frequency:** 2-5 times/day

---

## Data Operations & Bandwidth Analysis

### Typical Daily API Call Volume

**Scenario: 100 Sales Employees + 10 Admins**

| Operation | Frequency | Data Size | Daily Volume |
|-----------|-----------|-----------|--------------|
| Login | 110 users × 1-2 times | 500 bytes | 55 KB |
| Get Leads | 100 sales × 10 calls | 150 KB avg | 1.5 MB |
| Get Attendance | 100 users × 1 call | 5 KB | 500 KB |
| Check-In | 100 users × 1 call | 100 bytes | 10 KB |
| Get Notes | 110 users × 5 calls | 20 KB avg | 1 MB |
| Send Notes | 110 users × 2 messages | 1 KB | 220 KB |
| Get Commissions | 110 users × 2 calls | 30 KB | 60 KB |
| Get Settings | 110 users × 3 calls | 1 KB | 110 KB |
| Get Teams | 110 users × 2 calls | 4 KB | 220 KB |
| Update Lead | 100 sales × 5 updates | 500 bytes | 250 KB |

**Total Daily API Bandwidth:** ~4.5 MB (inbound + outbound)

### Monthly Calculations

- **Monthly API Bandwidth:** 4.5 MB × 30 days = ~135 MB
- **Monthly Database Reads:** ~30,000-50,000 operations
- **Monthly Database Writes:** ~5,000-10,000 operations

---

## Estimated Data Storage Calculations

### Database Storage by Collection (12-month projection)

**Assumptions:**
- 100 active employees (sales + admin)
- 10 teams
- Medium sales activity: 1,000 leads/month
- 80% closure rate = 800 commissions/month
- 1 check-in per employee per workday (20 workdays/month)

| Collection | Monthly Records | Avg Doc Size | Monthly Growth | 12-Month Total |
|------------|-----------------|--------------|----------------|-----------------|
| Users | 5-10 new | 500 bytes | 5 KB | 55 KB |
| Leads | 1,000 | 1.2 KB | 1.2 MB | 14.4 MB |
| Commissions | 800 | 700 bytes | 560 KB | 6.7 MB |
| Attendance | 2,000 | 380 bytes | 760 KB | 9.1 MB |
| Notes | 300 | 1.2 KB | 360 KB | 4.3 MB |
| Teams | 0-2 | 350 bytes | 1 KB | 1 KB |
| Team Leader Performance | 10-20 | 330 bytes | 6 KB | 72 KB |
| KPI Settings | 1 | 500 bytes | 0.5 KB | 6 KB |
| System Settings | 1 | 700 bytes | 0.7 KB | 8 KB |

**Total 12-Month Database Size:** ~35-40 MB

**With indexes:** ~45-55 MB (indexes typically add 15-25% overhead)

---

## Hosting Cost Estimation

### Application Hosting Options

#### Option 1: Vercel (Next.js Recommended)
- **Serverless Functions:** $0.50 per 1M requests
- **Bandwidth:** $0.15 per GB
- **Database:** Managed separately
- **Monthly Load Estimate:**
  - 135 MB API bandwidth = $0.02
  - ~1.5M API requests/month = $0.75
  - **Monthly Cost:** ~$10-20

#### Option 2: AWS EC2
- **t3.small instance:** $20/month
- **Data transfer out:** $0.09/GB
- **EBS storage (50GB):** $5/month
- **Monthly Cost:** ~$25-35

#### Option 3: DigitalOcean
- **Basic Droplet (2GB RAM):** $12/month
- **Managed App Platform:** $5/month
- **Bandwidth:** $0.01/GB (first 1TB free)
- **Monthly Cost:** ~$17-25

#### Option 4: Railway/Render
- **Pay-per-use model:** $0.10/GB RAM/hour
- **Estimated 500 hours/month:** $50-100
- **Monthly Cost:** ~$50-100

### Recommended Hosting Stack
**Best Value:** DigitalOcean Droplet ($12/month) + Managed Database
**Best Performance:** AWS EC2 ($25/month) + RDS
**Best Serverless:** Vercel ($10-20/month) + MongoDB Atlas

---

## Cloud Database Cost Estimation

### MongoDB Atlas (Recommended for MongoDB)

#### Shared Tier (Free)
- **Database Size:** Up to 512 MB
- **Not suitable for production**

#### Dedicated Cluster M0 ($0)
- **Database Size:** Up to 512 MB
- **Data Transfer:** Shared
- **Monthly Cost:** $0 (but limited features)

#### Dedicated Cluster M2 ($9/month)
- **Database Size:** 2 GB
- **Data Transfer:** 10 GB/month included
- **Additional Transfer:** $0.50/GB
- **Monthly Cost:** $9-15

#### Dedicated Cluster M5 ($57/month)
- **Database Size:** 10 GB
- **Data Transfer:** 100 GB/month included
- **Additional Transfer:** $0.30/GB
- **Monthly Cost:** $57-70

#### Dedicated Cluster M10 ($90/month)
- **Database Size:** 20 GB
- **Data Transfer:** Unlimited
- **Monthly Cost:** $90+

### MongoDB Atlas Cost Projections

**12-Month Database Growth:** 45-55 MB

| Time Period | Size | Recommended Tier | Monthly Cost |
|-------------|------|------------------|--------------|
| Months 1-6 | 20-25 MB | M2 ($9) | $9 |
| Months 7-12 | 40-55 MB | M2 ($9) or M5 ($57) | $9-57 |

**12-Month Database Costs:**
- **Conservative (M2 entire period):** 12 × $9 = **$108**
- **Growth-based (M2→M5 at month 9):** (8 × $9) + (4 × $57) = **$300**

### Data Transfer Costs

**Typical Monthly Data Transfer:**
- Outbound: 135 MB (API responses)
- Inbound: 135 MB (API requests)
- **Total:** ~270 MB/month

**M2 Tier:** 10 GB/month included → no extra cost
**M5 Tier:** 100 GB/month included → no extra cost

---

### Alternative: MongoDB Realm

- **Dedicated cluster required**
- **Sync tier:** $10-20/user/month
- **Data transfer:** Included
- **Minimum:** 3 instances
- **Monthly Cost:** $30-60+

### Alternative: Self-Hosted MongoDB

**DigitalOcean Managed MongoDB:**
- **$50/month minimum**
- **Includes:** Automated backups, replicas
- **Monthly Cost:** $50+

**AWS DocumentDB (MongoDB Compatible):**
- **On-Demand:** $0.87/instance/hour
- **2 instances:** ~$50-100/month
- **Data transfer:** Included in region
- **Monthly Cost:** $50-100

---

## Cost Optimization Recommendations

### 1. Database Optimization

**Implement Data Archival:**
- Archive attendance records older than 12 months
- Estimated savings: 5-10 MB/year
- Cost impact: Minimal

**Optimize Indexes:**
- Remove unused indexes
- Combine indexes: `userId+date` instead of separate indexes
- Estimated improvement: 10-15% storage reduction

**Compress Historical Data:**
- Archive old leads (status: 'closed' or 'lost') to separate collection
- Can reduce active collection by 20-30%
- Estimated savings: 3-5 MB

### 2. API Optimization

**Implement Pagination:**
- Default limit 20 records per page
- Currently returning all leads (can be 100+ KB)
- Estimated reduction: 50-70% bandwidth

**Add Response Caching:**
- Cache system settings (rarely changes)
- Cache team data (changes infrequently)
- Estimated savings: 20-30% bandwidth

**Compress API Responses:**
- Enable gzip compression (Next.js automatic)
- Typical compression ratio: 3-5:1
- Estimated savings: 60-80% bandwidth

### 3. Hosting Cost Reduction

| Strategy | Implementation | Potential Savings |
|----------|-----------------|-------------------|
| Use CDN | Cloudflare Free (~$20/month) | Reduce server load 20-30% |
| Enable Caching Headers | Cache-Control headers | Reduce API calls 15-25% |
| Database Connection Pooling | Implement pgBouncer-style pooling | Reduce connection overhead |
| Image Optimization | Compress proof images to WebP | Reduce bandwidth 40-50% |
| Lazy Loading | Load data on-demand | Reduce initial load 50% |

### 4. Cost Breakdown Summary (100 employees, medium activity)

**Monthly Costs:**

| Component | Recommended Option | Monthly Cost | Annual Cost |
|-----------|-------------------|--------------|------------|
| Application Hosting | DigitalOcean Droplet | $12 | $144 |
| Database | MongoDB Atlas M2 | $9 | $108 |
| Backup/Storage | DigitalOcean Spaces 250GB | $5 | $60 |
| Domain | Domain registrar | $1-3 | $12-36 |
| Email (optional) | SendGrid Free tier | $0 | $0 |
| Monitoring (optional) | Datadog Free tier | $0 | $0 |
| **TOTAL** | | **$27-29** | **$324-348** |

**With optimization:**
- CDN caching: Save $5-10/month
- Reduced data transfer: Save $2-5/month
- **Optimized Total:** $15-20/month (~$180-240/year)

---

### 5. Scaling Considerations

**At 500+ Employees:**
- Attendance records: ~12 MB/month
- Leads: Potentially 100+ MB/month
- Total annual growth: 1.5+ GB
- **Recommended:** Upgrade to M5 cluster (~$57/month)
- **Additional:** Implement sharding for attendance collection
- **Annual cost:** ~$800-1000

**At 1000+ Employees:**
- Need dedicated MongoDB cluster
- Data archival essential
- Implement search indexing (Elasticsearch)
- **Recommended:** M10+ cluster (~$90+/month)
- **Annual cost:** $1000+

---

## Database Query Optimization Guide

### High-Frequency Queries

**1. Get Leads by User (Called 100+ times/day)**
```javascript
db.leads.find({ assignedTo: ObjectId("userId") })
         .sort({ createdAt: -1 })
         .limit(20)
```
**Index:** `{ assignedTo: 1, createdAt: -1 }`
**Performance:** < 1ms with index

**2. Get Attendance by User and Date (Called 50+ times/day)**
```javascript
db.attendance.find({ userId: ObjectId("userId"), date: Date })
```
**Index:** `{ userId: 1, date: -1 }`
**Performance:** < 1ms with index

**3. Get Notes by Receiver (Called 100+ times/day)**
```javascript
db.notes.find({ receiver: ObjectId("userId") })
        .sort({ createdAt: -1 })
        .limit(20)
```
**Index:** `{ receiver: 1, createdAt: -1 }`
**Performance:** < 1ms with index

### Recommended Index Strategy

**Indexes to Create:**
```javascript
// User indexes
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ teamId: 1 })

// Lead indexes
db.leads.createIndex({ assignedTo: 1, createdAt: -1 })
db.leads.createIndex({ status: 1 })

// Attendance indexes
db.attendance.createIndex({ userId: 1, date: -1 })
db.attendance.createIndex({ userId: 1, createdAt: -1 })

// Commission indexes
db.commissions.createIndex({ employeeId: 1, createdAt: -1 })
db.commissions.createIndex({ dealId: 1 })

// Note indexes
db.notes.createIndex({ receiver: 1, createdAt: -1 })
db.notes.createIndex({ sender: 1, createdAt: -1 })

// Team Leader Performance index
db.teamleaderperformances.createIndex({ userId: 1, month: 1 }, { unique: true })
```

**Storage Impact:** ~5-10 MB (indexes)
**Performance Gain:** 50-100x faster queries

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Database Metrics**
   - Collection sizes monthly
   - Query execution times
   - Index usage
   - Connection count

2. **API Metrics**
   - Requests per second
   - Average response time
   - Error rate
   - Bandwidth usage

3. **Application Metrics**
   - Memory usage
   - CPU usage
   - Active sessions
   - Error logs

### Monitoring Tools (Free/Cheap)

| Tool | Cost | Use Case |
|------|------|----------|
| MongoDB Atlas Monitoring | Free | Database metrics |
| Vercel Analytics | Free | App performance |
| Sentry | Free tier | Error tracking |
| LogRocket | Free tier | Session replay |
| Google Analytics | Free | User behavior |

---

## Backup & Disaster Recovery

### Backup Strategy

**MongoDB Atlas:**
- **Continuous Backups:** $0 (included in M2+)
- **Automated Daily Snapshots:** Retained for 35 days
- **On-Demand Snapshots:** Free (unlimited)
- **RPO (Recovery Point Objective):** 5 minutes

**Recommended Addition:**
- Export to S3: Daily export cost ~$1/month
- Restore time: 2-4 hours
- Cost: ~$1-5/month additional

### Disaster Recovery Costs

| Level | Cost | Features |
|-------|------|----------|
| Basic (Atlas built-in) | $0 | Automated backup to 35 days |
| Standard (+ weekly export) | $5/month | Weekly backups to S3 for 1 year |
| Premium (+ real-time replica) | $50+/month | Real-time replica in different region |

---

## Conclusion & Recommendations

### Best Configuration (100 employees, medium activity)

**Hosting:**
- DigitalOcean App Platform: $12/month

**Database:**
- MongoDB Atlas M2: $9/month

**Additional Services:**
- Backup/Archive: $5/month
- Domain: $2/month

**Total: ~$28/month ($336/year)**

### Key Action Items

1. **Implement indexes immediately** (Performance critical)
2. **Set up pagination** for lead/note APIs (Bandwidth saving)
3. **Enable response compression** (Already in Next.js)
4. **Schedule database maintenance** (Monthly)
5. **Monitor growth metrics** (Weekly)
6. **Plan data archival strategy** (Before 1 GB)

### 3-Year Projection

| Year | Data Size | Est. Monthly Cost | Notes |
|------|-----------|-------------------|-------|
| Year 1 | 50 MB | $28-35 | M2 tier sufficient |
| Year 2 | 500 MB | $35-45 | Approaching M5 limits |
| Year 3 | 1-2 GB | $60-90 | M5 tier, data archival needed |

---

**Document Prepared:** January 29, 2026  
**Review Frequency:** Quarterly  
**Next Review:** April 29, 2026
