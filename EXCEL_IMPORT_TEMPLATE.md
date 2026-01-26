# Bulk Import Excel Template

The bulk import feature allows administrators to import multiple leads at once from an Excel file.

## Excel File Format

Your Excel file should have the following columns (headers are case-insensitive):

| Column Name | Required | Type | Description |
|---|---|---|---|
| name | Yes | Text | Full name of the lead |
| email | Yes | Text | Email address (will be converted to lowercase) |
| phone | Yes | Text | Phone number |
| property | Yes | Text | Property name or address |
| value | No | Number | Deal value (optional, defaults to 0) |
| assignedTo | No | Text | Employee ID (optional, can be assigned later) |

## Example:

```
name,email,phone,property,value,assignedTo
John Doe,john@example.com,555-0101,Downtown Apartment,50000,
Jane Smith,jane@example.com,555-0102,Beach House,75000,
Bob Johnson,bob@example.com,555-0103,Commercial Building,150000,
```

## Process:

1. Navigate to Admin → Leads section
2. Click "Import from Excel" button
3. Select your Excel file (.xlsx, .xls, or .csv)
4. Review the imported leads in the modal
5. Select which leads to assign (or use "Select All")
6. Choose an employee to assign the selected leads to
7. Click "Assign Leads" to complete the process

## Notes:

- All leads will be created with status "new"
- You can assign leads to employees during import, or leave them unassigned and assign later
- Duplicate emails are allowed in the system
- If a row is missing required fields, it will be skipped with an error message
- All emails are automatically converted to lowercase
- Phone numbers and names are trimmed of whitespace

## Error Handling:

If your import has errors:
- Rows with missing required fields will be skipped
- You'll see a notification showing how many rows were imported and how many had errors
- Successfully imported leads can still be assigned to employees
- You can re-import the corrected rows
