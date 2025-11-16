/**
 * Data Source Factory for ResearchGPT™
 *
 * Orchestrates parallel data fetching from multiple sources:
 * - Companies House (official company data)
 * - News API (press releases, announcements)
 * - Reed.co.uk (job postings)
 * - Company website (team info, announcements)
 *
 * Implements graceful degradation: if one source fails, others continue.
 * Target: Complete data collection in <20 seconds for 95% of requests.
 */

import { getCompaniesHouseDataSource } from './companies-house-source';
import { getNewsAPIDataSource } from './news-source';
import { getReedJobsDataSource } from './jobs-source';
import { getWebsiteScraper } from './website-scraper';

import type {
  CompanySnapshot,
  BuyingSignal,
  DecisionMaker,
  RevenueSignal,
  Source,
} from '@/types/research-gpt';

import type { CompaniesHouseData } from './companies-house-source';
import type { NewsData } from './news-source';
import type { JobsData } from './jobs-source';
import type { WebsiteData } from './website-scraper';

// ============================================================================
// TYPES
// ============================================================================

export interface AggregatedResearchData {
  snapshot: Partial<CompanySnapshot>;
  buying_signals: BuyingSignal[];
  decision_makers: DecisionMaker[];
  revenue_signals: RevenueSignal[];
  sources: Source[];
  metadata: {
    sources_fetched: string[];
    sources_failed: string[];
    fetch_duration_ms: number;
    data_freshness: string;
  };
}

export interface DataSourceOptions {
  company_number: string;
  company_name: string;
  website_url?: string;
  force_refresh?: boolean;
}

// ============================================================================
// DATA SOURCE FACTORY
// ============================================================================

export class DataSourceFactory {
  private companiesHouse = getCompaniesHouseDataSource();
  private newsAPI = getNewsAPIDataSource();
  private reedJobs = getReedJobsDataSource();
  private websiteScraper = getWebsiteScraper();

  /**
   * Fetch data from all sources in parallel
   */
  async fetchAllSources(options: DataSourceOptions): Promise<AggregatedResearchData> {
    const startTime = Date.now();
    const sourcesFetched: string[] = [];
    const sourcesFailed: string[] = [];

    console.log(`[DataSourceFactory] Starting data collection for ${options.company_name}...`);

    // Fetch all sources in parallel with individual error handling
    const [companiesHouseData, newsData, jobsData, websiteData] = await Promise.allSettled([
      this.fetchCompaniesHouseData(options),
      this.fetchNewsData(options),
      this.fetchJobsData(options),
      this.fetchWebsiteData(options),
    ]) as [
      PromiseSettledResult<CompaniesHouseData>,
      PromiseSettledResult<NewsData>,
      PromiseSettledResult<JobsData>,
      PromiseSettledResult<WebsiteData>
    ];

    // Process results
    let snapshot: Partial<CompanySnapshot> = {};
    let buying_signals: BuyingSignal[] = [];
    let decision_makers: DecisionMaker[] = [];
    const revenue_signals: RevenueSignal[] = [];
    let sources: Source[] = [];

    // Companies House
    if (companiesHouseData.status === 'fulfilled' && companiesHouseData.value) {
      sourcesFetched.push('Companies House');
      const data = companiesHouseData.value;
      snapshot = { ...snapshot, ...data.snapshot };
      buying_signals.push(...data.buying_signals);
      decision_makers.push(...data.decision_makers);
      revenue_signals.push(...data.revenue_signals);
      sources.push(...data.sources);
    } else {
      sourcesFailed.push('Companies House');
      console.error('[DataSourceFactory] Companies House fetch failed:', companiesHouseData);
    }

    // News API
    if (newsData.status === 'fulfilled' && newsData.value) {
      sourcesFetched.push('News API');
      const data = newsData.value;
      buying_signals.push(...data.buying_signals);
      sources.push(...data.sources);
    } else {
      sourcesFailed.push('News API');
      console.warn('[DataSourceFactory] News API fetch failed (non-critical)');
    }

    // Reed Jobs
    if (jobsData.status === 'fulfilled' && jobsData.value) {
      sourcesFetched.push('Reed Jobs API');
      const data = jobsData.value;
      buying_signals.push(...data.buying_signals);
      sources.push(...data.sources);
    } else {
      sourcesFailed.push('Reed Jobs API');
      console.warn('[DataSourceFactory] Reed Jobs fetch failed (non-critical)');
    }

    // Website Scraper
    if (websiteData.status === 'fulfilled' && websiteData.value) {
      sourcesFetched.push('Company Website');
      const data = websiteData.value;
      if (data.company_description) {
        snapshot.description = data.company_description;
      }
      if (data.technology_stack) {
        snapshot.tech_stack = data.technology_stack.map((tech) => ({
          technology: tech,
          category: 'Unknown',
          detected_at: new Date().toISOString(),
        }));
      }
      decision_makers.push(...data.decision_makers);
      buying_signals.push(...data.buying_signals);
      sources.push(...data.sources);
    } else {
      sourcesFailed.push('Company Website');
      console.warn('[DataSourceFactory] Website scraping failed (non-critical)');
    }

    // Deduplicate and sort
    buying_signals = this.deduplicateBuyingSignals(buying_signals);
    decision_makers = this.deduplicateDecisionMakers(decision_makers);
    sources = this.deduplicateSources(sources);

    const fetchDuration = Date.now() - startTime;

    console.log(`[DataSourceFactory] Completed in ${fetchDuration}ms`);
    console.log(`[DataSourceFactory] Sources: ${sourcesFetched.length} succeeded, ${sourcesFailed.length} failed`);
    console.log(`[DataSourceFactory] Data: ${buying_signals.length} signals, ${decision_makers.length} decision makers, ${sources.length} sources`);

    return {
      snapshot,
      buying_signals,
      decision_makers,
      revenue_signals,
      sources,
      metadata: {
        sources_fetched: sourcesFetched,
        sources_failed: sourcesFailed,
        fetch_duration_ms: fetchDuration,
        data_freshness: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // INDIVIDUAL SOURCE FETCHERS
  // ============================================================================

  /**
   * Fetch Companies House data with timeout
   */
  private async fetchCompaniesHouseData(options: DataSourceOptions) {
    try {
      const data = await Promise.race([
        this.companiesHouse.fetchCompanyData(options.company_number),
        this.timeout(10000, 'Companies House'),
      ]);
      return data;
    } catch (error) {
      console.error('[DataSourceFactory] Companies House error:', error);
      throw error;
    }
  }

  /**
   * Fetch News API data with timeout
   */
  private async fetchNewsData(options: DataSourceOptions) {
    try {
      const data = await Promise.race([
        this.newsAPI.fetchCompanyNews(options.company_name, { pageSize: 20 }),
        this.timeout(8000, 'News API'),
      ]);
      return data;
    } catch (error) {
      console.error('[DataSourceFactory] News API error:', error);
      // Return empty data instead of throwing (graceful degradation)
      return { buying_signals: [], sources: [] };
    }
  }

  /**
   * Fetch Reed Jobs data with timeout
   */
  private async fetchJobsData(options: DataSourceOptions) {
    try {
      const data = await Promise.race([
        this.reedJobs.fetchCompanyJobs(options.company_name, 50),
        this.timeout(8000, 'Reed Jobs'),
      ]);
      return data;
    } catch (error) {
      console.error('[DataSourceFactory] Reed Jobs error:', error);
      // Return empty data
      return { buying_signals: [], sources: [], job_count: 0, departments_hiring: [] };
    }
  }

  /**
   * Fetch website data with timeout
   */
  private async fetchWebsiteData(options: DataSourceOptions) {
    if (!options.website_url) {
      console.log('[DataSourceFactory] No website URL provided, skipping website scraping');
      return { decision_makers: [], buying_signals: [], sources: [] };
    }

    try {
      const data = await Promise.race([
        this.websiteScraper.scrapeCompanyWebsite(options.website_url),
        this.timeout(15000, 'Website Scraper'),
      ]);
      return data;
    } catch (error) {
      console.error('[DataSourceFactory] Website scraper error:', error);
      // Return empty data
      return { decision_makers: [], buying_signals: [], sources: [] };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Timeout promise helper
   */
  private timeout<T>(ms: number, sourceName: string): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${sourceName} timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Deduplicate buying signals by title similarity
   */
  private deduplicateBuyingSignals(signals: BuyingSignal[]): BuyingSignal[] {
    const seen = new Map<string, BuyingSignal>();

    for (const signal of signals) {
      // Create fingerprint from type + normalized title
      const normalizedTitle = signal.title.toLowerCase().substring(0, 50);
      const key = `${signal.signal_type}:${normalizedTitle}`;

      // Keep the one with higher relevance score
      const existing = seen.get(key);
      if (!existing || (signal.relevance_score || 0) > (existing.relevance_score || 0)) {
        seen.set(key, signal);
      }
    }

    // Sort by relevance and recency
    return Array.from(seen.values())
      .sort((a, b) => {
        const scoreA = (a.relevance_score || 0.5) * this.calculateRecencyWeight(a.detected_date);
        const scoreB = (b.relevance_score || 0.5) * this.calculateRecencyWeight(b.detected_date);
        return scoreB - scoreA;
      })
      .slice(0, 20); // Top 20 signals
  }

  /**
   * Deduplicate decision makers by name
   */
  private deduplicateDecisionMakers(makers: DecisionMaker[]): DecisionMaker[] {
    const seen = new Map<string, DecisionMaker>();

    for (const maker of makers) {
      const key = maker.name.toLowerCase().trim();

      // Keep the one with more information
      const existing = seen.get(key);
      if (!existing || this.countFilledFields(maker) > this.countFilledFields(existing)) {
        seen.set(key, maker);
      }
    }

    // Sort by influence score
    return Array.from(seen.values())
      .sort((a, b) => (b.influence_score || 0) - (a.influence_score || 0))
      .slice(0, 15); // Top 15 decision makers
  }

  /**
   * Deduplicate sources by URL
   */
  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Map<string, Source>();

    for (const source of sources) {
      if (!seen.has(source.url)) {
        seen.set(source.url, source);
      }
    }

    // Sort by reliability
    return Array.from(seen.values())
      .sort((a, b) => (b.reliability_score || 0) - (a.reliability_score || 0))
      .slice(0, 25); // Top 25 sources
  }

  /**
   * Calculate recency weight (newer = higher weight)
   */
  private calculateRecencyWeight(dateString: string): number {
    try {
      const date = new Date(dateString);
      const ageMonths = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (ageMonths < 1) return 1.0; // Last month = full weight
      if (ageMonths < 3) return 0.9; // Last 3 months
      if (ageMonths < 6) return 0.7; // Last 6 months
      return 0.5; // Older
    } catch {
      return 0.5;
    }
  }

  /**
   * Count filled fields in decision maker
   */
  private countFilledFields(maker: DecisionMaker): number {
    let count = 0;
    if (maker.job_title) count++;
    if (maker.department) count++;
    if (maker.business_email) count++;
    if (maker.phone_number) count++;
    if (maker.linkedin_url) count++;
    if (maker.appointed_date) count++;
    return count;
  }

  /**
   * Fetch specific data source only (for testing/debugging)
   */
  async fetchSingleSource(
    source: 'companies_house' | 'news' | 'jobs' | 'website',
    options: DataSourceOptions
  ): Promise<CompaniesHouseData | NewsData | JobsData | WebsiteData> {
    switch (source) {
      case 'companies_house':
        return this.fetchCompaniesHouseData(options);
      case 'news':
        return this.fetchNewsData(options);
      case 'jobs':
        return this.fetchJobsData(options);
      case 'website':
        return this.fetchWebsiteData(options);
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  /**
   * Check which data sources are available
   */
  checkAvailableSources(): { [key: string]: boolean } {
    return {
      companies_house: !!process.env.COMPANIES_HOUSE_API_KEY,
      news: !!process.env.NEWS_API_KEY,
      jobs: !!process.env.REED_API_KEY,
      website: true, // Always available (uses Cheerio, no API key needed)
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: DataSourceFactory | null = null;

export function getDataSourceFactory(): DataSourceFactory {
  if (!instance) {
    instance = new DataSourceFactory();
  }
  return instance;
}

export default DataSourceFactory;
