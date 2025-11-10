/**
 * Data Gatherer Service
 *
 * Gathers competitive intelligence data from multiple sources
 * Integrates with ResearchGPT infrastructure
 *
 * Target: <2 minutes for 10 competitors
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Timeout handling for web scraping and AI operations
 * - Graceful degradation on failures
 */

import { WebsiteScraper } from '@/lib/research-gpt/data-sources/website-scraper';
import { createLLMManager, type LLMManager } from '@/lib/llm/manager/LLMManager';
import {
  MAX_WEB_REQUEST_RETRIES,
  RETRY_BASE_DELAY_MS,
  WEB_SCRAPING_TIMEOUT_MS,
  AI_ANALYSIS_TIMEOUT_MS,
} from './constants';
import { TimeoutError, ExternalServiceError, AIOperationError } from './errors';

export interface CompetitorData {
  competitor_name: string;
  competitor_website?: string;
  features: string[];
  pricing_info?: {
    price_tier: string;
    representative_price?: number;
    pricing_model?: string;
    currency?: string;
  };
  positioning?: {
    value_proposition?: string;
    target_customer?: string;
    market_segment?: string;
    geographic_focus?: string;
  };
  company_info?: {
    industry?: string;
    company_size?: string;
    founded_year?: number;
    headquarters?: string;
  };
}

export interface DataGatheringProgress {
  current: number;
  total: number;
  current_competitor?: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export type ProgressCallback = (progress: DataGatheringProgress) => void;

export class DataGatherer {
  private websiteScraper: WebsiteScraper;
  private llmManager: LLMManager | null = null;

  constructor() {
    this.websiteScraper = new WebsiteScraper();
  }

  private async getLLMManager(): Promise<LLMManager> {
    if (!this.llmManager) {
      this.llmManager = await createLLMManager({
        defaultProvider: 'openrouter',
        apiKeys: {
          openrouter: process.env.OPENROUTER_API_KEY || '',
        }
      });
    }
    return this.llmManager;
  }

  /**
   * Gather data for multiple competitors in parallel
   * @param competitors Array of competitor websites
   * @param progressCallback Optional callback for progress updates
   * @returns Array of competitor data
   */
  async gatherCompetitorData(
    competitors: Array<{ name: string; website?: string }>,
    progressCallback?: ProgressCallback
  ): Promise<CompetitorData[]> {
    const total = competitors.length;
    const results: CompetitorData[] = [];

    let current = 0;

    // Process competitors sequentially with delay to avoid rate limits
    for (const competitor of competitors) {
      try {
        current++;

        if (progressCallback) {
          progressCallback({
            current,
            total,
            current_competitor: competitor.name,
            status: 'processing',
          });
        }

        const data = await this.gatherSingleCompetitor(competitor.name, competitor.website);
        results.push(data);

        // Add delay between requests to avoid rate limiting (500ms)
        if (current < total) {
          await this.delay(500);
        }
      } catch (error) {
        console.error(`Error gathering data for ${competitor.name}:`, error);

        // Add placeholder data for failed competitor
        results.push({
          competitor_name: competitor.name,
          competitor_website: competitor.website,
          features: [],
        });
      }
    }

    if (progressCallback) {
      progressCallback({
        current: total,
        total,
        status: 'completed',
      });
    }

    return results;
  }

  /**
   * Gather data for a single competitor
   * @param name Competitor name
   * @param website Competitor website URL
   * @returns Competitor data
   */
  private async gatherSingleCompetitor(
    name: string,
    website?: string
  ): Promise<CompetitorData> {
    if (!website) {
      return {
        competitor_name: name,
        features: [],
      };
    }

    try {
      // Scrape website content with retry and timeout
      const websiteData = await this.withRetry(
        () =>
          this.withTimeout(
            this.websiteScraper.scrape(website),
            WEB_SCRAPING_TIMEOUT_MS,
            'Website scraping'
          ),
        MAX_WEB_REQUEST_RETRIES,
        `Scraping ${name} website`
      );

      // Extract structured data using AI with timeout
      const extractedData = await this.withTimeout(
        this.extractCompetitorInfo(name, websiteData.content, website),
        AI_ANALYSIS_TIMEOUT_MS,
        'AI analysis'
      );

      return {
        competitor_name: name,
        competitor_website: website,
        ...extractedData,
      };
    } catch (error) {
      console.error(`Failed to gather data for ${name}:`, error);

      // Return graceful fallback with error indication
      return {
        competitor_name: name,
        competitor_website: website,
        features: [],
        positioning: {
          value_proposition: `Data gathering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Extract competitor information using AI
   */
  private async extractCompetitorInfo(
    name: string,
    websiteContent: string,
    website: string
  ): Promise<Partial<CompetitorData>> {
    const prompt = `Analyze the following website content for ${name} (${website}) and extract structured competitive intelligence data.

Website Content:
${websiteContent.substring(0, 8000)}

Extract the following information in JSON format:
{
  "features": ["list of key product features"],
  "pricing_info": {
    "price_tier": "free|freemium|starter|professional|enterprise|custom",
    "representative_price": <number or null>,
    "pricing_model": "per_user|per_month|per_feature|one_time|custom",
    "currency": "USD|GBP|EUR|..."
  },
  "positioning": {
    "value_proposition": "short description",
    "target_customer": "SMB|Mid-Market|Enterprise|Consumer",
    "market_segment": "industry segment",
    "geographic_focus": "region"
  },
  "company_info": {
    "industry": "industry name",
    "company_size": "1-10|11-50|51-200|201-500|501-1000|1000+",
    "founded_year": <year or null>,
    "headquarters": "city, country"
  }
}

Only include information that is clearly stated on the website. Use null for missing data.`;

    try {
      const llmManager = await this.getLLMManager();
      const response = await llmManager.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }

      return { features: [] };
    } catch (error) {
      console.error('Error extracting competitor info:', error);
      return { features: [] };
    }
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_WEB_REQUEST_RETRIES,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof TimeoutError || error instanceof AIOperationError) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `${operationName} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`,
            error
          );
          await this.delay(delayMs);
        }
      }
    }

    throw new ExternalServiceError(
      operationName,
      lastError || new Error('All retries failed')
    );
  }

  /**
   * Timeout wrapper for async operations
   */
  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(operationName, timeoutMs)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Re-analyze an existing competitor with fresh data
   */
  async refreshCompetitorData(
    name: string,
    website?: string
  ): Promise<CompetitorData> {
    return this.gatherSingleCompetitor(name, website);
  }
}

// Export singleton instance
export const dataGatherer = new DataGatherer();
