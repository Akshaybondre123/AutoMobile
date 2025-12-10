import fetch from 'node-fetch';

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing Dashboard API...');
    
    // Test with the Pune user email for service booking
    const testEmail = 'sm.pune@shubh.com';
    const testUrl = `http://localhost:5000/api/service-manager/dashboard-data?uploadedBy=${testEmail}&city=Pune&dataType=service_booking`;
    
    console.log(`🔗 Testing URL: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ API working correctly!');
      console.log(`📈 Summary: ${data.summary.totalRecords} total records`);
      console.log(`📁 Uploads: ${data.uploads.length} file uploads`);
    } else {
      console.log('❌ API returned error:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardAPI();
