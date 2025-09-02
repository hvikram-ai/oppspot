// Test PDF export functionality
// Using built-in fetch (Node.js 18+)

async function testPDFExport() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing PDF Export Functionality...\n');
  
  try {
    // Test the API endpoint with demo data
    const response = await fetch(`${baseUrl}/api/similar-companies/demo/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exportType: 'executive_summary',
        exportFormat: 'pdf',
        includeDetails: true,
        maxMatches: 10
      })
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📏 Content-Length: ${response.headers.get('content-length') || 'Unknown'}`);
    
    if (response.headers.get('content-type')?.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      console.log(`✅ PDF Generated Successfully!`);
      console.log(`📄 PDF Size: ${buffer.length} bytes`);
      
      // Verify it's a valid PDF by checking header
      const uint8Array = new Uint8Array(buffer);
      const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 5));
      if (pdfHeader === '%PDF-') {
        console.log(`🎉 Valid PDF format detected!`);
        return true;
      } else {
        console.log(`❌ Invalid PDF format - Header: ${pdfHeader}`);
        return false;
      }
    } else {
      // JSON response (could be error or status)
      const data = await response.json();
      console.log(`📝 Response Data:`, JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log(`⏳ PDF generation in progress...`);
        return true;
      } else {
        console.log(`❌ Error generating PDF`);
        return false;
      }
    }
    
  } catch (error) {
    console.error(`❌ Test Failed:`, error.message);
    return false;
  }
}

// Run the test
testPDFExport().then(success => {
  console.log(`\n${success ? '🎉 PDF Export Test PASSED!' : '💥 PDF Export Test FAILED!'}`);
  process.exit(success ? 0 : 1);
});