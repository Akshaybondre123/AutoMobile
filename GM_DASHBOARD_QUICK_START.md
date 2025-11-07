# GM Dashboard - Quick Start Guide

## 🚀 What's New

### General Manager Dashboard
A new dashboard that shows **all Service Manager data across all cities** with filtering capabilities.

---

## ✨ Key Features

### 1. **Default View - All Cities**
- Shows aggregated data from Pune, Mumbai, Nagpur
- Overall statistics across all service centers
- City-wise breakdown for comparison

### 2. **City Filter**
- Dropdown to select specific city
- "All Cities" option for overall view
- One-click filtering

### 3. **8 Key Metrics**
- RO Billing Records & Revenue
- Operations Records & Amount
- Warranty Claims & Amount
- Service Bookings & Active Cities

### 4. **City-wise Breakdown**
- Individual cards for each city
- Quick metrics per city
- "View Details" button for deep dive

---

## 🎯 How to Use

### View All Cities (Default)
1. Login as GM: `gm@shubh.com` / `password`
2. Go to: `http://localhost:3000/dashboard/gm`
3. See all cities data automatically

### Filter by Specific City
1. Click "City Filter" dropdown
2. Select city (Pune, Mumbai, or Nagpur)
3. Dashboard updates to show only that city
4. Click "Clear Filter" to return to all cities

### Compare Cities
1. Stay in "All Cities" view
2. Scroll to "City-wise Breakdown"
3. Compare metrics across cities
4. Click "View Details" on any city

---

## 📊 Dashboard Layout

```
┌─────────────────────────────────────┐
│  General Manager Dashboard          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔍 City Filter                     │
│  [All Cities ▼]  [Clear Filter]    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  All Cities Overview                │
│  Aggregated data from 3 cities      │
└─────────────────────────────────────┘

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Metric │ │ Metric │ │ Metric │ │ Metric │
└────────┘ └────────┘ └────────┘ └────────┘

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Metric │ │ Metric │ │ Metric │ │ Metric │
└────────┘ └────────┘ └────────┘ └────────┘

┌─────────────────────────────────────┐
│  City-wise Breakdown                │
│                                     │
│  🏢 Pune        [View Details]      │
│  📊 Quick metrics...                │
│                                     │
│  🏢 Mumbai      [View Details]      │
│  📊 Quick metrics...                │
│                                     │
│  🏢 Nagpur      [View Details]      │
│  📊 Quick metrics...                │
└─────────────────────────────────────┘
```

---

## 🔧 Backend Changes

### New API Endpoint
```
GET /api/service-manager/gm-dashboard-data
```

**Query Parameters:**
- `city`: "all" or specific city name
- `dataType`: "average" (default)

**Example:**
```
http://localhost:5000/api/service-manager/gm-dashboard-data?city=all&dataType=average
http://localhost:5000/api/service-manager/gm-dashboard-data?city=Pune&dataType=average
```

### Files Modified
- `AutoBackend/controllers/serviceManagerController.js` - Added `getGMDashboardData`
- `AutoBackend/routes/serviceManagerRoutes.js` - Added GM route

### Files Created
- `shubh-hyundai-dashboard/app/dashboard/gm/page.tsx` - GM Dashboard page

---

## 📈 Metrics Explained

| Metric | Description |
|--------|-------------|
| **RO Billing Records** | Total number of RO billing entries |
| **Total Revenue** | Sum of all RO billing amounts |
| **Operations Records** | Total number of operation entries |
| **Operations Amount** | Sum of all operation amounts |
| **Warranty Claims** | Total number of warranty claims |
| **Warranty Amount** | Sum of labour + parts for all claims |
| **Service Bookings** | Total number of service bookings |
| **Active Cities** | Number of cities with data |

---

## 🎨 Visual Features

### Color-Coded Metrics
- 🔵 **Blue** - Records/Counts
- 💚 **Emerald** - Revenue/Amounts
- 🟢 **Green** - Operations
- 🟣 **Purple** - Operations Amount
- 🟠 **Orange** - Warranty
- 🔴 **Red** - Warranty Amount

### Interactive Elements
- Hover effects on cards
- Dropdown city filter
- Clear filter button
- View details buttons
- Smooth transitions

---

## ✅ Testing Checklist

- [ ] Login as GM
- [ ] Dashboard loads with all cities
- [ ] See 8 metric cards
- [ ] See city-wise breakdown
- [ ] Filter by Pune - data updates
- [ ] Filter by Mumbai - data updates
- [ ] Filter by Nagpur - data updates
- [ ] Clear filter - returns to all cities
- [ ] Click "View Details" on city card
- [ ] Dashboard filters to that city

---

## 🔐 Access Control

**Who Can Access:**
- ✅ General Manager (`gm@shubh.com`)

**Who Cannot Access:**
- ❌ Service Managers (they have their own dashboard)
- ❌ Other roles

**Data Visibility:**
- GM sees **ALL** data from **ALL** cities
- No restrictions on data access
- Can filter by city but sees all by default

---

## 🚦 Quick Start

1. **Start Backend**
   ```bash
   cd AutoBackend
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd shubh-hyundai-dashboard
   npm run dev
   ```

3. **Login as GM**
   - Email: `gm@shubh.com`
   - Password: `password`

4. **Navigate to GM Dashboard**
   - URL: `http://localhost:3000/dashboard/gm`

5. **Explore Features**
   - View all cities data
   - Use city filter
   - Compare city performance

---

## 💡 Tips

1. **Default View** - Always shows all cities for quick overview
2. **City Filter** - Use dropdown for focused analysis
3. **City Cards** - Click "View Details" for quick filtering
4. **Clear Filter** - Return to all cities view anytime
5. **Metrics** - Hover over cards for smooth animations

---

## 🎯 Use Cases

### Daily Overview
- Login and see all cities performance
- Quick glance at key metrics
- Identify any issues

### City Comparison
- Use city-wise breakdown
- Compare revenue across cities
- Spot top/bottom performers

### Detailed Analysis
- Filter by specific city
- Deep dive into city metrics
- Make data-driven decisions

### Performance Monitoring
- Track overall statistics
- Monitor active cities
- Ensure all centers are performing

---

## 📞 Support

For issues or questions:
1. Check backend console logs
2. Verify MongoDB connection
3. Ensure Service Managers have uploaded data
4. Check browser console for errors

---

## 🎉 Summary

The GM Dashboard provides:
✅ **All cities overview** by default  
✅ **City filter** for focused analysis  
✅ **8 key metrics** in beautiful cards  
✅ **City-wise breakdown** for comparison  
✅ **Real-time data** from Service Managers  
✅ **Easy navigation** with one-click filtering  

Perfect for General Managers to monitor and manage all service centers from one place! 🚀
