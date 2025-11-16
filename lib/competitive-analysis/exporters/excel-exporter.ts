/**
 * Competitive Analysis Excel Exporter
 * Generates Excel workbooks with multiple sheets for competitive analysis data
 */

import * as XLSX from '@e965/xlsx'
import type {
  CompetitiveAnalysis,
  CompetitorCompany,
  FeatureMatrixEntry,
  PricingComparison,
  CompetitiveMoatScore,
} from '../types'

interface ExportData {
  analysis: CompetitiveAnalysis
  competitors: CompetitorCompany[]
  featureMatrix: FeatureMatrixEntry[]
  pricingComparisons: PricingComparison[]
  moatScores: CompetitiveMoatScore[]
}

/**
 * Generate Excel buffer from competitive analysis data
 */
export async function generateCompetitiveAnalysisExcel(data: ExportData): Promise<Buffer> {
  try {
    const { analysis, competitors, featureMatrix, pricingComparisons, moatScores } = data

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // =====================================================
    // Sheet 1: Summary
    // =====================================================
    const summaryData = [
      ['Competitive Analysis Report'],
      [''],
      ['Target Company', analysis.target_company_name],
      ['Analysis Title', analysis.title],
      ['Description', analysis.description || 'N/A'],
      ['Market Segment', analysis.market_segment || 'N/A'],
      ['Geography', analysis.geography || 'Global'],
      ['Status', analysis.status],
      ['Deal Status', analysis.deal_status],
      [''],
      ['Metrics'],
      ['Competitors Analyzed', competitors.length],
      ['Features Compared', featureMatrix.length],
      ['Pricing Tiers', pricingComparisons.length],
      ['Overall Moat Score', analysis.overall_moat_score?.toFixed(2) || 'N/A'],
      ['Avg Feature Parity', analysis.avg_feature_parity_score?.toFixed(2) || 'N/A'],
      [''],
      ['Dates'],
      ['Created', new Date(analysis.created_at).toLocaleString()],
      ['Last Updated', new Date(analysis.updated_at).toLocaleString()],
      ['Last Refreshed', analysis.last_refreshed_at ? new Date(analysis.last_refreshed_at).toLocaleString() : 'Never'],
      [''],
      ['Generated', new Date().toLocaleString()],
      ['Source', 'oppSpot Competitive Analysis Platform'],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Apply column widths
    summarySheet['!cols'] = [
      { wch: 25 }, // Column A
      { wch: 50 }, // Column B
    ]

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // =====================================================
    // Sheet 2: Competitors
    // =====================================================
    if (competitors.length > 0) {
      const competitorRecords = competitors.map((competitor) => ({
        'Company Name': competitor.name,
        Website: competitor.website || 'N/A',
        Industry: competitor.industry || 'N/A',
        'Company Size': competitor.company_size_band || 'N/A',
        Headquarters: competitor.headquarters_location || 'N/A',
        'Founded Year': competitor.founded_year || 'N/A',
        'Employee Count': competitor.employee_count_estimate?.toLocaleString() || 'N/A',
        'Revenue Estimate': competitor.revenue_estimate
          ? `$${competitor.revenue_estimate.toLocaleString()}`
          : 'N/A',
        'Funding Total': competitor.funding_total
          ? `$${competitor.funding_total.toLocaleString()}`
          : 'N/A',
        'Primary Product': competitor.primary_product || 'N/A',
        'Target Customer': competitor.target_customer_segment || 'N/A',
        Description: competitor.product_description || 'N/A',
      }))

      const competitorsSheet = XLSX.utils.json_to_sheet(competitorRecords)

      // Apply column widths
      competitorsSheet['!cols'] = [
        { wch: 25 }, // Company Name
        { wch: 30 }, // Website
        { wch: 20 }, // Industry
        { wch: 15 }, // Company Size
        { wch: 25 }, // Headquarters
        { wch: 12 }, // Founded Year
        { wch: 15 }, // Employee Count
        { wch: 18 }, // Revenue Estimate
        { wch: 18 }, // Funding Total
        { wch: 25 }, // Primary Product
        { wch: 20 }, // Target Customer
        { wch: 50 }, // Description
      ]

      XLSX.utils.book_append_sheet(workbook, competitorsSheet, 'Competitors')
    }

    // =====================================================
    // Sheet 3: Feature Matrix
    // =====================================================
    if (featureMatrix.length > 0) {
      const featureRecords = featureMatrix.map((feature) => ({
        Feature: feature.feature_name,
        Category: feature.feature_category,
        'Target Has': feature.target_has ? 'Yes' : 'No',
        'Importance (1-5)': feature.importance_weight,
        Notes: feature.notes || '',
      }))

      const featureSheet = XLSX.utils.json_to_sheet(featureRecords)

      // Apply column widths
      featureSheet['!cols'] = [
        { wch: 35 }, // Feature
        { wch: 20 }, // Category
        { wch: 12 }, // Target Has
        { wch: 18 }, // Importance
        { wch: 50 }, // Notes
      ]

      XLSX.utils.book_append_sheet(workbook, featureSheet, 'Feature Matrix')
    }

    // =====================================================
    // Sheet 4: Pricing Comparison
    // =====================================================
    if (pricingComparisons.length > 0) {
      const pricingRecords = pricingComparisons.map((pricing) => ({
        'Tier Name': pricing.tier_name,
        Price: pricing.price_amount ? `$${pricing.price_amount.toFixed(2)}` : 'N/A',
        'Billing Period': pricing.billing_period,
        Currency: pricing.currency,
        Positioning: pricing.pricing_positioning,
        'User Limit': pricing.user_limit_min
          ? `${pricing.user_limit_min}-${pricing.user_limit_max || '∞'}`
          : 'Unlimited',
        'Features Summary': pricing.features_summary || '',
        Notes: pricing.notes || '',
      }))

      const pricingSheet = XLSX.utils.json_to_sheet(pricingRecords)

      // Apply column widths
      pricingSheet['!cols'] = [
        { wch: 20 }, // Tier Name
        { wch: 12 }, // Price
        { wch: 15 }, // Billing Period
        { wch: 10 }, // Currency
        { wch: 18 }, // Positioning
        { wch: 15 }, // User Limit
        { wch: 40 }, // Features Summary
        { wch: 30 }, // Notes
      ]

      XLSX.utils.book_append_sheet(workbook, pricingSheet, 'Pricing')
    }

    // =====================================================
    // Sheet 5: Moat Analysis
    // =====================================================
    if (moatScores.length > 0) {
      const moatRecords = moatScores.map((moat) => ({
        'Moat Factor': moat.moat_factor,
        'Score (1-10)': moat.score,
        Weight: moat.weight,
        Rationale: moat.rationale || '',
        Evidence: moat.evidence || '',
      }))

      const moatSheet = XLSX.utils.json_to_sheet(moatRecords)

      // Apply column widths
      moatSheet['!cols'] = [
        { wch: 25 }, // Moat Factor
        { wch: 12 }, // Score
        { wch: 10 }, // Weight
        { wch: 50 }, // Rationale
        { wch: 50 }, // Evidence
      ]

      XLSX.utils.book_append_sheet(workbook, moatSheet, 'Moat Analysis')
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return buffer
  } catch (error) {
    console.error('[CompetitiveAnalysisExcel] Export failed:', error)
    throw new Error(
      `Failed to generate Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { ExportData }
