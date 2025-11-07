# General Manager Dashboard Implementation

## Overview
The GM Dashboard provides a comprehensive view of all Service Manager data across all cities with filtering capabilities.

---

## Features

### 1. **Default View - All Cities**
- Shows aggregated data from all Service Managers across all cities
- Displays overall statistics and performance metrics
- City-wise breakdown cards showing individual city performance

### 2. **City Filter**
- Dropdown to select specific city
- "All Cities" option for overall statistics
- Clear filter button to return to all cities view
- Dynamic data updates based on selection

### 3. **Comprehensive Metrics**
- **RO Billing:** Total records and revenue
- **Operations:** Total records and amount
- **Warranty:** Total claims and claim amount
- **Service Bookings:** Total bookings count
- **Active Cities:** Number of service centers

### 4. **City-wise Breakdown**
- Individual cards for each city
- Quick metrics: RO Billing, Operations, Warranty, Bookings
- "View Details" button to filter by specific city
- Color-coded metrics for easy visualization

---

## Backend Implementation

### New Controller Function
**File:** `AutoBackend/controllers/serviceManagerController.js`

```javascript
export const getGMDashboardData = async (req, res) => {
  // Accepts: city (optional), dataType (optional)
  // Returns: Aggregated data for all cities or specific city
}
```

**Features:**
- No user-specific authentication (GM sees all data)
- Filters by city if specified, otherwise shows all
- Aggregates data by type (RO Billing, Operations, Warranty, Service Booking)
- Returns city-wise breakdown for comparison

### New Route
**File:** `AutoBackend/routes/serviceManagerRoutes.js`

```javascript
router.get("/gm-dashboard-data", getGMDashboardData);
```

**Endpoint:** `GET /api/service-manager/gm-dashboard-data`

**Query Parameters:**
- `city` (optional): Filter by specific city or "all" for all cities
- `dataType` (optional): Data type to fetch (default: "average")

---

## Frontend Implementation

### GM Dashboard Page
**File:** `shubh-hyundai-dashboard/app/dashboard/gm/page.tsx`

**Components:**
1. **Header** - Title and date
2. **City Filter Card** - Dropdown to select city
3. **Summary Header** - Shows current filter status
4. **Metrics Grid** - 8 metric cards showing key statistics
5. **City Breakdown** - Expandable cards for each city (only when "All Cities" selected)

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  General Manager Dashboard                          │
│  Overview of all Service Centers                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🔍 City Filter                                     │
│  [Dropdown: All Cities / Pune / Mumbai / Nagpur]   │
│  [Clear Filter Button]                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  All Cities Overview                                │
│  Aggregated data from 3 cities                      │
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ RO Bills │ │ Revenue  │ │Operations│ │ Ops Amt  │
│   150    │ │ ₹12.5L   │ │    85    │ │  ₹8.2L   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Warranty │ │ Warranty │ │ Bookings │ │  Cities  │
│    45    │ │  ₹5.3L   │ │    120   │ │     3    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌─────────────────────────────────────────────────────┐
│  City-wise Breakdown                                │
│                                                     │
│  🏢 Pune                      [View Details]        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ RO  │ │ Ops │ │ War │ │ Book│                  │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                                     │
│  🏢 Mumbai                    [View Details]        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ RO  │ │ Ops │ │ War │ │ Book│                  │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                                     │
│  🏢 Nagpur                    [View Details]        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ RO  │ │ Ops │ │ War │ │ Book│                  │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## Usage Instructions

### For General Managers

1. **Login**
   - Use GM credentials
   - Example: `gm@shubh.com` (password: `password`)

2. **View All Cities (Default)**
   - Dashboard loads with "All Cities" selected
   - See aggregated metrics from all service centers
   - View city-wise breakdown cards

3. **Filter by City**
   - Click city filter dropdown
   - Select specific city (Pune, Mumbai, Nagpur)
   - Dashboard updates to show only that city's data
   - City breakdown section disappears (showing specific city data)

4. **View City Details**
   - In "All Cities" view, click "View Details" on any city card
   - Dashboard filters to show that city's data
   - Click "Clear Filter" to return to all cities view

5. **Compare Cities**
   - Use "All Cities" view
   - Scroll to city-wise breakdown
   - Compare metrics across different cities
   - Identify top/bottom performing centers

---

## API Response Structure

### All Cities Response
```json
{
  "dataType": "average",
  "cities": ["Pune", "Mumbai", "Nagpur"],
  "summary": {
    "ro_billing": {
      "count": 150,
      "totalRevenue": 1250000
    },
    "operations": {
      "count": 85,
      "totalAmount": 820000
    },
    "warranty": {
      "count": 45,
      "totalClaims": 530000
    },
    "service_booking": {
      "count": 120,
      "totalBookings": 120
    }
  },
  "citiesData": {
    "Pune": {
      "ro_billing": [...],
      "operations": [...],
      "warranty": [...],
      "service_booking": [...]
    },
    "Mumbai": {...},
    "Nagpur": {...}
  }
}
```

### Specific City Response
```json
{
  "dataType": "average",
  "cities": ["Pune"],
  "summary": {
    "ro_billing": {
      "count": 50,
      "totalRevenue": 450000
    },
    ...
  },
  "citiesData": {
    "Pune": {...}
  }
}
```

---

## Key Metrics Explained

### RO Billing
- **Records:** Total number of RO billing entries
- **Revenue:** Sum of all billing amounts

### Operations
- **Records:** Total number of operation entries
- **Amount:** Sum of all operation amounts

### Warranty
- **Claims:** Total number of warranty claims
- **Amount:** Sum of labour + parts for all claims

### Service Bookings
- **Bookings:** Total number of service bookings

### Active Cities
- **Count:** Number of cities with uploaded data

---

## Access Control

**GM Dashboard:**
- Only accessible to users with role: `general_manager`
- No city restriction (can see all cities)
- No user-specific filtering

**Service Manager Dashboard:**
- Only accessible to users with role: `service_manager`
- City-specific (can only see their own city)
- User-specific filtering (can only see their own uploads)

---

## Testing

### Test GM Dashboard
1. Login as GM: `gm@shubh.com`
2. Go to: `http://localhost:3000/dashboard/gm`
3. Should see all cities data by default
4. Should see city-wise breakdown cards

### Test City Filter
1. Click city filter dropdown
2. Select "Pune"
3. Dashboard should update to show only Pune data
4. City breakdown section should disappear
5. Click "Clear Filter"
6. Should return to all cities view

### Test City Details Button
1. In all cities view
2. Click "View Details" on any city card
3. Dashboard should filter to that city
4. Metrics should update accordingly

---

## Benefits

✅ **Comprehensive Overview** - See all cities at a glance  
✅ **Easy Comparison** - Compare city performance side-by-side  
✅ **Flexible Filtering** - View all or specific city data  
✅ **Real-time Data** - Always shows latest uploaded data  
✅ **Visual Metrics** - Color-coded cards for easy understanding  
✅ **Quick Navigation** - One-click city filtering  
✅ **Aggregated Statistics** - Overall performance metrics  
✅ **City Breakdown** - Individual city performance cards  

---

## Future Enhancements

1. **Date Range Filter** - Filter data by date range
2. **Export Reports** - Download city-wise reports
3. **Trend Analysis** - Show performance trends over time
4. **Comparison Charts** - Visual charts comparing cities
5. **Performance Rankings** - Rank cities by performance
6. **Email Reports** - Automated email summaries
7. **Target vs Actual** - Compare against targets
8. **Manager Performance** - Individual SM performance metrics

---

## Troubleshooting

### No Data Showing
- Ensure Service Managers have uploaded data
- Check if backend server is running
- Verify MongoDB connection

### City Filter Not Working
- Refresh the page
- Check browser console for errors
- Verify API endpoint is accessible

### Access Denied
- Ensure logged in as General Manager
- Check user role in auth context
- Verify GM account exists in database

---

## Summary

The GM Dashboard provides a powerful tool for General Managers to:
- Monitor overall performance across all service centers
- Compare city-wise statistics
- Filter and drill down into specific city data
- Make data-driven decisions based on aggregated metrics

All data is automatically aggregated from Service Manager uploads, ensuring real-time accuracy and consistency.
