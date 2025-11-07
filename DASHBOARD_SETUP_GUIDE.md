# Service Dashboard - Complete Setup Guide

## Overview
Modern, professional service dashboard with Excel file upload, automatic data processing, and comprehensive analytics.

## Features Implemented

### ✅ Dashboard Features
- **File Upload System**: Upload Excel files (.xlsx, .xls) for different data types
- **Automatic Averages**: Displays average of all records by default
- **Work Type Breakdown**: Right-side panel showing service type distribution with pie chart
- **Four Data Tables**:
  1. **RO Billing Table**: Bill Date, Service Advisor, Labour Amt, Part Amt, Work Type
  2. **Booking List Table**: Service Advisor, B.T Date & Time, Work Type, Status
  3. **Warranty Claim List Table**: Claim Date, Claim Type, Status, Labour, Part
  4. **Operation Wise Analysis Report**: OP/Part Desc., Count, Amt
- **Database Reset**: Clear all uploaded data with confirmation dialog
- **Refresh Data**: Manual refresh button to reload all data
- **Modern UI**: Gradient backgrounds, smooth animations, responsive design

### ✅ Backend Features
- **Excel File Processing**: Automatic parsing of Excel files using xlsx library
- **Data Type Support**: ro_billing, service_booking, warranty, operations
- **MongoDB Storage**: Persistent data storage with user/city isolation
- **RESTful API**: Complete CRUD operations
- **Database Reset Endpoint**: Delete all user data

## Project Structure

```
Automobile/
├── AutoBackend/                    # Backend (Node.js + Express + MongoDB)
│   ├── controllers/
│   │   └── serviceManagerController.js
│   ├── models/
│   │   └── ServiceManagerUpload.js
│   ├── routes/
│   │   └── serviceManagerRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── uploads/                    # Uploaded Excel files
│   ├── server.js
│   └── package.json
│
└── shubh-hyundai-dashboard/       # Frontend (Next.js + React + TypeScript)
    ├── app/
    │   ├── dashboard/
    │   │   └── page.tsx           # Main dashboard page
    │   └── layout.tsx
    ├── components/
    │   └── ui/                     # Shadcn UI components
    ├── lib/
    │   └── auth-context.tsx
    └── package.json
```

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd AutoBackend

# Install dependencies (if not already installed)
npm install

# Create .env file with MongoDB connection
# File should contain:
# MONGO_URI=mongodb://localhost:27017/automobile_db
# or your MongoDB Atlas connection string

# Start the backend server
npm start
```

**Backend will run on:** `http://localhost:5000`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd shubh-hyundai-dashboard

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

**Frontend will run on:** `http://localhost:3000`

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod --dbpath /path/to/data/directory
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env` file in AutoBackend

## Usage Guide

### 1. Login
- Navigate to `http://localhost:3000/login`
- Use one of these test accounts:
  - **Service Manager (Pune)**: `sm.pune@shubh.com` / `password`
  - **Service Manager (Mumbai)**: `sm.mumbai@shubh.com` / `password`
  - **Service Manager (Nagpur)**: `sm.nagpur@shubh.com` / `password`

### 2. Upload Excel Files

**File Format Requirements:**

#### RO Billing Excel Columns:
- Bill Date
- Service Advisor
- Labour Amt
- Part Amt
- Work Type

#### Booking List Excel Columns:
- Service Advisor
- B.T Date & Time
- Work Type
- Status

#### Warranty Claim Excel Columns:
- Claim Date
- Claim Type
- Status
- Labour
- Part

#### Operation Wise Excel Columns:
- OP/Part Desc. (or OP/Part Desc or Description)
- Count
- Amount (or Amt)

### 3. Dashboard Navigation

**Overview Tab:**
- View average labour and parts amounts
- See total services count
- Summary cards for all data types

**Data Tabs:**
- RO Billing: View all billing records
- Booking List: View all service bookings
- Warranty Claims: View all warranty claims
- Operation Wise: View operation analysis

**Work Type Breakdown (Right Panel):**
- Pie chart visualization
- Service type distribution
- Total count

### 4. Database Management

**Refresh Data:**
- Click "Refresh" button to reload all data from server

**Reset Database:**
- Click "Reset Database" button
- Confirm in dialog
- All your uploaded data will be deleted

## API Endpoints

### Upload File
```
POST /api/service-manager/upload
Body: FormData with file, uploadedBy, city, uploadType
```

### Get Dashboard Data
```
GET /api/service-manager/dashboard-data
Query: uploadedBy, city, dataType
```

### Reset Database
```
DELETE /api/service-manager/reset-database
Query: uploadedBy, city
```

### Get All Uploads
```
GET /api/service-manager/uploads
Query: uploadedBy, city, uploadType (optional)
```

### Delete Single Upload
```
DELETE /api/service-manager/upload/:uploadId
Query: uploadedBy, city
```

## Data Flow

1. **Upload**: User selects Excel file and data type → Frontend sends to backend
2. **Processing**: Backend parses Excel → Extracts columns → Stores in MongoDB
3. **Retrieval**: Frontend fetches data → Calculates averages → Displays in tables
4. **Work Type**: Frontend analyzes workType field → Generates distribution → Shows in pie chart

## Excel Column Mapping

The backend automatically maps various column name variations:

```javascript
// RO Billing
"Bill Date" or "Date" → billDate
"Service Advisor" or "Advisor" → serviceAdvisor
"Labour Amt" or "Labour Amount" → labourAmt
"Part Amt" or "Parts Amount" → partAmt
"Work Type" or "Type" → workType

// Operations
"OP/Part Desc." or "OP/Part Desc" or "Description" → opPartDescription
"Count" or "Quantity" → count
"Amount" or "Total" → amount

// Warranty
"Claim Date" or "Date" → claimDate
"Claim Type" or "Type" or "Warranty Type" → claimType
"Labour" or "Labour Amt" → labour
"Part" or "Part Amt" → part

// Booking
"Service Advisor" or "Advisor" or "SA" → serviceAdvisor
"B.T Date & Time" or "BT Date & Time" or "Date & Time" → btDateTime
"Work Type" or "Type" or "Service Type" → workType
```

## Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running. Check MONGO_URI in .env file.

**File Upload Error:**
```
Error: Only .xlsx or .xls files are allowed
```
**Solution:** Ensure you're uploading Excel files only.

### Frontend Issues

**Cannot connect to backend:**
```
Error: Failed to fetch dashboard data
```
**Solution:** Ensure backend is running on port 5000. Check API_BASE_URL in dashboard page.

**No data showing:**
- Upload Excel files first
- Check that columns match expected format
- Click "Refresh" button

### Excel File Issues

**No data extracted:**
- Ensure first row contains column headers
- Check column names match expected format (see mapping above)
- Ensure data starts from row 2

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI)
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose
- **File Upload**: Multer
- **Excel Processing**: xlsx

## Security Notes

- Current implementation uses simple email/city-based authentication
- In production, implement JWT tokens or session-based auth
- Add input validation and sanitization
- Implement rate limiting
- Use HTTPS in production
- Add CORS configuration for production domains

## Performance Optimization

- Data is fetched in parallel using Promise.all()
- Tables only render when tab is active
- Pie chart uses memoization
- File uploads are processed asynchronously

## Future Enhancements

- [ ] Add date range filters
- [ ] Export data to Excel/PDF
- [ ] Advanced analytics and charts
- [ ] Real-time data updates with WebSockets
- [ ] User management and roles
- [ ] Audit logs
- [ ] Email notifications
- [ ] Mobile app

## Support

For issues or questions:
1. Check this guide first
2. Review console logs (F12 in browser)
3. Check backend terminal for errors
4. Verify MongoDB connection

## License

Proprietary - Shubh Hyundai Dashboard

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0
