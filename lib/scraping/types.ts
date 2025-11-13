/**
 * Web Scraping Types
 * Type definitions for company data scraping system
 */

export type ScrapingProvider =
  | 'companies_house'
  | 'website'
  | 'linkedin'
  | 'crunchbase'
  | 'google_news'
  | 'angellist';

export type ScrapingStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rate_limited';

export type DataConfidence = 'high' | 'medium' | 'low';

/**
 * Scraping job request
 */
export interface ScrapingJobRequest {
  company_name: string;
  company_website?: string;
  company_number?: string; // Companies House number
  linkedin_url?: string;
  providers: ScrapingProvider[];
  priority?: 'high' | 'normal' | 'low';
  user_id: string;
}

/**
 * Scraping job record
 */
export interface ScrapingJob {
  id: string;
  user_id: string;
  company_name: string;
  company_identifier?: string; // Website, company number, or LinkedIn URL
  providers: ScrapingProvider[];
  status: ScrapingStatus;
  priority: 'high' | 'normal' | 'low';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Scraped data from a provider
 */
export interface ScrapedData {
  id: string;
  job_id: string;
  provider: ScrapingProvider;
  data_type: string; // 'company_profile', 'financials', 'team', 'news', etc.
  raw_data: Record<string, any>;
  normalized_data?: Record<string, any>;
  confidence: DataConfidence;
  source_url?: string;
  scraped_at: string;
  created_at: string;
}

/**
 * Normalized company data (AI-processed)
 */
export interface NormalizedCompanyData {
  // Basic Info
  name: string;
  legal_name?: string;
  company_number?: string;
  website?: string;
  description?: string;
  industry?: string;

  // Location
  headquarters?: {
    address?: string;
    city?: string;
    country?: string;
    postcode?: string;
  };

  // Size & Metrics
  employee_count?: number;
  employee_count_range?: string; // '1-10', '11-50', etc.
  revenue?: number;
  revenue_currency?: string;

  // Funding
  funding_total?: number;
  funding_currency?: string;
  last_funding_date?: string;
  last_funding_amount?: number;
  investors?: string[];

  // Tech Stack
  technologies?: string[];

  // Team
  key_people?: Array<{
    name: string;
    title: string;
    linkedin_url?: string;
  }>;

  // Contact
  email?: string;
  phone?: string;
  linkedin_url?: string;
  twitter_url?: string;

  // Metadata
  confidence_score: number; // 0-100
  data_sources: ScrapingProvider[];
  last_updated: string;
}

/**
 * Scraping configuration
 */
export interface ScrapingConfig {
  provider: ScrapingProvider;
  enabled: boolean;
  rate_limit_per_minute: number;
  timeout_ms: number;
  retry_attempts: number;
  priority: number; // Lower = higher priority
  requires_auth: boolean;
  api_key?: string;
}

/**
 * Website scraping targets
 */
export interface WebsiteScrapingTargets {
  about_page?: string;
  team_page?: string;
  contact_page?: string;
  products_page?: string;
  news_page?: string;
}

/**
 * Scraping result
 */
export interface ScrapingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  confidence: DataConfidence;
  source_url: string;
  scraped_at: string;
  metadata?: Record<string, any>;
}
