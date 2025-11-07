# Service Manager Dashboard Implementation

## Overview
This implementation provides a complete Service Manager dashboard with file upload functionality and data isolation. Each Service Manager can upload four types of Excel files and view only their own data.

## Features

### 1. File Upload Types
Service Managers can upload the following Excel file types:
- **RO Billing** - Repair Order billing details with labour and parts cost
- **Operations** - Service operations and technician time tracking
- **Warranty** - Warranty claims and approvals
- **Service Booking List** - Service bookings and scheduling information

### 2. Data Isolation
- Each Service Manager's uploaded data is visible **only to them**
- Data is filtered by both `uploadedBy` (email) and `city`
- No other manager can see another manager's data
- Example: Pune Service Manager cannot see Mumbai or Nagpur data

### 3. Dashboard Features
- **Select Button** - Choose which data type to view:
  - RO Billing
  - Operations
  - Warranty
  - Service Booking List
  - Average of All Data
- **Data Visualization** - View uploaded data in organized tables
- **Metrics** - Summary statistics for each data type
- **Upload Management** - Track recent uploads and row counts

## Backend Implementation

### Models
**Location:** `AutoBackend/models/ServiceManagerUpload.js`

The model stores:
- Upload metadata (uploadedBy, city, uploadType, fileName, uploadDate)
- Parsed Excel data
- Row counts and date ranges

### Controllers
**Location:** `AutoBackend/controllers/serviceManagerController.js`

Key functions:
- `uploadServiceManagerFile` - Handle Excel file uploads
- `getServiceManagerUploads` - Get list of uploads for a manager
- `getUploadData` - Get specific upload with full data
- `getDashboardData` - Get aggregated data for dashboard
- `deleteUpload` - Delete an upload

### Routes
**Location:** `AutoBackend/routes/serviceManagerRoutes.js`

All routes are prefixed with `/api/service-manager`:
- `POST /upload` - Upload Excel file
- `GET /uploads` - Get all uploads for user
- `GET /upload/:uploadId` - Get specific upload
- `GET /dashboard-data` - Get dashboard data
- `DELETE /upload/:uploadId` - Delete upload

### Middleware
**Location:** `AutoBackend/middleware/authMiddleware.js`

- `validateServiceManager` - Validates upload credentials
- `ensureDataOwnership` - Ensures users can only access their own data

## Frontend Implementation

### Upload Page
**Location:** `shubh-hyundai-dashboard/app/dashboard/sm/upload/page.tsx`

Features:
- Four upload cards (one for each data type)
- Drag-and-drop file upload
- Real-time upload status
- Success/error messages
- Upload guidelines

### Dashboard Page
**Location:** `shubh-hyundai-dashboard/app/dashboard/sm/page.tsx`

Features:
- Data type selector dropdown
- Dynamic data visualization based on selection
- Metric cards for summary statistics
- Data tables with appropriate columns for each type
- "Average of All Data" view showing aggregated metrics

## Excel File Format Requirements

### RO Billing
Required columns:
- Bill Date / Date
- RO Number / RO No
- Vehicle Number / Vehicle No
- Customer Name / Customer
- Labour Amt / Labour Amount
- Part Amt / Parts Amount
- Total Amount / Total
- Service Advisor / Advisor
- Work Type / Type

### Operations
Required columns:
- **OP/Part Description** (or Description, OP Description, Part Description)
- **Count** (or Quantity)
- **Amount** (or Total)

### Warranty
Required columns:
- **Claim Date** (or Date)
- **Claim Type** (or Type, Warranty Type)
- **Status**
- **Labour** (or Labour Amt, Labour Amount)
- **Part** (or Part Amt, Parts Amount)

### Service Booking
Required columns:
- **Service Advisor** (or Advisor, SA)
- **B.T Date & Time** (or BT Date & Time, BT DateTime, Date & Time)
- **Work Type** (or Type, Service Type)
- **Status**

## Usage Instructions

### For Service Managers

1. **Login**
   - Use your Service Manager credentials
   - Example: `sm.pune@shubh.com` (password: `password`)

2. **Upload Data**
   - Click "Upload Data" button on dashboard
   - Select the appropriate data type card
   - Click to upload or drag-and-drop your Excel file
   - Click "Upload File" button
   - Wait for success confirmation

3. **View Data**
   - Return to dashboard
   - Use the "Select Data to View" dropdown
   - Choose a data type or "Average of All Data"
   - View your uploaded data in the table below

### Available Service Manager Accounts

- **Pune:** `sm.pune@shubh.com` - Amit Sharma
- **Mumbai:** `sm.mumbai@shubh.com` - Priya Desai
- **Nagpur:** `sm.nagpur@shubh.com` - Vikram Singh

All passwords: `password`

## API Endpoints

### Upload File
```
POST /api/service-manager/upload
Content-Type: multipart/form-data

Body:
- file: Excel file
- uploadedBy: User email
- city: City name
- uploadType: ro_billing | operations | warranty | service_booking
```

### Get Dashboard Data
```
GET /api/service-manager/dashboard-data?uploadedBy={email}&city={city}&dataType={type}

Query Parameters:
- uploadedBy: User email (required)
- city: City name (required)
- dataType: ro_billing | operations | warranty | service_booking | average
```

### Get Uploads List
```
GET /api/service-manager/uploads?uploadedBy={email}&city={city}&uploadType={type}

Query Parameters:
- uploadedBy: User email (required)
- city: City name (required)
- uploadType: Filter by type (optional)
```

## Database Schema

### ServiceManagerUpload Collection
```javascript
{
  uploadedBy: String,        // User email
  city: String,              // City name
  uploadType: String,        // Type of upload
  fileName: String,          // Original filename
  uploadDate: Date,          // Upload timestamp
  startDate: String,         // Data start date (optional)
  endDate: String,           // Data end date (optional)
  totalRows: Number,         // Number of rows
  data: Array                // Parsed Excel data
}
```

## Security Features

1. **Data Isolation**
   - All queries filter by `uploadedBy` and `city`
   - Users cannot access other users' data

2. **Input Validation**
   - Email format validation
   - City validation against allowed list
   - File type validation (Excel only)

3. **Middleware Protection**
   - All routes protected by authentication middleware
   - Ownership verification on data access

## Testing

### Test Upload Flow
1. Start MongoDB: Ensure MongoDB is running on `mongodb://127.0.0.1:27017`
2. Start Backend: `cd AutoBackend && npm start`
3. Start Frontend: `cd shubh-hyundai-dashboard && npm run dev`
4. Login as Service Manager
5. Navigate to Upload page
6. Upload test Excel files
7. View data on dashboard

### Test Data Isolation
1. Login as Pune Service Manager
2. Upload data
3. Logout and login as Mumbai Service Manager
4. Verify Pune data is not visible
5. Upload Mumbai data
6. Verify only Mumbai data is visible

## Troubleshooting

### Upload Fails
- Check if backend server is running on port 5000
- Verify MongoDB connection
- Check Excel file format matches requirements
- Check browser console for errors

### Data Not Showing
- Verify you've uploaded data for the selected type
- Check network tab for API errors
- Verify user credentials match uploaded data
- Check MongoDB for data presence

### CORS Errors
- Ensure backend has CORS enabled
- Check if frontend is running on correct port
- Verify API URL in frontend code

## Future Enhancements

1. **JWT Authentication** - Replace simple auth with JWT tokens
2. **File Validation** - Add more robust Excel validation
3. **Data Export** - Allow exporting filtered data
4. **Charts & Graphs** - Add visual analytics
5. **Bulk Upload** - Upload multiple files at once
6. **Data Comparison** - Compare data across time periods
7. **Notifications** - Email notifications on upload
8. **Audit Logs** - Track all data access and modifications
