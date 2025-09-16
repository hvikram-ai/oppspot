/* eslint-disable @typescript-eslint/no-require-imports */
// Simple test to verify PDF generation works
const React = require('react');
const { renderToBuffer, Document, Page, Text, View } = require('@react-pdf/renderer');

// Create a simple test PDF
const TestPDF = () => (
  React.createElement(Document, {}, 
    React.createElement(Page, { size: 'A4' },
      React.createElement(View, { style: { margin: 30 } },
        React.createElement(Text, {}, 'Test PDF Generation - oppSpot')
      )
    )
  )
);

async function testPDFGeneration() {
  try {
    console.log('Testing PDF generation...');
    const pdfBuffer = await renderToBuffer(React.createElement(TestPDF));
    console.log('✅ PDF generation successful!');
    console.log('Buffer size:', pdfBuffer.length, 'bytes');
    return true;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testPDFGeneration();
}

module.exports = { testPDFGeneration };