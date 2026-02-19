# API Overview

This document lists the main API route folders and their responsibilities. Each folder under `src/api` groups related endpoints.

- `src/api/admin` — admin-only endpoints and tools
- `src/api/attendance` — attendance creation, querying, and reporting
- `src/api/auth` — authentication endpoints (login/register)
- `src/api/commissions` — commission calculation and retrieval
- `src/api/deal-closing` — closing deals and related operations
- `src/api/employees` — employee CRUD and assignments
- `src/api/kpi-settings` — KPI configuration management
- `src/api/leads` — lead management endpoints
- `src/api/notes` — internal notes API
- `src/api/notifications` — notification creation and listing
- `src/api/push` — push subscription and sending
- `src/api/teams` — team management endpoints

To add new endpoints, create files under the appropriate folder in `src/api` following Next.js routing conventions.
