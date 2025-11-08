/**
 * SEC EDGAR API Adapter
 *
 * Free API for US public company data
 *
 * API Documentation: https://www.sec.gov/developer
 *
 * Features:
 * - Completely FREE - no API key required
 * - 10 requests per second rate limit
 * - Comprehensive financial data for all US public companies
 * - Real-time filings and disclosures
 *
 * Coverage:
 * - 30,000+ US public companies
 * - All SEC filings (10-K, 10-Q, 8-K, etc.)
 * - Company facts, financials, and officers
 *
 * Usage:
 *   const adapter = new SECEdgarAdapter('MyApp/1.0 (email@example.com)');
 *   const company = await adapter.getCompanyByCIK('0000320193'); // Apple Inc.
 */

import { z } from 'zod';

// Base URL for SEC EDGAR API
const BASE_URL = 'https://data.sec.gov';
const WWW_BASE_URL = 'https://www.sec.gov';

/**
 * SEC Company Information Schema
 */
const SECCompanySchema = z.object({
  cik: z.string(),
  entityType: z.string(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  insiderTransactionForOwnerExists: z.number().optional(),
  insiderTransactionForIssuerExists: z.number().optional(),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  ein: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  investorWebsite: z.string().optional(),
  category: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  stateOfIncorporation: z.string().optional(),
  stateOfIncorporationDescription: z.string().optional(),
  addresses: z.object({
    mailing: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
      stateOrCountryDescription: z.string().optional(),
    }).optional(),
    business: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
      stateOrCountryDescription: z.string().optional(),
    }).optional(),
  }).optional(),
  phone: z.string().optional(),
  flags: z.string().optional(),
  formerNames: z.array(
    z.object({
      name: z.string(),
      from: z.string(),
      to: z.string(),
    })
  ).optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      reportDate: z.array(z.string()).optional(),
      acceptanceDateTime: z.array(z.string()).optional(),
      act: z.array(z.string()).optional(),
      form: z.array(z.string()),
      fileNumber: z.array(z.string()).optional(),
      filmNumber: z.array(z.string()).optional(),
      items: z.array(z.string()).optional(),
      size: z.array(z.number()).optional(),
      isXBRL: z.array(z.number()).optional(),
      isInlineXBRL: z.array(z.number()).optional(),
      primaryDocument: z.array(z.string()).optional(),
      primaryDocDescription: z.array(z.string()).optional(),
    }),
    files: z.array(
      z.object({
        name: z.string(),
        filingCount: z.number(),
        filingFrom: z.string(),
        filingTo: z.string(),
      })
    ).optional(),
  }).optional(),
});

export type SECCompany = z.infer<typeof SECCompanySchema>;

/**
 * SEC Company Facts (Financial Data)
 */
const SECCompanyFactsSchema = z.object({
  cik: z.number(),
  entityName: z.string(),
  facts: z.record(
    z.string(), // taxonomy (e.g., 'us-gaap', 'dei')
    z.record(
      z.string(), // concept (e.g., 'Revenue', 'Assets')
      z.object({
        label: z.string(),
        description: z.string(),
        units: z.record(
          z.string(), // unit type (e.g., 'USD', 'shares')
          z.array(
            z.object({
              end: z.string(),
              val: z.number(),
              accn: z.string().optional(),
              fy: z.number().optional(),
              fp: z.string().optional(),
              form: z.string().optional(),
              filed: z.string().optional(),
              frame: z.string().optional(),
            })
          )
        ),
      })
    )
  ),
});

export type SECCompanyFacts = z.infer<typeof SECCompanyFactsSchema>;

/**
 * Rate limiter for SEC API (10 requests per second)
 */
class SECRateLimiter {
  private callTimes: number[] = [];
  private maxCallsPerSecond = 10;

  async wait(): Promise<void> {
    const now = Date.now();

    // Remove calls older than 1 second
    this.callTimes = this.callTimes.filter(time => now - time < 1000);

    // If we've hit the limit, wait
    if (this.callTimes.length >= this.maxCallsPerSecond) {
      const oldestCall = this.callTimes[0];
      const waitTime = 1000 - (now - oldestCall);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.callTimes.push(Date.now());
  }
}

/**
 * SEC EDGAR API Adapter
 */
export class SECEdgarAdapter {
  private rateLimiter = new SECRateLimiter();
  private userAgent: string;

  /**
   * @param userAgent - Required by SEC API. Format: "CompanyName AdminContact"
   *                    Example: "oppSpot support@oppspot.com"
   */
  constructor(userAgent: string) {
    if (!userAgent || !userAgent.includes(' ')) {
      throw new Error(
        'SEC API requires a User-Agent in format: "CompanyName AdminContact"'
      );
    }
    this.userAgent = userAgent;
  }

  /**
   * Make API request with rate limiting
   */
  private async request<T>(url: string): Promise<T> {
    await this.rateLimiter.wait();

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SEC API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Normalize CIK to 10-digit format with leading zeros
   */
  private normalizeCIK(cik: string | number): string {
    return String(cik).padStart(10, '0');
  }

  /**
   * Search for company by ticker symbol
   * Note: This uses the company tickers JSON file published by SEC
   */
  async searchByTicker(ticker: string): Promise<{
    cik: string;
    name: string;
    ticker: string;
    exchange: string;
  } | null> {
    const url = `${BASE_URL}/files/company_tickers.json`;
    const data = await this.request<Record<string, any>>(url);

    // Find matching ticker
    const tickerUpper = ticker.toUpperCase();
    const match = Object.values(data).find(
      (company: any) => company.ticker === tickerUpper
    );

    if (!match) return null;

    return {
      cik: this.normalizeCIK(match.cik_str),
      name: match.title,
      ticker: match.ticker,
      exchange: match.exchange || '',
    };
  }

  /**
   * Search for company by name
   */
  async searchByName(name: string): Promise<Array<{
    cik: string;
    name: string;
    ticker?: string;
  }>> {
    const url = `${BASE_URL}/files/company_tickers.json`;
    const data = await this.request<Record<string, any>>(url);

    const nameLower = name.toLowerCase();
    const matches = Object.values(data)
      .filter((company: any) =>
        company.title.toLowerCase().includes(nameLower)
      )
      .map((company: any) => ({
        cik: this.normalizeCIK(company.cik_str),
        name: company.title,
        ticker: company.ticker,
      }));

    return matches;
  }

  /**
   * Get company information by CIK
   */
  async getCompanyByCIK(cik: string | number): Promise<SECCompany> {
    const normalizedCIK = this.normalizeCIK(cik);
    const url = `${BASE_URL}/submissions/CIK${normalizedCIK}.json`;

    const data = await this.request<any>(url);

    return SECCompanySchema.parse({
      cik: normalizedCIK,
      entityType: data.entityType,
      sic: data.sic,
      sicDescription: data.sicDescription,
      insiderTransactionForOwnerExists: data.insiderTransactionForOwnerExists,
      insiderTransactionForIssuerExists: data.insiderTransactionForIssuerExists,
      name: data.name,
      tickers: data.tickers,
      exchanges: data.exchanges,
      ein: data.ein,
      description: data.description,
      website: data.website,
      investorWebsite: data.investorWebsite,
      category: data.category,
      fiscalYearEnd: data.fiscalYearEnd,
      stateOfIncorporation: data.stateOfIncorporation,
      stateOfIncorporationDescription: data.stateOfIncorporationDescription,
      addresses: data.addresses,
      phone: data.phone,
      flags: data.flags,
      formerNames: data.formerNames,
      filings: data.filings,
    });
  }

  /**
   * Get company financial facts
   */
  async getCompanyFacts(cik: string | number): Promise<SECCompanyFacts> {
    const normalizedCIK = this.normalizeCIK(cik);
    const url = `${BASE_URL}/api/xbrl/companyfacts/CIK${normalizedCIK}.json`;

    const data = await this.request<any>(url);
    return SECCompanyFactsSchema.parse(data);
  }

  /**
   * Get recent filings for a company
   */
  async getRecentFilings(
    cik: string | number,
    options: {
      formType?: string; // e.g., '10-K', '10-Q', '8-K'
      limit?: number;
    } = {}
  ): Promise<Array<{
    accessionNumber: string;
    filingDate: string;
    reportDate?: string;
    form: string;
    fileNumber?: string;
    primaryDocument?: string;
    description?: string;
    url: string;
  }>> {
    const { formType, limit = 10 } = options;
    const company = await this.getCompanyByCIK(cik);

    if (!company.filings?.recent) return [];

    const filings = [];
    const recent = company.filings.recent;

    for (let i = 0; i < recent.accessionNumber.length && filings.length < limit; i++) {
      const form = recent.form[i];

      // Filter by form type if specified
      if (formType && form !== formType) continue;

      const accessionNumber = recent.accessionNumber[i];
      const accessionNumberFormatted = accessionNumber.replace(/-/g, '');

      filings.push({
        accessionNumber,
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate?.[i],
        form,
        fileNumber: recent.fileNumber?.[i],
        primaryDocument: recent.primaryDocument?.[i],
        description: recent.primaryDocDescription?.[i],
        url: `${WWW_BASE_URL}/Archives/edgar/data/${company.cik}/${accessionNumberFormatted}/${recent.primaryDocument?.[i] || `${accessionNumber}.txt`}`,
      });
    }

    return filings;
  }

  /**
   * Extract key financial metrics
   */
  extractFinancialMetrics(facts: SECCompanyFacts): {
    revenue?: { value: number; period: string; date: string };
    netIncome?: { value: number; period: string; date: string };
    assets?: { value: number; period: string; date: string };
    liabilities?: { value: number; period: string; date: string };
    equity?: { value: number; period: string; date: string };
    cashAndEquivalents?: { value: number; period: string; date: string };
  } {
    const usGaap = facts.facts['us-gaap'];
    if (!usGaap) return {};

    const getLatestValue = (concept: string) => {
      const conceptData = usGaap[concept];
      if (!conceptData?.units?.USD) return undefined;

      const values = conceptData.units.USD;
      const latest = values[values.length - 1];

      if (!latest) return undefined;

      return {
        value: latest.val,
        period: latest.fp || '',
        date: latest.end,
      };
    };

    return {
      revenue: getLatestValue('Revenues') || getLatestValue('RevenueFromContractWithCustomerExcludingAssessedTax'),
      netIncome: getLatestValue('NetIncomeLoss'),
      assets: getLatestValue('Assets'),
      liabilities: getLatestValue('Liabilities'),
      equity: getLatestValue('StockholdersEquity'),
      cashAndEquivalents: getLatestValue('CashAndCashEquivalentsAtCarryingValue'),
    };
  }

  /**
   * Transform SEC company to our standard format
   */
  transformToStandardFormat(company: SECCompany): {
    name: string;
    registrationNumber: string;
    country: string;
    region?: string;
    status: string;
    incorporationDate: string | null;
    companyType: string;
    address: string | null;
    sourceUrl: string;
    website?: string;
    phone?: string;
    sic?: string;
    sicDescription?: string;
    tickers?: string[];
    exchanges?: string[];
  } {
    const businessAddress = company.addresses?.business;
    const mailingAddress = company.addresses?.mailing;
    const address = businessAddress || mailingAddress;

    let addressString = null;
    if (address) {
      const parts = [
        address.street1,
        address.street2,
        address.city,
        address.stateOrCountryDescription || address.stateOrCountry,
        address.zipCode,
      ].filter(Boolean);
      addressString = parts.join(', ');
    }

    return {
      name: company.name,
      registrationNumber: company.cik,
      country: 'US',
      region: company.stateOfIncorporation,
      status: 'Active', // SEC only has active companies
      incorporationDate: null, // Not available in SEC data
      companyType: company.entityType,
      address: addressString,
      sourceUrl: `${WWW_BASE_URL}/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}`,
      website: company.website,
      phone: company.phone,
      sic: company.sic,
      sicDescription: company.sicDescription,
      tickers: company.tickers,
      exchanges: company.exchanges,
    };
  }

  /**
   * Get SEC filing URL
   */
  getFilingUrl(cik: string | number, accessionNumber: string): string {
    const normalizedCIK = this.normalizeCIK(cik);
    const accessionNumberFormatted = accessionNumber.replace(/-/g, '');
    return `${WWW_BASE_URL}/cgi-bin/browse-edgar?action=getcompany&CIK=${normalizedCIK}&type=&dateb=&owner=exclude&count=100&search_text=`;
  }

  /**
   * Check if a company is a US public company (has SEC filings)
   */
  async isPublicCompany(identifier: string): Promise<boolean> {
    try {
      // Try as ticker first
      const tickerResult = await this.searchByTicker(identifier);
      if (tickerResult) return true;

      // Try as company name
      const nameResults = await this.searchByName(identifier);
      return nameResults.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Helper: Get US state code from state name
 */
export function getStateCode(stateName: string): string | null {
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY',
  };

  return stateMap[stateName.toLowerCase()] || null;
}

/**
 * Example usage:
 *
 * const adapter = new SECEdgarAdapter('oppSpot support@oppspot.com');
 *
 * // Search by ticker
 * const apple = await adapter.searchByTicker('AAPL');
 *
 * // Get company details
 * const company = await adapter.getCompanyByCIK(apple.cik);
 *
 * // Get financial data
 * const facts = await adapter.getCompanyFacts(apple.cik);
 * const metrics = adapter.extractFinancialMetrics(facts);
 *
 * // Get recent 10-K filings
 * const filings = await adapter.getRecentFilings(apple.cik, {
 *   formType: '10-K',
 *   limit: 5
 * });
 */
