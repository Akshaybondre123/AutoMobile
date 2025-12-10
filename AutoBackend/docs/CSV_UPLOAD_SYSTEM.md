# CSV Upload System Documentation

## Overview
The CSV Upload System provides a robust, intelligent file processing solution that automatically handles different upload scenarios based on unique key detection. It supports 4 different file types with smart case-based processing.

## Collections

### 1. UploadedFileMetaDetails
Stores metadata about every uploaded CSV file.

**Fields:**
- `_id` - MongoDB ObjectId (auto-generated)
- `db_file_name` - Internal filename stored on server
- `uploaded_file_name` - Original filename from user
- `rows_count` - Number of data rows processed
- `uploaded_by` - User identifier who uploaded the file
- `uploaded_at` - Timestamp of upload (auto-generated)
- `org_id` - Organization ObjectId
- `showroom_id` - Showroom ObjectId
- `file_type` - Enum: ["ro_billing", "warranty", "booking_list", "operations_part"]
- `file_size` - File size in bytes
- `processing_status` - Enum: ["pending", "processing", "completed", "failed"]
- `error_message` - Error details if processing failed

### 2. ROBillingData
Stores RO Billing CSV data with RO_No as unique key per showroom.

**Unique Key:** `RO_No` (unique within each showroom)

**Key Fields:**
- `uploaded_file_id` - FK to UploadedFileMetaDetails
- `RO_No` - Required unique identifier
- `showroom_id` - Showroom ObjectId
- `bill_date`, `service_advisor`, `labour_amt`, `part_amt`, `total_amount`
- `vehicle_number`, `customer_name`

### 3. WarrantyData
Stores Warranty CSV data with RO_No as unique key per showroom.

**Unique Key:** `RO_No` (unique within each showroom)

**Key Fields:**
- `uploaded_file_id` - FK to UploadedFileMetaDetails
- `RO_No` - Required unique identifier
- `showroom_id` - Showroom ObjectId
- `claim_date`, `claim_type`, `claim_status`
- `labour_amount`, `part_amount`, `claim_number`

### 4. BookingListData
Stores Booking List CSV data with Reg_No as unique key per showroom.

**Unique Key:** `Reg_No` (unique within each showroom)

**Key Fields:**
- `uploaded_file_id` - FK to UploadedFileMetaDetails
- `Reg_No` - Required unique identifier (Registration Number)
- `showroom_id` - Showroom ObjectId
- `service_advisor`, `bt_date_time`, `booking_number`

### 5. OperationsPartData
Stores Operations/Part Code CSV data with OP_Part_Code as unique key per showroom.

**Unique Key:** `OP_Part_Code` (unique within each showroom)

**Key Fields:**
- `uploaded_file_id` - FK to UploadedFileMetaDetails
- `OP_Part_Code` - Required unique identifier
- `showroom_id` - Showroom ObjectId
- `op_part_description`, `labour_time`, `part_cost`

## Upload Logic - 3 Cases

The system automatically detects which case applies based on unique key analysis:

### ⭐ CASE 1: Brand New File
**Condition:** No matching unique keys found in database

**Action:**
- Insert ALL CSV rows as new records
- Set `uploaded_file_id` to new file ID
- All rows get fresh `created_at` timestamps

**Example:** First-time upload of RO billing data

### ⭐ CASE 2: Exact Reupload
**Condition:** ALL unique keys in CSV already exist in database

**Action:**
- Update existing records with new CSV data
- Replace all column values with CSV values
- Update `uploaded_file_id` to new file ID
- Update `updated_at` timestamps
- NO new records created

**Example:** Re-uploading corrected version of same RO numbers

### ⭐ CASE 3: Mixed File
**Condition:** Some unique keys exist, some are new

**Action:**
- **Existing Keys:** Update records with new data
- **New Keys:** Insert as new records
- Both operations use new `uploaded_file_id`

**Example:** Monthly upload with some repeat ROs and new ROs

## API Endpoints

### POST /api/csv/upload
Upload and process CSV file with automatic case detection.

**Request:**
```
Content-Type: multipart/form-data

Fields:
- csvFile: CSV file (max 50MB)
- file_type: "ro_billing" | "warranty" | "booking_list" | "operations_part"
- uploaded_by: string
- org_id: ObjectId string
- showroom_id: ObjectId string
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 150 rows using CASE_3_MIXED",
  "data": {
    "fileId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "uploadCase": "CASE_3_MIXED",
    "insertedCount": 75,
    "updatedCount": 75,
    "totalProcessed": 150,
    "fileName": "ro_billing_march.csv",
    "fileType": "ro_billing",
    "rowsCount": 150
  }
}
```

### GET /api/csv/history/:showroomId
Get upload history for a showroom.

**Query Parameters:**
- `fileType` (optional): Filter by file type
- `limit` (optional): Number of records (default: 50)

### GET /api/csv/stats/:showroomId
Get upload statistics for a showroom.

**Query Parameters:**
- `fileType` (optional): Filter by file type

### GET /api/csv/file/:fileId
Get detailed information about a specific uploaded file.

### DELETE /api/csv/file/:fileId
Delete an uploaded file and optionally its data.

**Query Parameters:**
- `deleteData`: "true" to delete associated data records

## CSV File Format Requirements

### Required Columns by File Type

**RO Billing:**
- `RO_No` (required, unique per showroom)
- Other columns: `bill_date`, `service_advisor`, `labour_amt`, etc.

**Warranty:**
- `RO_No` (required, unique per showroom)
- Other columns: `claim_date`, `claim_type`, `labour_amount`, etc.

**Booking List:**
- `Reg_No` (required, unique per showroom)
- Other columns: `service_advisor`, `bt_date_time`, etc.

**Operations/Part:**
- `OP_Part_Code` (required, unique per showroom)
- Other columns: `op_part_description`, `labour_time`, etc.

### CSV Format Rules
1. First row must contain column headers
2. Comma-separated values
3. Empty rows are ignored
4. Quoted values are supported
5. Maximum file size: 50MB

## Database Indexes

### Performance Indexes
Each collection has optimized indexes:

```javascript
// Unique constraint indexes
{ RO_No: 1, showroom_id: 1 } // ROBillingData, WarrantyData
{ Reg_No: 1, showroom_id: 1 } // BookingListData  
{ OP_Part_Code: 1, showroom_id: 1 } // OperationsPartData

// Query performance indexes
{ uploaded_file_id: 1 }
{ showroom_id: 1, created_at: -1 }
{ service_advisor: 1, showroom_id: 1 }
```

## Error Handling

### File Validation Errors
- Invalid file type (not CSV)
- File too large (>50MB)
- Empty file
- Missing required columns
- Invalid metadata

### Processing Errors
- Database connection issues
- Duplicate key violations
- Invalid ObjectId formats
- Transaction failures

### Error Response Format
```json
{
  "success": false,
  "error": "Missing required columns: RO_No",
  "fileId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

## Usage Examples

### Frontend Upload Example
```javascript
const formData = new FormData();
formData.append('csvFile', file);
formData.append('file_type', 'ro_billing');
formData.append('uploaded_by', 'user@example.com');
formData.append('org_id', '64f8a1b2c3d4e5f6a7b8c9d0');
formData.append('showroom_id', '64f8a1b2c3d4e5f6a7b8c9d1');

const response = await fetch('/api/csv/upload', {
  method: 'POST',
  body: formData
});
```

### Console Output Example
```
🎯 Starting CSV upload for ro_billing
   File: march_ro_billing.csv
   Rows: 150
   Showroom: 64f8a1b2c3d4e5f6a7b8c9d1

📊 Analysis for RO Billing:
   Total CSV rows: 150
   Unique keys in CSV: 150
   Existing keys: 75
   New keys: 75

🔀 CASE 3: Mixed processing - updating existing and inserting new
✅ Processing completed:
   Inserted: 75 rows
   Updated: 75 rows
🎉 CSV upload completed successfully!
```

## Benefits

### ✅ Intelligent Processing
- Automatic case detection
- No manual intervention required
- Handles all upload scenarios

### ✅ Data Integrity
- Unique key constraints prevent duplicates
- Transaction-based processing
- Rollback on errors

### ✅ Performance Optimized
- Efficient bulk operations
- Optimized database indexes
- Minimal API calls

### ✅ Comprehensive Tracking
- Complete upload history
- Detailed statistics
- Error logging and recovery

### ✅ Scalable Architecture
- Supports unlimited file types
- Handles large files (50MB)
- Database-driven configuration
