/**
 * OpenCorporates API Adapter
 *
 * Free API for company data from 130+ jurisdictions worldwide
 *
 * API Documentation: https://api.opencorporates.com/documentation/API-Reference
 *
 * Free Tier Limits:
 * - 500 requests per month
 * - 200 requests per day
 * - Rate limit: 1 request per second
 *
 * Coverage: 23M+ companies from 130+ jurisdictions
 *
 * Usage:
 *   const adapter = new OpenCorporatesAdapter();
 *   const results = await adapter.searchCompanies('tech startup', { jurisdiction_code: 'us_ca' });
 */

import { z } from 'zod';

// Environment variable for API key (optional - works without but has lower limits)
const OPENCORPORATES_API_KEY = process.env.OPENCORPORATES_API_KEY;

// Base URL for OpenCorporates API
const BASE_URL = 'https://api.opencorporates.com/v0.4';

/**
 * OpenCorporates company schema
 */
const OpenCorporatesCompanySchema = z.object({
  name: z.string(),
  company_number: z.string(),
  jurisdiction_code: z.string(),
  incorporation_date: z.string().nullable().optional(),
  dissolution_date: z.string().nullable().optional(),
  company_type: z.string().nullable().optional(),
  registry_url: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  current_status: z.string().nullable().optional(),
  registered_address_in_full: z.string().nullable().optional(),
  retrieved_at: z.string().nullable().optional(),
  opencorporates_url: z.string(),
});

export type OpenCorporatesCompany = z.infer<typeof OpenCorporatesCompanySchema>;

/**
 * OpenCorporates search response
 */
const OpenCorporatesSearchResponseSchema = z.object({
  results: z.object({
    companies: z.array(
      z.object({
        company: OpenCorporatesCompanySchema,
      })
    ),
    total_count: z.number(),
    page: z.number(),
    per_page: z.number(),
  }),
});

/**
 * OpenCorporates company detail response
 */
const OpenCorporatesCompanyDetailSchema = z.object({
  results: z.object({
    company: OpenCorporatesCompanySchema.extend({
      // Additional fields available in detail view
      previous_names: z.array(
        z.object({
          company_name: z.string(),
          start_date: z.string().nullable(),
          end_date: z.string().nullable(),
        })
      ).optional(),
      alternative_names: z.array(
        z.object({
          company_name: z.string(),
          type: z.string(),
        })
      ).optional(),
      registered_address: z.object({
        street_address: z.string().nullable().optional(),
        locality: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        postal_code: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      }).optional(),
      industry_codes: z.array(
        z.object({
          industry_code: z.object({
            code: z.string(),
            description: z.string().nullable().optional(),
            code_scheme_name: z.string(),
          }),
        })
      ).optional(),
      officers: z.array(
        z.object({
          officer: z.object({
            name: z.string(),
            position: z.string().nullable().optional(),
            start_date: z.string().nullable().optional(),
            end_date: z.string().nullable().optional(),
          }),
        })
      ).optional(),
    }),
  }),
});

export type OpenCorporatesCompanyDetail = z.infer<typeof OpenCorporatesCompanyDetailSchema>['results']['company'];

/**
 * Search options for OpenCorporates
 */
export interface OpenCorporatesSearchOptions {
  jurisdiction_code?: string; // e.g., 'us_ca', 'gb', 'ie'
  current_status?: 'active' | 'inactive' | 'all';
  company_type?: string;
  branch?: boolean;
  per_page?: number; // 1-100, default 30
  page?: number;
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  private lastCallTime = 0;
  private minInterval = 1000; // 1 second between calls

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }
}

/**
 * OpenCorporates API Adapter
 */
export class OpenCorporatesAdapter {
  private rateLimiter = new RateLimiter();
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || OPENCORPORATES_API_KEY;
  }

  /**
   * Build API URL with authentication
   */
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(`${BASE_URL}${endpoint}`);

    // Add API key if available
    if (this.apiKey) {
      url.searchParams.set('api_token', this.apiKey);
    }

    // Add other params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Make API request with rate limiting
   */
  private async request<T>(url: string): Promise<T> {
    await this.rateLimiter.wait();

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenCorporates API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Search for companies
   */
  async searchCompanies(
    query: string,
    options: OpenCorporatesSearchOptions = {}
  ): Promise<{
    companies: OpenCorporatesCompany[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const {
      jurisdiction_code,
      current_status,
      company_type,
      branch,
      per_page = 30,
      page = 1,
    } = options;

    const params: Record<string, any> = {
      q: query,
      per_page,
      page,
    };

    if (jurisdiction_code) params.jurisdiction_code = jurisdiction_code;
    if (current_status && current_status !== 'all') params.current_status = current_status;
    if (company_type) params.company_type = company_type;
    if (branch !== undefined) params.branch = branch;

    const url = this.buildUrl('/companies/search', params);
    const data = await this.request<z.infer<typeof OpenCorporatesSearchResponseSchema>>(url);

    const parsed = OpenCorporatesSearchResponseSchema.parse(data);

    return {
      companies: parsed.results.companies.map(c => c.company),
      total: parsed.results.total_count,
      page: parsed.results.page,
      perPage: parsed.results.per_page,
    };
  }

  /**
   * Get company details by jurisdiction and company number
   */
  async getCompanyDetail(
    jurisdictionCode: string,
    companyNumber: string
  ): Promise<OpenCorporatesCompanyDetail> {
    const url = this.buildUrl(`/companies/${jurisdictionCode}/${companyNumber}`);
    const data = await this.request<z.infer<typeof OpenCorporatesCompanyDetailSchema>>(url);

    const parsed = OpenCorporatesCompanyDetailSchema.parse(data);
    return parsed.results.company;
  }

  /**
   * Get list of available jurisdictions
   */
  async getJurisdictions(): Promise<
    Array<{
      code: string;
      name: string;
      country_code: string;
    }>
  > {
    const url = this.buildUrl('/jurisdictions');
    const data = await this.request<any>(url);

    return data.results.jurisdictions.map((j: any) => ({
      code: j.jurisdiction.code,
      name: j.jurisdiction.name,
      country_code: j.jurisdiction.country_code,
    }));
  }

  /**
   * Convert ISO country code to OpenCorporates jurisdiction code
   *
   * Examples:
   * - GB -> gb
   * - US -> us (for federal), us_ca (for California), etc.
   * - DE -> de
   */
  static getJurisdictionCode(countryCode: string, region?: string): string {
    const code = countryCode.toLowerCase();

    // US has state-level jurisdictions
    if (code === 'us' && region) {
      return `us_${region.toLowerCase()}`;
    }

    // UK uses 'gb'
    if (code === 'uk') return 'gb';

    return code;
  }

  /**
   * Extract industry codes and map to standard classifications
   */
  extractIndustryCodes(company: OpenCorporatesCompanyDetail): Array<{
    code: string;
    description: string;
    scheme: string;
  }> {
    if (!company.industry_codes) return [];

    return company.industry_codes.map(ic => ({
      code: ic.industry_code.code,
      description: ic.industry_code.description || '',
      scheme: ic.industry_code.code_scheme_name,
    }));
  }

  /**
   * Extract officers (directors, executives)
   */
  extractOfficers(company: OpenCorporatesCompanyDetail): Array<{
    name: string;
    position: string;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  }> {
    if (!company.officers) return [];

    return company.officers.map(o => ({
      name: o.officer.name,
      position: o.officer.position || 'Officer',
      startDate: o.officer.start_date || null,
      endDate: o.officer.end_date || null,
      isActive: !o.officer.end_date,
    }));
  }

  /**
   * Transform OpenCorporates company to our standard format
   */
  transformToStandardFormat(
    company: OpenCorporatesCompany | OpenCorporatesCompanyDetail
  ): {
    name: string;
    registrationNumber: string;
    country: string;
    region?: string;
    status: string;
    incorporationDate: string | null;
    companyType: string | null;
    address: string | null;
    sourceUrl: string;
  } {
    // Extract country and region from jurisdiction code
    // Format: 'us_ca' -> country: 'us', region: 'ca'
    const [country, region] = company.jurisdiction_code.split('_');

    return {
      name: company.name,
      registrationNumber: company.company_number,
      country: country.toUpperCase(),
      region: region?.toUpperCase(),
      status: company.current_status || 'Unknown',
      incorporationDate: company.incorporation_date || null,
      companyType: company.company_type || null,
      address: company.registered_address_in_full || null,
      sourceUrl: company.opencorporates_url,
    };
  }
}

/**
 * Helper: Get recommended jurisdictions for a country
 */
export function getRecommendedJurisdictions(countryCode: string): string[] {
  const code = countryCode.toUpperCase();

  // Map countries to their primary jurisdictions
  const jurisdictionMap: Record<string, string[]> = {
    US: ['us_de', 'us_ca', 'us_ny', 'us_fl', 'us_tx'], // Delaware, California, New York, Florida, Texas
    GB: ['gb'],
    IE: ['ie'],
    DE: ['de'],
    FR: ['fr'],
    IT: ['it'],
    ES: ['es'],
    NL: ['nl'],
    BE: ['be'],
    CH: ['ch'],
    SE: ['se'],
    NO: ['no'],
    DK: ['dk'],
    FI: ['fi'],
    CA: ['ca_bc', 'ca_on', 'ca_qc'], // British Columbia, Ontario, Quebec
    AU: ['au'],
    NZ: ['nz'],
    SG: ['sg'],
    HK: ['hk'],
    JP: ['jp'],
    KR: ['kr'],
    IN: ['in'],
    BR: ['br'],
    MX: ['mx'],
    AR: ['ar'],
    CL: ['cl'],
    ZA: ['za'],
  };

  return jurisdictionMap[code] || [code.toLowerCase()];
}

/**
 * Example usage:
 *
 * const adapter = new OpenCorporatesAdapter();
 *
 * // Search for companies in UK
 * const results = await adapter.searchCompanies('tech startup', {
 *   jurisdiction_code: 'gb',
 *   current_status: 'active',
 *   per_page: 50
 * });
 *
 * // Get company details
 * const company = await adapter.getCompanyDetail('gb', '12345678');
 *
 * // Transform to standard format
 * const standardFormat = adapter.transformToStandardFormat(company);
 */
