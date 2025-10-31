/**
 * Test ESG PDF Generation
 * Tests the PDF report generation with sample data
 */

import { renderToBuffer } from '@react-pdf/renderer';
import { ESGReportDocument } from '@/lib/esg/pdf-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { ESGScore, ESGMetric } from '@/types/esg';

async function testPDFGeneration() {
  console.log('🧪 Testing ESG PDF Generation\n');
  console.log('═'.repeat(60));

  const companyName = 'ITONICS Innovation GmbH';
  const periodYear = 2024;

  // Sample scores data
  const scores: ESGScore[] = [
    // Environmental - Category
    {
      id: 'score-env',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: null,
      score: 52.3,
      level: 'par',
      metrics_count: 4,
      metrics_with_data: 4,
      details: {
        metric_count: 4,
        metrics_with_benchmarks: 4
      },
      computed_at: new Date().toISOString()
    },
    // Environmental - Subcategories
    {
      id: 'score-env-climate',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      score: 48.5,
      level: 'par',
      metrics_count: 2,
      metrics_with_data: 2,
      details: {},
      computed_at: new Date().toISOString()
    },
    {
      id: 'score-env-energy',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Energy',
      score: 56.1,
      level: 'par',
      metrics_count: 2,
      metrics_with_data: 2,
      details: {},
      computed_at: new Date().toISOString()
    },

    // Social - Category
    {
      id: 'score-soc',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: null,
      score: 48.1,
      level: 'par',
      metrics_count: 4,
      metrics_with_data: 4,
      details: {
        metric_count: 4,
        metrics_with_benchmarks: 3
      },
      computed_at: new Date().toISOString()
    },
    // Social - Subcategories
    {
      id: 'score-soc-workforce',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: 'Workforce',
      score: 51.2,
      level: 'par',
      metrics_count: 2,
      metrics_with_data: 2,
      details: {},
      computed_at: new Date().toISOString()
    },
    {
      id: 'score-soc-diversity',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: 'Diversity & Inclusion',
      score: 45.0,
      level: 'lagging',
      metrics_count: 1,
      metrics_with_data: 1,
      details: {},
      computed_at: new Date().toISOString()
    },

    // Governance - Category
    {
      id: 'score-gov',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: null,
      score: 61.2,
      level: 'leading',
      metrics_count: 4,
      metrics_with_data: 4,
      details: {
        metric_count: 4,
        metrics_with_benchmarks: 2
      },
      computed_at: new Date().toISOString()
    },
    // Governance - Subcategory
    {
      id: 'score-gov-board',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: 'Board Structure',
      score: 58.5,
      level: 'leading',
      metrics_count: 2,
      metrics_with_data: 2,
      details: {},
      computed_at: new Date().toISOString()
    }
  ];

  // Sample metrics data
  const metrics: ESGMetric[] = [
    // Environmental
    {
      id: 'metric-env-1',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope1_tco2e',
      metric_name: 'GHG Scope 1 Emissions',
      value_numeric: 420,
      value_boolean: null,
      unit: 'tCO2e',
      confidence: 0.90,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-env-2',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Climate & Emissions',
      metric_key: 'ghg_scope2_tco2e',
      metric_name: 'GHG Scope 2 Emissions',
      value_numeric: 310,
      value_boolean: null,
      unit: 'tCO2e',
      confidence: 0.88,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-env-3',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'energy_consumption_mwh',
      metric_name: 'Total Energy Consumption',
      value_numeric: 1180,
      value_boolean: null,
      unit: 'MWh',
      confidence: 0.95,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-env-4',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'environmental',
      subcategory: 'Energy',
      metric_key: 'renewable_energy_pct',
      metric_name: 'Renewable Energy %',
      value_numeric: 52,
      value_boolean: null,
      unit: '%',
      confidence: 0.92,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Social
    {
      id: 'metric-soc-1',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'employee_turnover_pct',
      metric_name: 'Employee Turnover Rate',
      value_numeric: 14,
      value_boolean: null,
      unit: '%',
      confidence: 0.98,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-soc-2',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: 'Workforce',
      metric_key: 'training_hours_per_employee',
      metric_name: 'Training Hours per Employee',
      value_numeric: 38,
      value_boolean: null,
      unit: 'hours',
      confidence: 0.85,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-soc-3',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'social',
      subcategory: 'Diversity & Inclusion',
      metric_key: 'gender_diversity_pct',
      metric_name: 'Gender Diversity',
      value_numeric: 33,
      value_boolean: null,
      unit: '%',
      confidence: 1.0,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Governance
    {
      id: 'metric-gov-1',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_independence_pct',
      metric_name: 'Board Independence',
      value_numeric: 58,
      value_boolean: null,
      unit: '%',
      confidence: 1.0,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-gov-2',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: 'Board Structure',
      metric_key: 'board_diversity_pct',
      metric_name: 'Board Diversity',
      value_numeric: 35,
      value_boolean: null,
      unit: '%',
      confidence: 1.0,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-gov-3',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: 'Ethics & Compliance',
      metric_key: 'ethics_policy_exists',
      metric_name: 'Ethics Policy Exists',
      value_numeric: null,
      value_boolean: true,
      unit: null,
      confidence: 1.0,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'metric-gov-4',
      company_id: 'test-company',
      period_year: periodYear,
      category: 'governance',
      subcategory: 'ESG Oversight',
      metric_key: 'esg_committee_exists',
      metric_name: 'ESG Committee Exists',
      value_numeric: null,
      value_boolean: true,
      unit: null,
      confidence: 0.95,
      citation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Sample highlights
  const highlights = [
    { type: 'strength', message: 'Strong governance performance with a score of 61/100' },
    { type: 'weakness', message: 'Diversity & Inclusion needs improvement (45/100)' },
    { type: 'strength', message: 'Excellent Board Structure performance in governance' },
    { type: 'weakness', message: 'Environmental score of 52/100 is below industry benchmarks' }
  ];

  console.log('\n📊 Generating PDF report...');
  console.log(`   Company: ${companyName}`);
  console.log(`   Year: ${periodYear}`);
  console.log(`   Scores: ${scores.length}`);
  console.log(`   Metrics: ${metrics.length}`);
  console.log(`   Highlights: ${highlights.length}`);

  try {
    const pdfBuffer = await renderToBuffer(
      ESGReportDocument({
        companyName,
        periodYear,
        scores,
        metrics,
        highlights
      })
    );

    console.log(`\n✅ PDF generated successfully!`);
    console.log(`   Size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log(`   Bytes: ${pdfBuffer.byteLength}`);

    // Save to file
    const outputPath = join(process.cwd(), 'test-esg-report.pdf');
    writeFileSync(outputPath, pdfBuffer);

    console.log(`\n💾 PDF saved to: ${outputPath}`);
    console.log('\n' + '═'.repeat(60));
    console.log('✅ PDF GENERATION TEST COMPLETE!');
    console.log('\nYou can now:');
    console.log('  1. Open the PDF: test-esg-report.pdf');
    console.log('  2. Test via API with dev server running');
    console.log('  3. Verify all pages render correctly');
    console.log('═'.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ PDF generation failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    return false;
  }
}

testPDFGeneration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
