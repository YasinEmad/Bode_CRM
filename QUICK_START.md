# Quick Start: Bulk Lead Import

## 🚀 5-Minute Setup

### For Admin Users:

1. **Go to Admin Panel** → Leads
2. **Click** "Import from Excel" (green button)
3. **Select** your Excel file
4. **Select Leads** in the modal (or "Select All")
5. **Choose Employee** to assign to
6. **Click** "Assign Leads"

✅ **Done!** Leads are now assigned to your sales team.

---

## 📊 Excel Format (Simple)

```csv
name,email,phone,property,value
John Doe,john@email.com,555-1234,Downtown Apt,50000
Jane Smith,jane@email.com,555-5678,Beach House,75000
```

**Must have:** name, email, phone, property  
**Optional:** value

---

## ❓ FAQ

**Q: Can I upload CSV files?**  
A: Yes! `.xlsx`, `.xls`, and `.csv` are supported.

**Q: What if a lead has no email?**  
A: It will be skipped with an error message. All fields are required.

**Q: Can I assign to multiple people?**  
A: No, one batch assigns to one person. Upload multiple batches for multiple people.

**Q: What if upload fails?**  
A: Check file format and required columns. See EXCEL_IMPORT_TEMPLATE.md

**Q: Can I undo assignments?**  
A: Go to individual lead cards and change assignment manually.

---

## 📁 Excel Column Names

These column names are accepted (case doesn't matter):
- `name` or `Name` or `NAME`
- `email` or `Email` or `EMAIL`  
- `phone` or `Phone` or `PHONE`
- `property` or `Property` or `PROPERTY`
- `value` or `Value` or `VALUE`
- `assignedTo` or `AssignedTo` or `assigned_to`

---

## ✨ What This Feature Does

✅ Upload multiple leads at once (no one-by-one entry)  
✅ Assign all to single sales person quickly  
✅ See full list before confirming  
✅ Select which leads to assign  
✅ All leads auto-created as "new" status  
✅ Automatic email validation  

---

## 📞 Support

For detailed documentation, see:
- [BULK_IMPORT_FEATURE.md](BULK_IMPORT_FEATURE.md) - Complete guide
- [EXCEL_IMPORT_TEMPLATE.md](EXCEL_IMPORT_TEMPLATE.md) - Excel format details
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Technical details

---

**Ready to import leads?** Start with the Admin Leads page!
