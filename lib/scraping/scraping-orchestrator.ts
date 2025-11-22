/**
 * Scraping Orchestrator
 * Main service for managing company data scraping jobs
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { WebsiteScraper } from './providers/website-scraper';
import { AIDataNormalizer } from './ai-normalizer';
import { discoverCompanyWebsite } from './website-discovery';
import type {
  ScrapingJobRequest,
  ScrapingJob,
  ScrapedData,
  ScrapingResult,
  NormalizedCompanyData,
} from './types';

export class ScrapingOrchestrator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new scraping job
   */
  async createJob(request: ScrapingJobRequest): Promise<ScrapingJob> {
    const { data, error } = await this.supabase
      .from('scraping_jobs')
      .insert({
        user_id: request.user_id,
        company_name: request.company_name,
        company_identifier: request.company_website || request.company_number,
        providers: request.providers,
        priority: request.priority || 'normal',
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create scraping job: ${error.message}`);
    }

    return data as ScrapingJob;
  }

  /**
   * Execute a scraping job
   */
  async executeJob(jobId: string): Promise<void> {
    // Update status to in_progress
    await this.updateJobStatus(jobId, 'in_progress');

    try {
      // Get job details
      const job = await this.getJob(jobId);

      if (!job) {
        throw new Error('Job not found');
      }

      // Execute scraping for each provider
      const scrapedResults: ScrapingResult[] = [];

      for (const provider of job.providers) {
        try {
          const result = await this.scrapeFromProvider(provider, job);
          scrapedResults.push(result);

          // Save scraped data
          await this.saveScrapedData(jobId, provider, result);
        } catch (error) {
          console.error(
            `[ScrapingOrchestrator] Failed to scrape from ${provider}:`,
            error
          );
          // Continue with other providers
        }
      }

      // Normalize data using AI (skip if API key not configured)
      let normalizedData: NormalizedCompanyData;
      try {
        normalizedData = await this.normalizeWithAI(
          job.company_name,
          scrapedResults,
          job.user_id
        );
      } catch (aiError) {
        console.warn('[ScrapingOrchestrator] AI normalization failed, using basic extraction:', aiError);
        // Fallback to basic normalization without AI
        normalizedData = this.basicNormalization(job.company_name, scrapedResults);
      }

      // Update or create business record
      await this.upsertBusiness(job.company_name, normalizedData, scrapedResults);

      // Update job status to completed
      await this.updateJobStatus(jobId, 'completed');
    } catch (error) {
      console.error('[ScrapingOrchestrator] Job execution failed:', error);

      // Increment retry count
      const job = await this.getJob(jobId);
      if (job && job.retry_count < job.max_retries) {
        await this.supabase
          .from('scraping_jobs')
          .update({
            status: 'pending',
            retry_count: job.retry_count + 1,
            error_message: (error as Error).message,
          })
          .eq('id', jobId);
      } else {
        await this.updateJobStatus(jobId, 'failed', (error as Error).message);
      }

      throw error;
    }
  }

  /**
   * Scrape data from a specific provider
   */
  private async scrapeFromProvider(
    provider: string,
    job: ScrapingJob
  ): Promise<ScrapingResult> {
    switch (provider) {
      case 'website':
        return await this.scrapeWebsite(job);

      case 'companies_house':
        return await this.scrapeCompaniesHouse(job);

      // Add more providers here
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Scrape company website
   */
  private async scrapeWebsite(job: ScrapingJob): Promise<ScrapingResult> {
    let website = job.company_identifier;

    // If no website provided, try to discover it
    if (!website) {
      console.log(`[ScrapingOrchestrator] No website provided, attempting discovery for "${job.company_name}"`);

      const discoveryResult = await discoverCompanyWebsite(job.company_name);

      if (discoveryResult.website) {
        website = discoveryResult.website;
        console.log(`[ScrapingOrchestrator] Discovered website: ${website} (method: ${discoveryResult.method}, confidence: ${discoveryResult.confidence})`);

        // Update job with discovered website
        await this.supabase
          .from('scraping_jobs')
          .update({
            company_identifier: website,
            metadata: {
              ...job.metadata,
              discovered_website: true,
              discovery_method: discoveryResult.method,
              discovery_confidence: discoveryResult.confidence,
              attempted_urls: discoveryResult.attempted,
            },
          })
          .eq('id', job.id);
      } else {
        throw new Error(
          `No website found for "${job.company_name}". Attempted: ${discoveryResult.attempted.join(', ')}`
        );
      }
    }

    const scraper = new WebsiteScraper(website);
    const results = await scraper.scrapeAll();

    // Combine results
    const combinedData = results.reduce(
      (acc, result) => {
        if (result.success && result.data) {
          return { ...acc, ...result.data };
        }
        return acc;
      },
      {} as Record<string, unknown>
    );

    const hasData = Object.keys(combinedData).length > 0;

    return {
      success: hasData,
      data: combinedData,
      error: hasData ? undefined : 'No data scraped from website',
      confidence: hasData ? 'medium' : 'low',
      source_url: website,
      scraped_at: new Date().toISOString(),
      metadata: { provider: 'website' },
    };
  }

  /**
   * Scrape Companies House
   */
  private async scrapeCompaniesHouse(job: ScrapingJob): Promise<ScrapingResult> {
    // This would integrate with Companies House API
    // For now, return a placeholder
    return {
      success: false,
      error: 'Companies House integration not yet implemented',
      confidence: 'low',
      source_url: 'https://api.companieshouse.gov.uk',
      scraped_at: new Date().toISOString(),
      metadata: { provider: 'companies_house' },
    };
  }

  /**
   * Normalize data using AI
   */
  private async normalizeWithAI(
    companyName: string,
    results: ScrapingResult[],
    userId: string
  ): Promise<NormalizedCompanyData> {
    const normalizer = new AIDataNormalizer(userId);
    return await normalizer.normalizeData(companyName, results);
  }

  /**
   * Save scraped data
   */
  private async saveScrapedData(
    jobId: string,
    provider: string,
    result: ScrapingResult
  ): Promise<void> {
    await this.supabase.from('scraped_data').insert({
      job_id: jobId,
      provider,
      data_type: 'company_profile',
      raw_data: result.data || {},
      confidence: result.confidence,
      source_url: result.source_url,
      scraped_at: result.scraped_at,
    });
  }

  /**
   * Upsert business record with scraped data
   */
  private async upsertBusiness(
    companyName: string,
    normalizedData: NormalizedCompanyData,
    results: ScrapingResult[]
  ): Promise<void> {
    const { data: existing } = await this.supabase
      .from('businesses')
      .select('id')
      .ilike('name', companyName)
      .single();

    const businessData = {
      name: normalizedData.name || companyName,
      company_number: normalizedData.company_number,
      website: normalizedData.website,
      description: normalizedData.description,
      industry: normalizedData.industry,
      enriched_data: normalizedData,
      last_scraped_at: new Date().toISOString(),
      scraping_confidence: normalizedData.confidence_score,
      data_sources: results.map((r) => r.metadata?.provider || 'website'),
    };

    if (existing) {
      // Update existing
      await this.supabase
        .from('businesses')
        .update(businessData)
        .eq('id', existing.id);
    } else {
      // Create new
      await this.supabase.from('businesses').insert(businessData);
    }
  }

  /**
   * Basic normalization without AI (fallback)
   */
  private basicNormalization(
    companyName: string,
    results: ScrapingResult[]
  ): NormalizedCompanyData {
    // Extract basic data from raw scraping results
    const successfulResults = results.filter((r) => r.success && r.data);

    // Combine all data
    const combinedData = successfulResults.reduce(
      (acc, result) => ({ ...acc, ...result.data }),
      {} as Record<string, unknown>
    );

    return {
      name: companyName,
      website: combinedData.website || undefined,
      description: combinedData.description || undefined,
      industry: combinedData.industry || undefined,
      confidence_score: 50, // Medium confidence for basic extraction
      data_sources: results.map((r) => r.metadata?.provider || 'website') as any[],
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get job details
   */
  private async getJob(jobId: string): Promise<ScrapingJob | null> {
    const { data } = await this.supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    return data as ScrapingJob | null;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.supabase
      .from('scraping_jobs')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
