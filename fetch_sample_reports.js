import fs from 'fs';
import path from 'path';

// Fetch sample agent daily reports and save to JSON file
async function fetchSampleReports() {
  try {
    console.log('Fetching latest 10 agent daily reports...');
    
    // Use the deployed Railway URL
    const response = await fetch('https://eternalgyadmindashboard-production.up.railway.app/api/agent-daily-reports/latest?limit=10');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Save to sample_report.json in current directory
    const filePath = path.join(process.cwd(), 'sample_report.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Sample reports saved to: ${filePath}`);
    console.log(`📊 Found ${data.reports?.length || 0} reports`);
    
    if (data.table_info) {
      console.log(`📋 Table columns (${data.table_info.columns.length}):`);
      data.table_info.columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    }
    
    if (data.reports && data.reports.length > 0) {
      console.log(`🔍 Sample report fields:`, Object.keys(data.reports[0]));
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching sample reports:', error.message);
    
    // Save error info to file for debugging
    const errorInfo = {
      error: error.message,
      timestamp: new Date().toISOString(),
      note: 'Check if the API endpoint exists and the database table is available'
    };
    
    const errorPath = path.join(process.cwd(), 'sample_report_error.json');
    fs.writeFileSync(errorPath, JSON.stringify(errorInfo, null, 2));
    console.log(`💾 Error details saved to: ${errorPath}`);
  }
}

// Run the fetch
fetchSampleReports();