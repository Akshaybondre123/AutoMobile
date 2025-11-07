# Testing Checklist - Service Dashboard

## Pre-Testing Setup

### ✅ Backend Setup
- [ ] MongoDB is running (check with `mongosh` or MongoDB Compass)
- [ ] Navigate to `AutoBackend` folder
- [ ] Run `npm install` (if first time)
- [ ] Run `npm start`
- [ ] Verify console shows: "✅ MongoDB connected successfully"
- [ ] Verify console shows: "🚀 Server running on port 5000"

### ✅ Frontend Setup
- [ ] Navigate to `shubh-hyundai-dashboard` folder
- [ ] Run `npm install` (if first time)
- [ ] Run `npm run dev`
- [ ] Verify console shows: "Ready on http://localhost:3000"
- [ ] Open browser to `http://localhost:3000`

## Functional Testing

### 1. Login Flow
- [ ] Navigate to `http://localhost:3000/login`
- [ ] Enter email: `sm.pune@shubh.com`
- [ ] Enter password: `password`
- [ ] Click "Sign In"
- [ ] Should redirect to dashboard

### 2. Dashboard Initial State
- [ ] Dashboard loads successfully
- [ ] Header shows "Service Dashboard"
- [ ] User name and city displayed correctly
- [ ] "Refresh" and "Reset Database" buttons visible
- [ ] File upload section visible with dropdown and file input
- [ ] Tabs visible: Overview, RO Billing, Booking List, Warranty Claims, Operation Wise
- [ ] Work Type Breakdown card visible on right side
- [ ] Overview tab shows "No data available" messages

### 3. File Upload - RO Billing

**Prepare Test Excel File:**
Create Excel file with these columns:
| Bill Date  | Service Advisor | Labour Amt | Part Amt | Work Type    |
|------------|----------------|------------|----------|--------------|
| 2025-01-01 | John Doe       | 5000       | 2000     | Paid Service |
| 2025-01-02 | Jane Smith     | 3000       | 1500     | Free Service |
| 2025-01-03 | Bob Wilson     | 4000       | 1800     | Paid Service |

**Test Steps:**
- [ ] Select "RO Billing" from dropdown
- [ ] Click file input and select Excel file
- [ ] Click "Upload" button
- [ ] Should show "Uploading..." state
- [ ] Should show success toast: "File uploaded successfully. 3 rows processed."
- [ ] Overview tab should update with averages
- [ ] RO Billing tab should show 3 records
- [ ] Work Type Breakdown should show distribution

### 4. File Upload - Booking List

**Prepare Test Excel File:**
| Service Advisor | B.T Date & Time      | Work Type      | Status    |
|----------------|---------------------|----------------|-----------|
| John Doe       | 2025-01-01 10:00 AM | Paid Service   | Completed |
| Jane Smith     | 2025-01-02 02:00 PM | Free Service   | Pending   |
| Bob Wilson     | 2025-01-03 09:00 AM | Running Repair | Completed |

**Test Steps:**
- [ ] Select "Booking List" from dropdown
- [ ] Upload Excel file
- [ ] Should show success message
- [ ] Booking List tab should show 3 records
- [ ] Work Type Breakdown should update

### 5. File Upload - Warranty Claims

**Prepare Test Excel File:**
| Claim Date | Claim Type | Status   | Labour | Part |
|------------|-----------|----------|--------|------|
| 2025-01-01 | Engine    | Approved | 5000   | 3000 |
| 2025-01-02 | Brake     | Pending  | 2000   | 1000 |

**Test Steps:**
- [ ] Select "Warranty Claims" from dropdown
- [ ] Upload Excel file
- [ ] Should show success message
- [ ] Warranty Claims tab should show 2 records

### 6. File Upload - Operation Wise

**Prepare Test Excel File:**
| OP/Part Desc.     | Count | Amount |
|-------------------|-------|--------|
| Oil Change        | 15    | 45000  |
| Brake Pad Replace | 8     | 32000  |
| Tire Rotation     | 12    | 24000  |

**Test Steps:**
- [ ] Select "Operation Wise" from dropdown
- [ ] Upload Excel file
- [ ] Should show success message
- [ ] Operation Wise tab should show 3 records
- [ ] Should display total count and amount

### 7. Overview Tab Verification
- [ ] Click "Overview" tab
- [ ] Should show "Avg. Labour Amount" card with calculated average
- [ ] Should show "Avg. Parts Amount" card with calculated average
- [ ] Should show "Total Services" card with total count
- [ ] Should show 4 summary cards: RO Billing, Bookings, Warranty Claims, Operations
- [ ] All numbers should be correct

### 8. Data Table Verification

**RO Billing Table:**
- [ ] Click "RO Billing" tab
- [ ] Table shows all uploaded records
- [ ] Columns: Bill Date, Service Advisor, Labour Amt, Part Amt, Work Type
- [ ] Labour and Part amounts formatted with ₹ symbol
- [ ] Work Type shown in colored badge
- [ ] Hover effect on rows

**Booking List Table:**
- [ ] Click "Booking List" tab
- [ ] Table shows all uploaded records
- [ ] Columns: Service Advisor, B.T Date & Time, Work Type, Status
- [ ] Status shown in colored badge (green for Completed, yellow for Pending)
- [ ] Hover effect on rows

**Warranty Claims Table:**
- [ ] Click "Warranty Claims" tab
- [ ] Table shows all uploaded records
- [ ] Columns: Claim Date, Claim Type, Status, Labour, Part
- [ ] Status shown in colored badge (green for Approved, yellow for Pending, red for Rejected)
- [ ] Labour and Part amounts formatted with ₹ symbol

**Operation Wise Table:**
- [ ] Click "Operation Wise" tab
- [ ] Table shows all uploaded records
- [ ] Columns: OP/Part Desc., Count, Amount
- [ ] Header shows total count and total amount
- [ ] Amount formatted with ₹ symbol

### 9. Work Type Breakdown Verification
- [ ] Right panel shows "Work Type Breakdown" card
- [ ] Pie chart displays with correct colors
- [ ] Chart shows percentage labels
- [ ] Legend below chart lists all work types
- [ ] Each work type shows count
- [ ] Total count displayed at bottom
- [ ] Total matches sum of all types

### 10. Refresh Functionality
- [ ] Click "Refresh" button
- [ ] Button shows spinning icon
- [ ] Data reloads from server
- [ ] All tables update correctly
- [ ] Work Type Breakdown updates

### 11. Reset Database Functionality
- [ ] Click "Reset Database" button
- [ ] Confirmation dialog appears
- [ ] Dialog shows warning message
- [ ] Click "Cancel" - nothing happens
- [ ] Click "Reset Database" again
- [ ] Click "Delete All Data" in dialog
- [ ] Success toast appears
- [ ] All data cleared from tables
- [ ] Overview shows "No data available"
- [ ] Work Type Breakdown shows "No data available"

### 12. Error Handling

**No File Selected:**
- [ ] Click "Upload" without selecting file
- [ ] Should show error toast: "Please select a file first"

**Wrong File Type:**
- [ ] Try uploading .txt or .pdf file
- [ ] Should show error or reject file

**Backend Down:**
- [ ] Stop backend server
- [ ] Try uploading file
- [ ] Should show error toast: "Failed to upload file"
- [ ] Restart backend

### 13. UI/UX Testing

**Responsive Design:**
- [ ] Resize browser window to mobile size
- [ ] Layout adjusts correctly
- [ ] Tables scroll horizontally if needed
- [ ] Work Type Breakdown moves below on mobile

**Dark Mode (if supported):**
- [ ] Toggle dark mode
- [ ] All colors adjust correctly
- [ ] Text remains readable

**Loading States:**
- [ ] Upload button shows "Uploading..." during upload
- [ ] Refresh button shows spinning icon during refresh
- [ ] Tables show loading state when fetching

**Animations:**
- [ ] Hover effects on cards
- [ ] Smooth transitions between tabs
- [ ] Toast notifications slide in/out

### 14. Data Accuracy

**Averages Calculation:**
- [ ] Manually calculate average labour from RO Billing records
- [ ] Compare with displayed average - should match
- [ ] Manually calculate average parts from RO Billing records
- [ ] Compare with displayed average - should match

**Work Type Distribution:**
- [ ] Count "Paid Service" in RO Billing and Booking List
- [ ] Compare with Work Type Breakdown - should match
- [ ] Repeat for other work types

**Totals:**
- [ ] Sum all counts in Operation Wise table
- [ ] Compare with total in header - should match
- [ ] Sum all amounts in Operation Wise table
- [ ] Compare with total in header - should match

### 15. Multiple Users Testing
- [ ] Logout
- [ ] Login as `sm.mumbai@shubh.com` / `password`
- [ ] Upload different data
- [ ] Logout
- [ ] Login back as `sm.pune@shubh.com` / `password`
- [ ] Verify Pune data is separate from Mumbai data
- [ ] Each user should only see their own data

## Backend API Testing (Optional)

### Using Postman or curl:

**Upload File:**
```bash
curl -X POST http://localhost:5000/api/service-manager/upload \
  -F "file=@test.xlsx" \
  -F "uploadedBy=sm.pune@shubh.com" \
  -F "city=Pune" \
  -F "uploadType=ro_billing"
```

**Get Dashboard Data:**
```bash
curl "http://localhost:5000/api/service-manager/dashboard-data?uploadedBy=sm.pune@shubh.com&city=Pune&dataType=ro_billing"
```

**Reset Database:**
```bash
curl -X DELETE "http://localhost:5000/api/service-manager/reset-database?uploadedBy=sm.pune@shubh.com&city=Pune"
```

## Performance Testing

- [ ] Upload file with 100+ rows - should process quickly
- [ ] Upload file with 1000+ rows - should complete within 10 seconds
- [ ] Switch between tabs - should be instant
- [ ] Refresh data - should complete within 2 seconds
- [ ] No memory leaks after multiple uploads

## Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

## Common Issues & Solutions

### Issue: MongoDB connection error
**Solution:** Ensure MongoDB is running. Check MONGO_URI in .env file.

### Issue: Port already in use
**Solution:** Kill process on port 5000 or 3000, or change port in config.

### Issue: Excel not parsing correctly
**Solution:** Ensure first row has column headers matching expected format.

### Issue: Data not showing after upload
**Solution:** Check browser console and backend terminal for errors. Click Refresh.

### Issue: Work Type Breakdown empty
**Solution:** Ensure uploaded data has "Work Type" column with values.

## Sign-Off

- [ ] All functional tests passed
- [ ] All UI/UX tests passed
- [ ] All data accuracy tests passed
- [ ] No console errors
- [ ] No backend errors
- [ ] Performance acceptable
- [ ] Ready for production

---

**Tester Name:** _________________
**Date:** _________________
**Status:** ☐ PASS ☐ FAIL
**Notes:** _________________
