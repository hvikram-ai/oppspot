/**
 * OpenCorporates API Types
 * Type definitions for OpenCorporates API responses and data structures
 * API Documentation: https://api.opencorporates.com/documentation/API-Reference
 */

// =====================================================
// Core Company Types
// =====================================================

export interface OpenCorporatesCompany {
  // Identifiers
  company_number: string // Registry-specific company number
  jurisdiction_code: string // e.g., "gb", "us_de", "ie"
  uid: string // OpenCorporates universal ID (globally unique)

  // Basic Information
  name: string // Legal company name
  company_type: string // e.g., "Public Limited Company", "LLC"
  current_status: string // e.g., "Active", "Dissolved", "In Liquidation"
  inactive: boolean // TRUE if company is not active

  // Dates
  incorporation_date: string | null // ISO 8601 date
  dissolution_date?: string | null // ISO 8601 date (if dissolved)

  // Address
  registered_address_in_full?: string // Full address as single string
  registered_address?: OpenCorporatesAddress

  // Classification
  industry_codes?: OpenCorporatesIndustryCode[]

  // Names History
  previous_names?: OpenCorporatesPreviousName[]
  alternative_names?: string[]

  // Corporate Structure
  officers?: OpenCorporatesOfficer[]

  // Filings
  filings?: OpenCorporatesFiling[]

  // Beneficial Ownership
  ultimate_beneficial_owners?: OpenCorporatesBeneficialOwner[]
  ultimate_controlling_company?: OpenCorporatesControllingEntity
  controlling_entity?: OpenCorporatesControllingEntity

  // Contact Information
  telephone_number?: string
  fax_number?: string
  website?: string | string[]

  // Additional Attributes
  attributes?: {
    jurisdiction_of_origin?: string
    number_of_employees?: string | number
    registered_agent_name?: string
    registered_agent_address?: string
    merged_into?: {
      company_name: string
      company_number: string
      effective_date: string
    }
    [key: string]: string | number | boolean | null | undefined | { company_name: string; company_number: string; effective_date: string }
  }

  // Provenance
  source: OpenCorporatesSource

  // Registration Variants
  subsequent_registrations?: OpenCorporatesRegistration[]
  alternate_registrations?: OpenCorporatesRegistration[]
  branch?: 'F' | 'L' | null // Foreign or Local branch

  // URLs
  registry_url?: string // Official registry URL
  opencorporates_url: string // OpenCorporates profile URL

  // Metadata
  created_at?: string
  updated_at?: string
  retrieved_at?: string

  // Restricted Access Fields (paid tier)
  restricted_for_marketing?: boolean
}

export interface OpenCorporatesAddress {
  address_line_1?: string
  address_line_2?: string
  locality?: string // City/town
  region?: string // State/province/county
  postal_code?: string
  postcode?: string // UK variant
  country?: string
  country_code?: string // ISO 2-letter code
  post_town?: string // UK-specific
  county?: string // UK-specific
  street_address?: string

  // Geocoding (not always available)
  latitude?: number
  longitude?: number
}

export interface OpenCorporatesRegistration {
  jurisdiction_code: string
  company_number: string
  opencorporates_url?: string
  start_date?: string
  end_date?: string
}

export interface OpenCorporatesIndustryCode {
  code: string // e.g., "62020"
  code_scheme_id: string // e.g., "SIC", "NAICS", "uk_sic_2007"
  description: string // Human-readable description
  uid?: string
}

export interface OpenCorporatesPreviousName {
  company_name: string
  type: string // e.g., "Previous", "Alternative"
  start_date?: string
  end_date?: string
  language?: string
}

export interface OpenCorporatesOfficer {
  id?: number
  uid?: string
  name: string
  position: string // e.g., "director", "secretary", "member"
  start_date?: string
  end_date?: string
  address?: string | OpenCorporatesAddress
  date_of_birth?: {
    month?: number
    year?: number
  }
  nationality?: string
  occupation?: string
  country_of_residence?: string

  // Identification
  other_attributes?: {
    identification_number?: string
    identification_type?: string
    [key: string]: string | number | boolean | null | undefined
  }

  // Provenance
  opencorporates_url?: string
  source?: OpenCorporatesSource
}

export interface OpenCorporatesFiling {
  id?: number
  uid?: string
  title: string
  description?: string
  date: string // ISO 8601 date
  filing_type?: string
  filing_code?: string
  url?: string // Link to document

  // Provenance
  opencorporates_url?: string
  source?: OpenCorporatesSource
}

export interface OpenCorporatesBeneficialOwner {
  name: string
  type?: string // "Person" or "Company"
  date_of_birth?: {
    month?: number
    year?: number
  }
  nationality?: string
  address?: string | OpenCorporatesAddress
  ownership_percentage?: number
  control_mechanisms?: string[]
  uid?: string
  opencorporates_url?: string
}

export interface OpenCorporatesControllingEntity {
  name: string
  company_number?: string
  jurisdiction_code?: string
  opencorporates_url?: string
}

export interface OpenCorporatesSource {
  publisher: string // e.g., "UK Companies House"
  url: string // Official registry URL
  retrieved_at: string // ISO 8601 timestamp
  terms?: string // Terms of use URL
  license?: string // Data license
}

// =====================================================
// API Response Types
// =====================================================

export interface OpenCorporatesAPIResponse<T> {
  api_version: string
  results: T
}

export interface OpenCorporatesCompanyResponse {
  company: OpenCorporatesCompany
}

export interface OpenCorporatesSearchResponse {
  companies: OpenCorporatesSearchResult[]
  page: number
  per_page: number
  total_pages: number
  total_count: number
}

export interface OpenCorporatesSearchResult {
  company: Partial<OpenCorporatesCompany> & {
    company_number: string
    jurisdiction_code: string
    name: string
    current_status?: string
    opencorporates_url: string
  }
}

export interface OpenCorporatesOfficersResponse {
  officers: OpenCorporatesOfficer[]
  total_count?: number
  page?: number
  per_page?: number
}

export interface OpenCorporatesFilingsResponse {
  filings: OpenCorporatesFiling[]
  total_count?: number
  page?: number
  per_page?: number
}

export interface OpenCorporatesErrorResponse {
  error: {
    message: string
    code?: string
    status?: number
  }
}

// =====================================================
// Search & Query Parameters
// =====================================================

export interface OpenCorporatesSearchParams {
  q?: string // Search query
  jurisdiction_code?: string | string[] // Filter by jurisdiction
  company_type?: string
  current_status?: string
  created_since?: string // ISO 8601 date
  branch?: 'F' | 'L' | 'home'
  nonprofit?: boolean
  order?: 'score' | 'incorporation_date' | 'alphabetic'
  page?: number
  per_page?: number // Max 100
  sparse?: boolean // Reduce response size
}

export interface OpenCorporatesCompanyParams {
  sparse?: boolean // Reduce response size
  fields?: string[] // Specific fields to include
}

// =====================================================
// Jurisdiction Types
// =====================================================

export interface OpenCorporatesJurisdiction {
  code: string // e.g., "gb", "us_de"
  name: string // e.g., "United Kingdom", "Delaware, United States"
  country_name: string
  country_code: string // ISO 2-letter
  company_count?: number
  opencorporates_url: string
}

// =====================================================
// Cache & Local Storage Types
// =====================================================

export interface OpenCorporatesCacheEntry {
  id: string
  jurisdiction_code: string
  company_number: string
  company_data: OpenCorporatesCompany
  fetched_at: Date
  expires_at: Date
  created_at: Date
  updated_at: Date
}

export interface OpenCorporatesAPIUsage {
  id: string
  endpoint: string
  jurisdiction_code?: string
  company_number?: string
  response_status: number
  response_time_ms: number
  cache_hit: boolean
  error_message?: string
  created_at: Date
}

// =====================================================
// Rate Limiting Types
// =====================================================

export interface OpenCorporatesRateLimitConfig {
  requestsPerMonth: number // Free tier: 200
  requestsPerDay: number // Free tier: 50
  cacheTTLDays: number // Default: 30
}

export interface OpenCorporatesRateLimitState {
  monthlyRequests: number
  dailyRequests: number
  monthResetDate: Date
  dayResetDate: Date
}

// =====================================================
// Data Mapping Types
// =====================================================

/**
 * Maps OpenCorporates company data to oppspot businesses table format
 */
export interface OpenCorporatesToBusinessMapping {
  // Base fields
  name: string
  slug: string
  description?: string
  address: OpenCorporatesAddress | null
  latitude?: number
  longitude?: number
  location?: string // PostGIS POINT
  phone_numbers: string[]
  emails: string[]
  website?: string

  // Companies House compatible fields
  company_number: string
  company_status: string
  company_type: string
  incorporation_date?: string
  dissolution_date?: string
  registered_office_address: OpenCorporatesAddress | null
  sic_codes: string[]
  officers: OpenCorporatesOfficer[]
  filing_history: OpenCorporatesFiling[]

  // OpenCorporates specific fields
  oc_jurisdiction_code: string
  oc_uid: string
  oc_data: OpenCorporatesCompany
  oc_last_updated: Date
  previous_names: OpenCorporatesPreviousName[]
  beneficial_owners: OpenCorporatesBeneficialOwner[]
  registry_url?: string

  // Metadata
  data_source: 'opencorporates'
  data_sources: {
    opencorporates: {
      last_updated: Date
      uid: string
      jurisdiction: string
    }
  }
  cache_expires_at: Date
}

// =====================================================
// Error Types
// =====================================================

export class OpenCorporatesError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'OpenCorporatesError'
  }
}

export class OpenCorporatesRateLimitError extends OpenCorporatesError {
  constructor(
    message: string = 'OpenCorporates API rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
    this.name = 'OpenCorporatesRateLimitError'
  }
}

export class OpenCorporatesNotFoundError extends OpenCorporatesError {
  constructor(
    jurisdiction: string,
    companyNumber: string
  ) {
    super(
      `Company not found: ${companyNumber} in ${jurisdiction}`,
      'NOT_FOUND',
      404,
      { jurisdiction, companyNumber }
    )
    this.name = 'OpenCorporatesNotFoundError'
  }
}

// =====================================================
// Utility Types
// =====================================================

export type OpenCorporatesCompanyStatus =
  | 'Active'
  | 'Dissolved'
  | 'In Liquidation'
  | 'In Administration'
  | 'Inactive'
  | 'Receivership'
  | 'Converted / Closed'
  | 'Merged'
  | 'Unknown'

export type OpenCorporatesOfficerPosition =
  | 'director'
  | 'secretary'
  | 'member'
  | 'llp-member'
  | 'chairman'
  | 'ceo'
  | 'cfo'
  | 'president'
  | 'treasurer'
  | 'agent'
  | 'other'

// =====================================================
// Helper Functions Types
// =====================================================

export interface OpenCorporatesHelpers {
  /**
   * Extracts SIC codes from industry_codes array
   */
  extractSICCodes(industryCodes?: OpenCorporatesIndustryCode[]): string[]

  /**
   * Extracts NAICS codes from industry_codes array
   */
  extractNAICSCodes(industryCodes?: OpenCorporatesIndustryCode[]): string[]

  /**
   * Maps OpenCorporates address to oppspot format
   */
  mapAddress(ocAddress?: OpenCorporatesAddress): OpenCorporatesAddress | null

  /**
   * Generates jurisdiction display name
   */
  getJurisdictionName(code: string): string

  /**
   * Checks if company is active
   */
  isCompanyActive(status: string): boolean

  /**
   * Formats officer name for display
   */
  formatOfficerName(name: string): string
}
