# Excel Template Guide - Service Dashboard

## Quick Reference: Required Excel Columns

### 📊 RO Billing Table

**Required Columns (exact names):**
```
Bill Date | Service Advisor | Labour Amt | Part Amt | Work Type
```

**Alternative Column Names (also accepted):**
- "Date" → Bill Date
- "Advisor" → Service Advisor
- "Labour Amount" → Labour Amt
- "Parts Amount" or "Part Amount" → Part Amt
- "Type" → Work Type

**Sample Data:**
| Bill Date  | Service Advisor | Labour Amt | Part Amt | Work Type    |
|------------|----------------|------------|----------|--------------|
| 2025-01-01 | John Doe       | 5000       | 2000     | Paid Service |
| 2025-01-02 | Jane Smith     | 3000       | 1500     | Free Service |
| 2025-01-03 | Bob Wilson     | 4000       | 1800     | Running Repair |

---

### 📋 Booking List Table

**Required Columns (exact names):**
```
Service Advisor | B.T Date & Time | Work Type | Status
```

**Alternative Column Names (also accepted):**
- "Advisor" or "SA" → Service Advisor
- "BT Date & Time" or "BT DateTime" or "Date & Time" → B.T Date & Time
- "Type" or "Service Type" → Work Type

**Sample Data:**
| Service Advisor | B.T Date & Time      | Work Type      | Status    |
|----------------|---------------------|----------------|-----------|
| John Doe       | 2025-01-01 10:00 AM | Paid Service   | Completed |
| Jane Smith     | 2025-01-02 02:00 PM | Free Service   | Pending   |
| Bob Wilson     | 2025-01-03 09:00 AM | Running Repair | In Progress |

**Valid Status Values:**
- Completed
- Pending
- In Progress
- Cancelled

---

### 🔧 Warranty Claim List Table

**Required Columns (exact names):**
```
Claim Date | Claim Type | Status | Labour | Part
```

**Alternative Column Names (also accepted):**
- "Date" → Claim Date
- "Type" or "Warranty Type" → Claim Type
- "Labour Amt" or "Labour Amount" → Labour
- "Part Amt" or "Parts Amount" → Part

**Sample Data:**
| Claim Date | Claim Type | Status   | Labour | Part |
|------------|-----------|----------|--------|------|
| 2025-01-01 | Engine    | Approved | 5000   | 3000 |
| 2025-01-02 | Brake     | Pending  | 2000   | 1000 |
| 2025-01-03 | Transmission | Rejected | 8000 | 5000 |

**Valid Status Values:**
- Approved
- Pending
- Rejected
- Under Review

---

### ⚙️ Operation Wise Analysis Report Table

**Required Columns (exact names):**
```
OP/Part Desc. | Count | Amt
```

**Alternative Column Names (also accepted):**
- "OP/Part Desc" or "Description" or "OP Description" or "Part Description" → OP/Part Desc.
- "Quantity" → Count
- "Amount" or "Total" → Amt

**Sample Data:**
| OP/Part Desc.           | Count | Amt    |
|------------------------|-------|--------|
| Oil Change             | 15    | 45000  |
| Brake Pad Replacement  | 8     | 32000  |
| Tire Rotation          | 12    | 24000  |
| Air Filter Change      | 20    | 20000  |
| Battery Replacement    | 5     | 15000  |

---

## 📝 Excel File Requirements

### General Rules
1. **File Format**: .xlsx or .xls only
2. **First Row**: Must contain column headers
3. **Data Starts**: Row 2 onwards
4. **No Empty Rows**: Between data rows
5. **No Merged Cells**: In data area
6. **Consistent Data Types**: Numbers in number columns, dates in date columns

### Data Type Guidelines

**Dates:**
- Format: YYYY-MM-DD (e.g., 2025-01-01)
- Or: DD/MM/YYYY (e.g., 01/01/2025)
- Or: MM/DD/YYYY (e.g., 01/01/2025)

**Numbers:**
- No currency symbols (₹, $, etc.)
- No commas (5000, not 5,000)
- Decimal allowed (5000.50)

**Text:**
- Any text is acceptable
- Avoid special characters if possible
- Keep consistent naming (e.g., "Paid Service" not "paid service" or "PAID SERVICE")

**Date & Time:**
- Format: YYYY-MM-DD HH:MM AM/PM
- Example: 2025-01-01 10:00 AM

---

## 🎯 Work Type Values

For accurate Work Type Breakdown, use consistent values:

### Recommended Work Types:
- **Paid Service** - Regular paid services
- **Free Service** - Complimentary services
- **Running Repair** - Ongoing repairs
- **Warranty Service** - Warranty-covered services
- **Insurance Claim** - Insurance-related work
- **Accident Repair** - Accident damage repairs

**Note:** You can use any work type names, but be consistent across all files for accurate distribution calculation.

---

## 📥 Download Templates

### Template 1: RO Billing
```
Bill Date,Service Advisor,Labour Amt,Part Amt,Work Type
2025-01-01,John Doe,5000,2000,Paid Service
2025-01-02,Jane Smith,3000,1500,Free Service
```

### Template 2: Booking List
```
Service Advisor,B.T Date & Time,Work Type,Status
John Doe,2025-01-01 10:00 AM,Paid Service,Completed
Jane Smith,2025-01-02 02:00 PM,Free Service,Pending
```

### Template 3: Warranty Claims
```
Claim Date,Claim Type,Status,Labour,Part
2025-01-01,Engine,Approved,5000,3000
2025-01-02,Brake,Pending,2000,1000
```

### Template 4: Operation Wise
```
OP/Part Desc.,Count,Amt
Oil Change,15,45000
Brake Pad Replacement,8,32000
```

---

## ✅ Validation Checklist

Before uploading, verify:

- [ ] File is .xlsx or .xls format
- [ ] First row has column headers
- [ ] Column names match required or alternative names
- [ ] No empty rows in data
- [ ] Numbers are formatted correctly (no symbols)
- [ ] Dates are in consistent format
- [ ] Work Type values are consistent
- [ ] No merged cells
- [ ] File size is reasonable (< 10 MB)

---

## 🚫 Common Mistakes to Avoid

### ❌ Wrong Column Names
```
Bill_Date | SA | Labor | Parts | Type
```
**Fix:** Use exact names or accepted alternatives

### ❌ Currency Symbols in Numbers
```
Labour Amt: ₹5,000
```
**Fix:** Use: 5000

### ❌ Inconsistent Work Types
```
Row 1: Paid Service
Row 2: paid service
Row 3: PAID SERVICE
```
**Fix:** Use consistent capitalization: "Paid Service"

### ❌ Empty Rows
```
Row 1: Headers
Row 2: Data
Row 3: (empty)
Row 4: Data
```
**Fix:** Remove empty rows

### ❌ Merged Cells
```
Service Advisor column merged across 2 cells
```
**Fix:** Unmerge all cells

---

## 💡 Tips for Best Results

1. **Use Templates**: Start with provided templates above
2. **Copy-Paste**: Copy your data into template structure
3. **Verify Headers**: Double-check column names before upload
4. **Test Small**: Upload small file first to verify format
5. **Consistent Naming**: Use same work type names across all files
6. **Clean Data**: Remove extra spaces, special characters
7. **Backup**: Keep original files before uploading

---

## 🔄 Upload Process

1. **Select Data Type**: Choose from dropdown (RO Billing, Booking List, etc.)
2. **Choose File**: Click file input and select Excel file
3. **Upload**: Click "Upload" button
4. **Wait**: System processes file (few seconds)
5. **Verify**: Check success message with row count
6. **Review**: Go to respective tab to see data

---

## 📞 Support

If upload fails:
1. Check column names match template
2. Verify file format (.xlsx or .xls)
3. Check for empty rows or merged cells
4. Try with smaller dataset first
5. Check browser console for errors (F12)

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0
