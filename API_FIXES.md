# API Fixes - Lead Creation 500 Error

## Problem
When admin users attempted to add a new lead via POST `/api/leads`, the request returned HTTP 500 Internal Server Error.

## Root Causes
1. **Invalid ObjectId Conversion**: The `assignedTo` field was being passed directly to Mongoose without proper ObjectId conversion, causing validation errors when an invalid string or empty string was sent.
2. **Budget Type Mismatch**: The `budget` field wasn't being explicitly converted to a number, which could cause type validation failures.
3. **Generic Error Messages**: Error responses didn't include the actual error details, making debugging difficult.

## Solutions Implemented

### 1. POST `/api/leads` Route Fix
**File**: `src/app/api/leads/route.ts`

- Added explicit budget number conversion with validation:
  ```typescript
  const budgetNum = typeof budget === 'string' ? parseInt(budget) : budget;
  if (isNaN(budgetNum)) {
    return NextResponse.json({ error: 'Budget must be a valid number' }, { status: 400 });
  }
  ```

- Added proper ObjectId conversion for `assignedTo`:
  ```typescript
  let assignedToId: any = undefined;
  if (assignedTo) {
    try {
      const { Types } = await import('mongoose');
      assignedToId = new Types.ObjectId(assignedTo);
    } catch {
      return NextResponse.json({ error: 'Invalid assignedTo ID' }, { status: 400 });
    }
  }
  ```

- Improved error reporting to return actual error messages instead of generic "Failed to create lead"

### 2. PUT `/api/leads/[id]` Route Fix
**File**: `src/app/api/leads/[id]/route.ts`

- Added budget type conversion in update data
- Added ObjectId conversion for `assignedTo` field in updates:
  ```typescript
  if (assignedTo !== undefined) {
    if (assignedTo) {
      try {
        const { Types } = await import('mongoose');
        updateData.assignedTo = new Types.ObjectId(assignedTo);
      } catch {
        return NextResponse.json({ error: 'Invalid assignedTo ID' }, { status: 400 });
      }
    } else {
      updateData.assignedTo = null;
    }
  }
  ```

- Improved error reporting for update operations

## Testing
The API now properly handles:
- Lead creation with valid data
- Budget values as strings or numbers
- AssignedTo field with valid MongoDB ObjectIds
- Empty/null assignedTo values
- Invalid ObjectId strings (returns 400 Bad Request with clear error message)

## Result
POST `/api/leads` will no longer return 500 errors for data validation issues. Instead, it will return:
- **201**: Lead created successfully
- **400**: Missing required fields or invalid data format
- **401**: Unauthorized (missing token)
- **403**: Forbidden (non-admin user)
- **500**: Actual server errors (with details in logs and response)
