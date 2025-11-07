# Service Manager Dashboard - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- MongoDB running on `mongodb://127.0.0.1:27017`

### Start the Application

1. **Start Backend**
   ```bash
   cd AutoBackend
   npm start
   ```
   Backend will run on: `http://localhost:5000`

2. **Start Frontend**
   ```bash
   cd shubh-hyundai-dashboard
   npm run dev
   ```
   Frontend will run on: `http://localhost:3000`

### Login Credentials

**Service Managers:**
- Pune: `sm.pune@shubh.com` / `password`
- Mumbai: `sm.mumbai@shubh.com` / `password`
- Nagpur: `sm.nagpur@shubh.com` / `password`

## 📤 Upload Data

1. Login as a Service Manager
2. Click **"Upload Data"** button on dashboard
3. Select one of the four data types:
   - RO Billing
   - Operations
   - Warranty
   - Service Booking List
4. Upload your Excel file
5. Wait for success confirmation

## 📊 View Data

1. Go to Service Manager Dashboard
2. Use the **"Select Data to View"** dropdown
3. Choose:
   - **RO Billing** - View billing records
   - **Operations** - View operations data
   - **Warranty** - View warranty claims
   - **Service Booking List** - View bookings
   - **Average of All Data** - View aggregated metrics
4. Data will display in the table below

## 🔒 Data Privacy

- Each Service Manager sees **ONLY their own data**
- Pune manager cannot see Mumbai or Nagpur data
- Data is filtered by email and city automatically

## 📁 Excel File Format

Your Excel files should have these columns (column names can vary slightly):

### RO Billing
- Bill Date, RO Number, Vehicle Number, Customer Name
- Labour Amt, Part Amt, Total Amount, Service Advisor, Work Type

### Operations
- OP/Part Description, Count, Amount

### Warranty
- Claim Date, Claim Type, Status, Labour, Part

### Service Booking
- Service Advisor, B.T Date & Time, Work Type, Status

## 🎯 Key Features

✅ Upload 4 types of Excel files  
✅ Data isolation per Service Manager  
✅ Select and view specific data types  
✅ View average of all data  
✅ Beautiful, modern UI  
✅ Real-time upload status  
✅ Secure data access  

## 📝 File Structure

### Backend (AutoBackend/)
```
models/ServiceManagerUpload.js      - Database model
controllers/serviceManagerController.js - Business logic
routes/serviceManagerRoutes.js      - API routes
middleware/authMiddleware.js        - Authentication
```

### Frontend (shubh-hyundai-dashboard/)
```
app/dashboard/sm/page.tsx          - Main dashboard
app/dashboard/sm/upload/page.tsx   - Upload page
```

## 🔧 API Endpoints

- `POST /api/service-manager/upload` - Upload file
- `GET /api/service-manager/dashboard-data` - Get dashboard data
- `GET /api/service-manager/uploads` - Get upload list
- `DELETE /api/service-manager/upload/:id` - Delete upload

## ❓ Troubleshooting

**Upload not working?**
- Check if backend is running on port 5000
- Verify MongoDB is connected
- Check Excel file format

**Data not showing?**
- Ensure you've uploaded data first
- Verify correct data type is selected
- Check browser console for errors

**Can't login?**
- Use exact email format: `sm.pune@shubh.com`
- Password is: `password`

## 📞 Support

For detailed documentation, see `SERVICE_MANAGER_IMPLEMENTATION.md`
