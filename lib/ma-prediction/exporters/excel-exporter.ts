/**
 * M&A Predictions Excel Exporter
 * Generates Excel workbooks with multiple sheets for M&A prediction data
 */

import * as XLSX from '@e965/xlsx'
import type { MAPredictionDetail } from '@/lib/types/ma-prediction'

interface ExportData {
  predictions: MAPredictionDetail[]
  includeFields?: {
    factors?: boolean
    valuation?: boolean
    acquirer_profiles?: boolean
  }
}

/**
 * Generate Excel buffer from M&A predictions data
 */
export async function generateMAPredictionsExcel(data: ExportData): Promise<Buffer> {
  try {
    const { predictions, includeFields } = data
    const showFactors = includeFields?.factors !== false
    const showValuation = includeFields?.valuation !== false
    const showAcquirerProfiles = includeFields?.acquirer_profiles !== false

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // =====================================================
    // Sheet 1: Summary
    // =====================================================
    const summaryData = [
      ['M&A Target Predictions Report'],
      [''],
      ['Report Details'],
      ['Generated', new Date().toLocaleString('en-GB')],
      ['Total Companies', predictions.length],
      [''],
      ['Distribution by Likelihood'],
      ['Very High', predictions.filter(p => p.likelihood_category === 'Very High').length],
      ['High', predictions.filter(p => p.likelihood_category === 'High').length],
      ['Medium', predictions.filter(p => p.likelihood_category === 'Medium').length],
      ['Low', predictions.filter(p => p.likelihood_category === 'Low').length],
      [''],
      ['Distribution by Confidence'],
      ['High Confidence', predictions.filter(p => p.confidence_level === 'High').length],
      ['Medium Confidence', predictions.filter(p => p.confidence_level === 'Medium').length],
      ['Low Confidence', predictions.filter(p => p.confidence_level === 'Low').length],
      [''],
      ['Statistics'],
      ['Average Prediction Score', (predictions.reduce((sum, p) => sum + p.prediction_score, 0) / predictions.length).toFixed(1)],
      ['Highest Score', Math.max(...predictions.map(p => p.prediction_score)).toFixed(1)],
      ['Lowest Score', Math.min(...predictions.map(p => p.prediction_score)).toFixed(1)],
      [''],
      ['Source', 'oppSpot M&A Predictions Platform'],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Apply column widths
    summarySheet['!cols'] = [
      { wch: 30 }, // Column A
      { wch: 40 }, // Column B
    ]

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // =====================================================
    // Sheet 2: Predictions Overview
    // =====================================================
    const predictionRecords = predictions.map((prediction) => {
      const record: Record<string, unknown> = {
        'Company Name': prediction.company.name,
        'Company Number': prediction.company.company_number,
        'Prediction Score': prediction.prediction_score,
        'Likelihood': prediction.likelihood_category,
        'Confidence': prediction.confidence_level,
        'Algorithm': prediction.algorithm_type,
        'Analysis Date': new Date(prediction.data_last_refreshed).toLocaleDateString('en-GB'),
      }

      if (showValuation && prediction.valuation) {
        record['Min Valuation (£M)'] = (prediction.valuation.min_valuation_gbp / 1000000).toFixed(1)
        record['Max Valuation (£M)'] = (prediction.valuation.max_valuation_gbp / 1000000).toFixed(1)
        record['Valuation Method'] = prediction.valuation.valuation_method
      }

      if (showFactors && prediction.factors.length > 0) {
        const topFactor = prediction.factors[0]
        record['Top Factor'] = topFactor.factor_name
        record['Top Factor Impact'] = `${topFactor.impact_weight}%`
      }

      return record
    })

    const predictionsSheet = XLSX.utils.json_to_sheet(predictionRecords)

    // Apply column widths
    predictionsSheet['!cols'] = [
      { wch: 30 }, // Company Name
      { wch: 15 }, // Company Number
      { wch: 12 }, // Prediction Score
      { wch: 12 }, // Likelihood
      { wch: 12 }, // Confidence
      { wch: 20 }, // Algorithm
      { wch: 15 }, // Analysis Date
      ...(showValuation ? [
        { wch: 15 }, // Min Valuation
        { wch: 15 }, // Max Valuation
        { wch: 20 }, // Valuation Method
      ] : []),
      ...(showFactors ? [
        { wch: 30 }, // Top Factor
        { wch: 15 }, // Top Factor Impact
      ] : []),
    ]

    XLSX.utils.book_append_sheet(workbook, predictionsSheet, 'Predictions')

    // =====================================================
    // Sheet 3: Detailed Factors (if included)
    // =====================================================
    if (showFactors) {
      const factorRecords: Array<Record<string, unknown>> = []

      predictions.forEach((prediction) => {
        prediction.factors.forEach((factor) => {
          factorRecords.push({
            'Company Name': prediction.company.name,
            'Company Number': prediction.company.company_number,
            'Factor Type': factor.factor_type,
            'Factor Name': factor.factor_name,
            'Description': factor.factor_description,
            'Impact Weight': `${factor.impact_weight}%`,
            'Impact Direction': factor.impact_direction || 'N/A',
            'Rank': factor.rank,
          })
        })
      })

      if (factorRecords.length > 0) {
        const factorsSheet = XLSX.utils.json_to_sheet(factorRecords)

        // Apply column widths
        factorsSheet['!cols'] = [
          { wch: 30 }, // Company Name
          { wch: 15 }, // Company Number
          { wch: 15 }, // Factor Type
          { wch: 30 }, // Factor Name
          { wch: 50 }, // Description
          { wch: 12 }, // Impact Weight
          { wch: 15 }, // Impact Direction
          { wch: 8 },  // Rank
        ]

        XLSX.utils.book_append_sheet(workbook, factorsSheet, 'Factors')
      }
    }

    // =====================================================
    // Sheet 4: Valuations (if included)
    // =====================================================
    if (showValuation) {
      const valuationRecords = predictions
        .filter(p => p.valuation)
        .map((prediction) => ({
          'Company Name': prediction.company.name,
          'Company Number': prediction.company.company_number,
          'Min Valuation (£)': prediction.valuation!.min_valuation_gbp,
          'Max Valuation (£)': prediction.valuation!.max_valuation_gbp,
          'Min Valuation (£M)': (prediction.valuation!.min_valuation_gbp / 1000000).toFixed(2),
          'Max Valuation (£M)': (prediction.valuation!.max_valuation_gbp / 1000000).toFixed(2),
          'Currency': prediction.valuation!.currency,
          'Valuation Method': prediction.valuation!.valuation_method,
          'Confidence': prediction.valuation!.confidence_level,
        }))

      if (valuationRecords.length > 0) {
        const valuationSheet = XLSX.utils.json_to_sheet(valuationRecords)

        // Apply column widths
        valuationSheet['!cols'] = [
          { wch: 30 }, // Company Name
          { wch: 15 }, // Company Number
          { wch: 18 }, // Min Valuation (£)
          { wch: 18 }, // Max Valuation (£)
          { wch: 15 }, // Min Valuation (£M)
          { wch: 15 }, // Max Valuation (£M)
          { wch: 10 }, // Currency
          { wch: 25 }, // Valuation Method
          { wch: 12 }, // Confidence
        ]

        XLSX.utils.book_append_sheet(workbook, valuationSheet, 'Valuations')
      }
    }

    // =====================================================
    // Sheet 5: Acquirer Profiles (if included)
    // =====================================================
    if (showAcquirerProfiles) {
      const acquirerRecords: Array<Record<string, unknown>> = []

      predictions.forEach((prediction) => {
        prediction.acquirer_profiles.forEach((acquirer) => {
          acquirerRecords.push({
            'Target Company': prediction.company.name,
            'Company Number': prediction.company.company_number,
            'Industry Match': acquirer.industry_match,
            'Size Ratio': acquirer.size_ratio_description,
            'Geographic Proximity': acquirer.geographic_proximity,
            'Strategic Rationale': acquirer.strategic_rationale,
            'Rationale Description': acquirer.strategic_rationale_description,
            'Match Score': acquirer.match_score,
            'Rank': acquirer.rank,
          })
        })
      })

      if (acquirerRecords.length > 0) {
        const acquirersSheet = XLSX.utils.json_to_sheet(acquirerRecords)

        // Apply column widths
        acquirersSheet['!cols'] = [
          { wch: 30 }, // Target Company
          { wch: 15 }, // Company Number
          { wch: 25 }, // Industry Match
          { wch: 20 }, // Size Ratio
          { wch: 20 }, // Geographic Proximity
          { wch: 20 }, // Strategic Rationale
          { wch: 50 }, // Rationale Description
          { wch: 12 }, // Match Score
          { wch: 8 },  // Rank
        ]

        XLSX.utils.book_append_sheet(workbook, acquirersSheet, 'Acquirer Profiles')
      }
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return buffer
  } catch (error) {
    console.error('[MAPredictionsExcel] Export failed:', error)
    throw new Error(
      `Failed to generate Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export type { ExportData }
