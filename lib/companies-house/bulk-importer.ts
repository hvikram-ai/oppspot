/**
 * Companies House Bulk Importer
 * Smart filtering to stay within Supabase free tier (500MB limit)
 *
 * Filters applied:
 * - Active companies only
 * - Relevant SIC codes (tech, professional services, etc.)
 * - Incorporated in last 10 years
 * - Estimated result: 500K-1M companies (~200-400MB)
 */

import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export interface CompaniesHouseRecord {
  CompanyName: string
  CompanyNumber: string
  'RegAddress.CareOf'?: string
  'RegAddress.POBox'?: string
  'RegAddress.AddressLine1'?: string
  'RegAddress.AddressLine2'?: string
  'RegAddress.PostTown'?: string
  'RegAddress.County'?: string
  'RegAddress.Country'?: string
  'RegAddress.PostCode'?: string
  CompanyCategory: string
  CompanyStatus: string
  CountryOfOrigin: string
  DissolutionDate?: string
  IncorporationDate: string
  'Accounts.AccountRefDay'?: string
  'Accounts.AccountRefMonth'?: string
  'Accounts.NextDueDate'?: string
  'Accounts.LastMadeUpDate'?: string
  'Accounts.AccountCategory'?: string
  'Returns.NextDueDate'?: string
  'Returns.LastMadeUpDate'?: string
  'Mortgages.NumMortCharges'?: string
  'Mortgages.NumMortOutstanding'?: string
  'Mortgages.NumMortPartSatisfied'?: string
  'Mortgages.NumMortSatisfied'?: string
  SICCode.SicText_1?: string
  SICCode.SicText_2?: string
  SICCode.SicText_3?: string
  SICCode.SicText_4?: string
  'LimitedPartnerships.NumGenPartners'?: string
  'LimitedPartnerships.NumLimPartners'?: string
  URI: string
  'PreviousName_1.CONDATE'?: string
  'PreviousName_1.CompanyName'?: string
}

export interface ImportProgress {
  status: 'idle' | 'downloading' | 'processing' | 'completed' | 'failed'
  totalRows: number
  processedRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  currentBatch: number
  estimatedTimeRemaining?: number
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export interface ImportFilters {
  // Company status filter
  allowedStatuses: string[]

  // SIC code filter (industry classification)
  allowedSICCodes: string[]

  // Date filters
  minIncorporationDate?: Date
  maxIncorporationDate?: Date

  // Geographic filter
  allowedCountries?: string[]

  // Company type filter
  allowedCompanyTypes?: string[]
}

// Default smart filters to stay under 500MB
export const DEFAULT_FILTERS: ImportFilters = {
  // Only active companies
  allowedStatuses: ['Active', 'Active - Proposal to Strike off'],

  // Tech & Professional Services SIC codes (most relevant for B2B)
  allowedSICCodes: [
    '62', // Computer programming, consultancy
    '63', // Information service activities
    '70', // Management consultancy
    '71', // Architectural and engineering
    '72', // Scientific research
    '73', // Advertising and market research
    '74', // Professional, scientific, technical
    '82', // Office administrative, office support
    '58', // Publishing activities
    '59', // Motion picture, video, TV
    '60', // Programming and broadcasting
    '61', // Telecommunications
    '64', // Financial service activities
    '66', // Insurance, reinsurance, pension
    '69', // Legal and accounting
    '85', // Education
    '86', // Human health activities
    '90', // Creative, arts, entertainment
  ],

  // Companies incorporated in last 10 years (more likely to be active/growing)
  minIncorporationDate: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),

  // UK only
  allowedCountries: ['England', 'Wales', 'Scotland', 'Northern Ireland'],

  // Common company types
  allowedCompanyTypes: [
    'Private Limited Company',
    'Public Limited Company',
    'Limited Liability Partnership',
    'Private Unlimited Company'
  ]
}

export class CompaniesHouseBulkImporter {
  private progress: ImportProgress = {
    status: 'idle',
    totalRows: 0,
    processedRows: 0,
    importedRows: 0,
    skippedRows: 0,
    errorRows: 0,
    currentBatch: 0
  }

  private filters: ImportFilters
  private batchSize = 1000
  private supabase: any

  constructor(filters: ImportFilters = DEFAULT_FILTERS) {
    this.filters = filters
  }

  /**
   * Download and import Companies House data
   */
  async importFromURL(url: string): Promise<ImportProgress> {
    this.progress.status = 'downloading'
    this.progress.startedAt = new Date()

    try {
      // Initialize Supabase
      this.supabase = await createClient()

      console.log('[CH Import] Starting download from:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`)
      }

      const text = await response.text()

      console.log('[CH Import] Downloaded, starting processing...')
      this.progress.status = 'processing'

      await this.processCSV(text)

      this.progress.status = 'completed'
      this.progress.completedAt = new Date()

      console.log('[CH Import] Import completed:', {
        imported: this.progress.importedRows,
        skipped: this.progress.skippedRows,
        errors: this.progress.errorRows
      })

      return this.progress

    } catch (error: any) {
      console.error('[CH Import] Error:', error)
      this.progress.status = 'failed'
      this.progress.error = error.message
      throw error
    }
  }

  /**
   * Process CSV data with streaming
   */
  private async processCSV(csvText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let batch: any[] = []

      Papa.parse<CompaniesHouseRecord>(csvText, {
        header: true,
        skipEmptyLines: true,
        chunk: async (results) => {
          for (const row of results.data) {
            this.progress.totalRows++
            this.progress.processedRows++

            // Apply filters
            if (this.shouldImportCompany(row)) {
              batch.push(this.transformRecord(row))

              // Import batch when full
              if (batch.length >= this.batchSize) {
                await this.importBatch(batch)
                batch = []
              }
            } else {
              this.progress.skippedRows++
            }

            // Update progress every 1000 rows
            if (this.progress.processedRows % 1000 === 0) {
              console.log(`[CH Import] Processed: ${this.progress.processedRows}, Imported: ${this.progress.importedRows}, Skipped: ${this.progress.skippedRows}`)
            }
          }
        },
        complete: async () => {
          // Import remaining batch
          if (batch.length > 0) {
            await this.importBatch(batch)
          }
          resolve()
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }

  /**
   * Check if company meets filter criteria
   */
  private shouldImportCompany(record: CompaniesHouseRecord): boolean {
    // Status filter
    if (!this.filters.allowedStatuses.includes(record.CompanyStatus)) {
      return false
    }

    // Country filter
    if (this.filters.allowedCountries &&
        !this.filters.allowedCountries.includes(record.CountryOfOrigin)) {
      return false
    }

    // Company type filter
    if (this.filters.allowedCompanyTypes &&
        !this.filters.allowedCompanyTypes.includes(record.CompanyCategory)) {
      return false
    }

    // Incorporation date filter
    if (this.filters.minIncorporationDate || this.filters.maxIncorporationDate) {
      const incorpDate = new Date(record.IncorporationDate)

      if (this.filters.minIncorporationDate && incorpDate < this.filters.minIncorporationDate) {
        return false
      }

      if (this.filters.maxIncorporationDate && incorpDate > this.filters.maxIncorporationDate) {
        return false
      }
    }

    // SIC code filter (check if any SIC code matches allowed prefixes)
    const sicCodes = [
      record['SICCode.SicText_1'],
      record['SICCode.SicText_2'],
      record['SICCode.SicText_3'],
      record['SICCode.SicText_4']
    ].filter(Boolean)

    if (sicCodes.length > 0 && this.filters.allowedSICCodes.length > 0) {
      const hasMatchingSIC = sicCodes.some(sic =>
        this.filters.allowedSICCodes.some(allowed =>
          sic!.startsWith(allowed)
        )
      )

      if (!hasMatchingSIC) {
        return false
      }
    }

    return true
  }

  /**
   * Transform Companies House record to database format
   */
  private transformRecord(record: CompaniesHouseRecord): any {
    const sicCodes = [
      record['SICCode.SicText_1'],
      record['SICCode.SicText_2'],
      record['SICCode.SicText_3'],
      record['SICCode.SicText_4']
    ].filter(Boolean)

    // Build full address
    const addressParts = [
      record['RegAddress.AddressLine1'],
      record['RegAddress.AddressLine2'],
      record['RegAddress.PostTown'],
      record['RegAddress.County'],
      record['RegAddress.PostCode']
    ].filter(Boolean)

    return {
      company_number: record.CompanyNumber,
      name: record.CompanyName,
      company_status: record.CompanyStatus,
      company_type: record.CompanyCategory,
      incorporation_date: record.IncorporationDate || null,
      dissolution_date: record.DissolutionDate || null,
      sic_codes: sicCodes,
      accounts_next_due: record['Accounts.NextDueDate'] || null,
      confirmation_statement_next_due: record['Returns.NextDueDate'] || null,
      registered_office_address: {
        care_of: record['RegAddress.CareOf'],
        po_box: record['RegAddress.POBox'],
        address_line_1: record['RegAddress.AddressLine1'],
        address_line_2: record['RegAddress.AddressLine2'],
        post_town: record['RegAddress.PostTown'],
        county: record['RegAddress.County'],
        country: record['RegAddress.Country'],
        post_code: record['RegAddress.PostCode']
      },
      formatted_address: addressParts.join(', '),
      region: record['RegAddress.County'] || record['RegAddress.PostTown'] || record.CountryOfOrigin,
      data_source: 'companies_house',
      last_companies_house_update: new Date().toISOString(),
      companies_house_url: `https://find-and-update.company-information.service.gov.uk/company/${record.CompanyNumber}`,

      // Extract primary industry from first SIC code
      industry: sicCodes[0] ? this.mapSICToIndustry(sicCodes[0]) : null
    }
  }

  /**
   * Map SIC code to friendly industry name
   */
  private mapSICToIndustry(sicCode: string): string {
    const prefix = sicCode.substring(0, 2)

    const industryMap: Record<string, string> = {
      '62': 'Technology & Software',
      '63': 'Information Services',
      '70': 'Management Consulting',
      '71': 'Engineering & Architecture',
      '72': 'Scientific Research',
      '73': 'Advertising & Marketing',
      '74': 'Professional Services',
      '82': 'Business Support',
      '58': 'Publishing',
      '59': 'Media & Entertainment',
      '60': 'Broadcasting',
      '61': 'Telecommunications',
      '64': 'Financial Services',
      '66': 'Insurance',
      '69': 'Legal & Accounting',
      '85': 'Education',
      '86': 'Healthcare',
      '90': 'Creative Arts'
    }

    return industryMap[prefix] || 'Other'
  }

  /**
   * Import batch of companies to database
   */
  private async importBatch(batch: any[]): Promise<void> {
    try {
      this.progress.currentBatch++

      const { data, error } = await this.supabase
        .from('businesses')
        .upsert(batch, {
          onConflict: 'company_number',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('[CH Import] Batch error:', error)
        this.progress.errorRows += batch.length
        throw error
      }

      this.progress.importedRows += batch.length

      console.log(`[CH Import] Batch ${this.progress.currentBatch} imported: ${batch.length} companies`)

    } catch (error: any) {
      console.error('[CH Import] Failed to import batch:', error)
      this.progress.errorRows += batch.length
      // Continue processing despite errors
    }
  }

  /**
   * Get current progress
   */
  getProgress(): ImportProgress {
    return { ...this.progress }
  }

  /**
   * Cancel ongoing import
   */
  cancel(): void {
    this.progress.status = 'failed'
    this.progress.error = 'Cancelled by user'
  }
}

/**
 * Get sample Companies House data URL
 * For testing with smaller datasets
 */
export function getSampleDataURL(): string {
  // This would be a smaller sample file for testing
  return 'http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-2024-10-01.zip'
}

/**
 * Get full Companies House data URL
 */
export function getFullDataURL(): string {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  return `http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-${dateStr}.zip`
}
