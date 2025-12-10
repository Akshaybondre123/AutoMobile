import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// Create a simple test Excel file for RO Billing
function createTestExcelFile() {
  const testData = [
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
    },
    {
      'RO_No': 'RO003',
      'Vehicle_Number': 'MH12EF9012',
      'Customer_Name': 'Bob Johnson',
      'Labour_Cost': 1000,
      'Parts_Cost': 1500,
      'Total_Amount': 2500,
      'Status': 'in-progress'
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(testData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RO Billing');
  
  // Write to file
  const filePath = path.join(process.cwd(), 'test-ro-billing.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log(`✅ Test Excel file created: ${filePath}`);
  console.log(`📊 Contains ${testData.length} rows of RO Billing data`);
  
  return filePath;
}

// Test the upload API
async function testUploadAPI() {
  try {
    // Create test file
    const filePath = createTestExcelFile();
    
    // Prepare form data
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('excelFile', fs.createReadStream(filePath));
    formData.append('file_type', 'ro_billing');
    formData.append('uploaded_by', 'test@example.com');
    formData.append('org_id', '64f8a1b2c3d4e5f6a7b8c9d0');
    formData.append('showroom_id', '64f8a1b2c3d4e5f6a7b8c9d1');
    
    console.log('\n🚀 Testing upload API...');
    
    // Make request to upload API
    const response = await fetch('http://localhost:5000/api/excel/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    console.log('\n📋 Upload Response:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Clean up test file
    fs.unlinkSync(filePath);
    console.log('\n🗑️ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

// Run the test
testUploadAPI();
