# Bulk Lead Import & Distribution Feature

## Overview

The admin can now bulk import leads from an Excel file and distribute them to sales team members in one streamlined workflow.

## Features Implemented

### 1. **Excel File Upload**
- Upload `.xlsx`, `.xls`, or `.csv` files
- Flexible column naming (case-insensitive)
- Required fields: name, email, phone, property
- Optional fields: value, assignedTo

### 2. **Bulk Import API** (`POST /api/leads/bulk-import`)
- Processes Excel files server-side
- Validates all rows before import
- Provides detailed error reporting
- Creates leads with "new" status by default
- Returns all successfully imported leads

### 3. **Bulk Assignment API** (`PUT /api/leads/bulk-assign`)
- Assign multiple leads to a single employee
- Select specific leads or all imported leads
- Instantaneous assignment with immediate feedback

### 4. **User Interface**
- Green "Import from Excel" button on Admin → Leads page
- Modal dialog showing imported leads in a table
- Checkbox selection for individual leads or "Select All"
- Dropdown to choose employee for assignment
- Real-time lead count display

## File Structure

### New Files Created:
```
src/
├── app/api/leads/
│   ├── bulk-import/route.ts      # Excel processing endpoint
│   └── bulk-assign/route.ts      # Bulk assignment endpoint
├── components/
│   └── BulkImportComponent.tsx   # Import UI component
EXCEL_IMPORT_TEMPLATE.md          # User guide
```

### Modified Files:
```
src/app/admin/leads/page.tsx      # Added BulkImportComponent
package.json                       # Added xlsx dependency
```

## Usage Flow

1. **Navigate to Admin Panel**
   - Go to Admin → Leads

2. **Upload Excel File**
   - Click "Import from Excel" button
   - Select Excel file from computer
   - System validates and imports leads

3. **Review & Select Leads**
   - Modal shows all imported leads
   - Review lead details (name, email, phone, property, value)
   - Use checkboxes to select which leads to assign
   - Or use "Select All" for all leads

4. **Assign to Sales Team**
   - Choose employee from dropdown
   - Click "Assign Leads" button
   - System immediately assigns selected leads

5. **Confirmation**
   - Success notification shows assigned count
   - Modal closes automatically
   - Leads list refreshes with new assignments

## Excel File Format

### Headers (Case-insensitive):
| Column | Required | Type | Notes |
|--------|----------|------|-------|
| name | ✓ | Text | Lead's full name |
| email | ✓ | Text | Converted to lowercase |
| phone | ✓ | Text | Can include formatting |
| property | ✓ | Text | Property name/address |
| value | | Number | Deal value (optional) |
| assignedTo | | Text | Employee ID (optional) |

### Example Excel Content:
```
name,email,phone,property,value
John Doe,john@example.com,555-0101,Downtown Apartment,50000
Jane Smith,jane@example.com,555-0102,Beach House,75000
Bob Johnson,bob@example.com,555-0103,Commercial Building,150000
```

## API Endpoints

### Import Leads
```
POST /api/leads/bulk-import
Headers: Authorization: Bearer <token>
Body: FormData with file
Response: { message, imported, errors?, leads }
```

### Assign Leads
```
PUT /api/leads/bulk-assign
Headers: Authorization: Bearer <token>
Body: { leadIds: string[], employeeId: string }
Response: { message, modifiedCount }
```

## Technical Details

### Dependencies
- **xlsx** (^0.18.5): Excel file parsing and processing

### Key Features
- ✅ Server-side Excel processing (secure)
- ✅ Row-by-row validation
- ✅ Error reporting per row
- ✅ Admin-only access (role-based auth)
- ✅ Transaction-like bulk operations
- ✅ Duplicate email support
- ✅ Whitespace trimming
- ✅ Email lowercase conversion

### Error Handling
- Invalid/missing required fields: Row skipped with error message
- File upload errors: User notification with error details
- Assignment errors: Transaction-safe with rollback capability
- Network errors: Automatic retry suggestions

## Security

- ✅ Token-based authentication required
- ✅ Admin-only feature (role verification)
- ✅ Server-side validation
- ✅ No client-side file reading
- ✅ Input sanitization

## Testing

The feature has been:
- ✅ Compiled without errors
- ✅ Type-checked (TypeScript)
- ✅ Server started successfully
- ✅ API endpoints registered
- ✅ UI components integrated

To test manually:
1. Start dev server: `npm run dev`
2. Navigate to Admin → Leads
3. Upload sample Excel file
4. Select leads and assign to sales team

## Future Enhancements

Possible additions:
- Column mapping configuration
- Pre-import data preview and validation
- Bulk delete leads
- Export leads to Excel
- Import scheduling/automation
- Duplicate detection and handling
- Batch edit capabilities
