#!/usr/bin/env tsx

/**
 * Local Companies House Import Script
 * Run this script locally to import Companies House data directly to production DB
 *
 * Usage:
 *   npx tsx scripts/import-companies-house.ts [--test]
 *
 * Options:
 *   --test    Use a smaller sample file for testing
 */

import { createClient } from '@supabase/supabase-js'
import * as Papa from 'papaparse'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import { execSync } from 'child_process'

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface CompaniesHouseRecord {
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
  'SICCode.SicText_1'?: string
  'SICCode.SicText_2'?: string
  'SICCode.SicText_3'?: string
  'SICCode.SicText_4'?: string
  'LimitedPartnerships.NumGenPartners'?: string
  'LimitedPartnerships.NumLimPartners'?: string
  URI: string
  'PreviousName_1.CONDATE'?: string
  'PreviousName_1.CompanyName'?: string
}

interface ImportFilters {
  allowedStatuses: string[]
  allowedSICCodes: string[]
  minIncorporationDate?: Date
  maxIncorporationDate?: Date
  allowedCountries?: string[]
  allowedCompanyTypes?: string[]
}

const DEFAULT_FILTERS: ImportFilters = {
  // RELAXED: Just import active companies, no other filters
  allowedStatuses: ['Active'],
  allowedSICCodes: [], // Empty = no SIC filter
  minIncorporationDate: undefined, // No date filter
  allowedCountries: undefined, // No country filter
  allowedCompanyTypes: undefined // No type filter
}

class LocalImporter {
  private totalRows = 0
  private processedRows = 0
  private importedRows = 0
  private skippedRows = 0
  private errorRows = 0
  private currentBatch = 0
  private filters: ImportFilters
  private batchSize = 1000
  private startTime: Date
  private maxImport = 500000 // Stop after 500K companies (~200MB)

  constructor(filters: ImportFilters = DEFAULT_FILTERS) {
    this.filters = filters
    this.startTime = new Date()
  }

  async downloadFile(url: string, dest: string): Promise<void> {
    console.log(`📥 Downloading from: ${url}`)
    console.log(`📁 Saving to: ${dest}`)

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http
      const file = createWriteStream(dest)
      let downloadedBytes = 0
      let lastLogTime = Date.now()

      protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            console.log(`↪️  Following redirect to: ${redirectUrl}`)
            file.close()
            fs.unlinkSync(dest)
            this.downloadFile(redirectUrl, dest).then(resolve).catch(reject)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`))
          return
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2)

        console.log(`📦 File size: ${totalMB} MB`)

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length
          const now = Date.now()

          // Log progress every 5 seconds
          if (now - lastLogTime > 5000) {
            const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2)
            const percent = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?'
            console.log(`   Downloaded: ${downloadedMB} MB / ${totalMB} MB (${percent}%)`)
            lastLogTime = now
          }
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          const finalMB = (downloadedBytes / (1024 * 1024)).toFixed(2)
          console.log(`✅ Download complete: ${finalMB} MB`)
          resolve()
        })
      }).on('error', (err) => {
        fs.unlinkSync(dest)
        reject(err)
      })
    })
  }

  shouldImportCompany(record: CompaniesHouseRecord): boolean {
    // Case-insensitive status check
    const statusLower = record.CompanyStatus?.toLowerCase() || ''
    const allowedStatusesLower = this.filters.allowedStatuses.map(s => s.toLowerCase())
    if (!allowedStatusesLower.includes(statusLower)) {
      return false
    }

    if (this.filters.allowedCountries &&
        !this.filters.allowedCountries.includes(record.CountryOfOrigin)) {
      return false
    }

    if (this.filters.allowedCompanyTypes &&
        !this.filters.allowedCompanyTypes.includes(record.CompanyCategory)) {
      return false
    }

    if (this.filters.minIncorporationDate || this.filters.maxIncorporationDate) {
      const incorpDate = new Date(record.IncorporationDate)

      if (this.filters.minIncorporationDate && incorpDate < this.filters.minIncorporationDate) {
        return false
      }

      if (this.filters.maxIncorporationDate && incorpDate > this.filters.maxIncorporationDate) {
        return false
      }
    }

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

  convertUKDateToISO(ukDate: string | undefined): string | null {
    if (!ukDate) return null

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = ukDate.split('/')
    if (parts.length !== 3) return null

    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  mapSICToIndustry(sicCode: string): string {
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

  transformRecord(record: CompaniesHouseRecord): any {
    const sicCodes = [
      record['SICCode.SicText_1'],
      record['SICCode.SicText_2'],
      record['SICCode.SicText_3'],
      record['SICCode.SicText_4']
    ].filter(Boolean)

    const addressParts = [
      record['RegAddress.AddressLine1'],
      record['RegAddress.AddressLine2'],
      record['RegAddress.PostTown'],
      record['RegAddress.County'],
      record['RegAddress.PostCode']
    ].filter(Boolean)

    // Build address for description field
    const addressStr = addressParts.join(', ')

    return {
      company_number: record.CompanyNumber,
      name: record.CompanyName,
      description: sicCodes[0] ? this.mapSICToIndustry(sicCodes[0]) : 'UK Company',
      address: {
        street: [record['RegAddress.AddressLine1'], record['RegAddress.AddressLine2']].filter(Boolean).join(', '),
        city: record['RegAddress.PostTown'],
        state: record['RegAddress.County'],
        country: record['RegAddress.Country'] || record.CountryOfOrigin,
        postal_code: record['RegAddress.PostCode']
      },
      company_status: record.CompanyStatus,
      company_type: record.CompanyCategory,
      incorporation_date: this.convertUKDateToISO(record.IncorporationDate),
      dissolution_date: this.convertUKDateToISO(record.DissolutionDate),
      sic_codes: sicCodes,
      accounts_next_due: this.convertUKDateToISO(record['Accounts.NextDueDate']),
      confirmation_statement_next_due: this.convertUKDateToISO(record['Returns.NextDueDate']),
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
      data_source: 'companies_house',
      last_companies_house_update: new Date().toISOString(),
      companies_house_url: `https://find-and-update.company-information.service.gov.uk/company/${record.CompanyNumber}`
    }
  }

  async importBatch(batch: any[]): Promise<void> {
    try {
      this.currentBatch++

      const { data, error } = await supabase
        .from('businesses')
        .upsert(batch, {
          onConflict: 'company_number',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`❌ Batch ${this.currentBatch} error:`, error.message)
        this.errorRows += batch.length
        return
      }

      this.importedRows += batch.length

      const elapsed = (Date.now() - this.startTime.getTime()) / 1000
      const rate = this.processedRows / elapsed
      const eta = this.totalRows > 0
        ? Math.round((this.totalRows - this.processedRows) / rate)
        : 0

      console.log(`✅ Batch ${this.currentBatch}: ${batch.length} companies | Total imported: ${this.importedRows.toLocaleString()} | ETA: ${Math.round(eta/60)}min`)
    } catch (error: any) {
      console.error(`❌ Failed to import batch:`, error.message)
      this.errorRows += batch.length
    }
  }

  async processCSV(filePath: string): Promise<void> {
    console.log(`\n🔄 Processing CSV file...`)

    return new Promise((resolve, reject) => {
      let batch: any[] = []
      let lastLogTime = Date.now()

      const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' })

      Papa.parse<CompaniesHouseRecord>(fileStream, {
        header: true,
        skipEmptyLines: true,
        chunk: async (results, parser) => {
          parser.pause()

          for (const row of results.data) {
            // Stop if we've reached max import limit
            if (this.importedRows >= this.maxImport) {
              console.log(`\n🛑 Reached max import limit of ${this.maxImport.toLocaleString()} companies`)
              fileStream.destroy()
              parser.abort()
              break
            }

            this.totalRows++
            this.processedRows++

            if (this.shouldImportCompany(row)) {
              batch.push(this.transformRecord(row))

              if (batch.length >= this.batchSize) {
                await this.importBatch(batch)
                batch = []
              }
            } else {
              this.skippedRows++
            }

            // Log progress every 10000 rows
            const now = Date.now()
            if (now - lastLogTime > 10000) {
              console.log(`📊 Processed: ${this.processedRows.toLocaleString()} | Imported: ${this.importedRows.toLocaleString()} | Skipped: ${this.skippedRows.toLocaleString()}`)
              lastLogTime = now
            }
          }

          parser.resume()
        },
        complete: async () => {
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

  extractZip(zipPath: string, destDir: string): string {
    console.log(`📦 Extracting ZIP file...`)
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' })

    // Find the CSV file
    const files = fs.readdirSync(destDir).filter(f => f.endsWith('.csv'))
    if (files.length === 0) {
      throw new Error('No CSV file found in ZIP')
    }

    const csvPath = path.join(destDir, files[0])
    console.log(`✅ Extracted: ${files[0]}`)
    return csvPath
  }

  async run(testMode: boolean = false): Promise<void> {
    const tempDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const zipPath = path.join(tempDir, 'companies-house-data.zip')
    let csvPath = ''

    try {
      console.log('\n🚀 Companies House Import Starting...\n')
      console.log('⚙️  Configuration:')
      console.log(`   Database: ${SUPABASE_URL}`)
      console.log(`   Mode: ${testMode ? 'TEST (sample)' : 'FULL'}`)
      console.log(`   Batch size: ${this.batchSize}`)
      console.log(`   Filters:`)
      console.log(`     - Statuses: ${this.filters.allowedStatuses.join(', ')}`)
      console.log(`     - Industries: ${this.filters.allowedSICCodes.length} SIC codes`)
      console.log(`     - Incorporated after: ${this.filters.minIncorporationDate?.toISOString().split('T')[0]}`)
      console.log(`     - Countries: ${this.filters.allowedCountries?.join(', ')}`)
      console.log('')

      // Get data URL
      // Companies House updates monthly, use a recent known good date
      const dataUrl = getFullDataURL()

      // Download ZIP file
      await this.downloadFile(dataUrl, zipPath)

      // Extract ZIP to get CSV
      csvPath = this.extractZip(zipPath, tempDir)

      // Process CSV
      await this.processCSV(csvPath)

      // Final stats
      const elapsed = (Date.now() - this.startTime.getTime()) / 1000
      console.log('\n✅ Import Complete!\n')
      console.log('📊 Final Statistics:')
      console.log(`   Total processed: ${this.processedRows.toLocaleString()}`)
      console.log(`   Imported: ${this.importedRows.toLocaleString()}`)
      console.log(`   Skipped: ${this.skippedRows.toLocaleString()}`)
      console.log(`   Errors: ${this.errorRows.toLocaleString()}`)
      console.log(`   Time elapsed: ${Math.round(elapsed / 60)} minutes`)
      console.log(`   Average rate: ${Math.round(this.processedRows / elapsed)} rows/sec`)
      console.log('')

    } catch (error: any) {
      console.error('\n❌ Import failed:', error.message)
      throw error
    } finally {
      // Cleanup
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath)
      }
      if (csvPath && fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath)
      }
      console.log('🧹 Cleaned up temporary files')
    }
  }
}

function getFullDataURL(): string {
  // Companies House releases monthly on the 1st, compiled from previous month
  // Use September 2024 as a known good date
  const date = '2024-09-01'
  return `http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-${date}.zip`
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')

  const importer = new LocalImporter(DEFAULT_FILTERS)
  await importer.run(testMode)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
