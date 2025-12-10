import XLSX from 'xlsx';
import path from 'path';

// Create test Excel files for each type
function createTestFiles() {
  
  // RO Billing test data
  const roBillingData = [
    {
      'RO_No': 'RO001',
      'Vehicle_Number': 'MH12AB1234',
      'Customer_Name': 'John Doe',
      'Labour_Cost': 1500,
      'Parts_Cost': 2500,
      'Total_Amount': 4000,
      'Status': 'completed'
    },
    {
      'RO_No': 'RO002',
      'Vehicle_Number': 'MH12CD5678', 
      'Customer_Name': 'Jane Smith',
      'Labour_Cost': 2000,
      'Parts_Cost': 3000,
      'Total_Amount': 5000,
      'Status': 'pending'
    }
  ];
  
  // Warranty test data
  const warrantyData = [
    {
      'RO_No': 'RO001',
      'Warranty_Type': 'Engine',
      'Claim_Amount': 5000,
      'Approval_Status': 'approved',
      'Claim_Date': '2024-01-15'
    },
    {
      'RO_No': 'RO002',
      'Warranty_Type': 'Transmission',
      'Claim_Amount': 8000,
      'Approval_Status': 'pending',
      'Claim_Date': '2024-01-16'
    }
  ];
  
  // Booking List test data
  const bookingData = [
    {
      'Reg_No': 'MH12AB1234',
      'Customer_Name': 'John Doe',
      'Service_Type': 'Regular Service',
      'Booking_Date': '2024-01-15',
      'Service_Date': '2024-01-18'
    },
    {
      'Reg_No': 'MH12CD5678',
      'Customer_Name': 'Jane Smith', 
      'Service_Type': 'Oil Change',
      'Booking_Date': '2024-01-16',
      'Service_Date': '2024-01-19'
    }
  ];
  
  // Operations Part test data
  const operationsData = [
    {
      'OP_Part_Code': 'OP001',
      'Part_Name': 'Engine Oil Filter',
      'Quantity': 10,
      'Unit_Price': 250,
      'Total_Cost': 2500
    },
    {
      'OP_Part_Code': 'OP002',
      'Part_Name': 'Brake Pads',
      'Quantity': 5,
      'Unit_Price': 800,
      'Total_Cost': 4000
    }
  ];
  
  const testFiles = [
    { data: roBillingData, name: 'test-ro-billing.xlsx', type: 'RO Billing' },
    { data: warrantyData, name: 'test-warranty.xlsx', type: 'Warranty' },
    { data: bookingData, name: 'test-booking.xlsx', type: 'Booking List' },
    { data: operationsData, name: 'test-operations.xlsx', type: 'Operations Part' }
  ];
  
  testFiles.forEach(({ data, name, type }) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const filePath = path.join(process.cwd(), name);
    XLSX.writeFile(workbook, filePath);
    
    console.log(`✅ Created ${type} test file: ${name} (${data.length} rows)`);
  });
  
  console.log('\n🎯 Test files created! You can now use them with the HTML test form.');
  console.log('📂 Open test-upload-simple.html in your browser to test uploads.');
}

createTestFiles();
