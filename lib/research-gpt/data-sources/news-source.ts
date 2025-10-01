/**
 * News API Data Source for ResearchGPT™
 *
 * Fetches press releases and news articles for buying signals detection:
 * - Funding announcements
 * - Product launches
 * - Expansion news
 * - Partnership announcements
 * - Leadership changes
 *
 * Source reliability: 0.7-0.9 (varies by publication)
 * Rate limit: 100 requests/day (free tier), 1000 requests/day (paid tier)
 */

import type {
  BuyingSignal,
  Source,
  ConfidenceLevel,
} from '@/types/research-gpt';

// ============================================================================
// TYPES
// ============================================================================

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export interface NewsData {
  buying_signals: BuyingSignal[];
  sources: Source[];
}

// ============================================================================
// NEWS API DATA SOURCE
// ============================================================================

export class NewsAPIDataSource {
  private apiKey: string;
  private apiUrl = 'https://newsapi.org/v2';
  private rateLimitDelay = 1000; // 1 request per second
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('News API key not configured');
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch news articles for a company
   */
  async fetchCompanyNews(
    companyName: string,
    options?: {
      from?: string; // Date in YYYY-MM-DD format
      to?: string;
      pageSize?: number;
    }
  ): Promise<NewsData> {
    if (!this.apiKey) {
      console.warn('News API key not configured, returning empty data');
      return { buying_signals: [], sources: [] };
    }

    try {
      await this.enforceRateLimit();

      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const params = new URLSearchParams({
        q: `"${companyName}"`,
        from: options?.from || thirtyDaysAgo.toISOString().split('T')[0],
        to: options?.to || new Date().toISOString().split('T')[0],
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: (options?.pageSize || 20).toString(),
        apiKey: this.apiKey,
      });

      const url = `${this.apiUrl}/everything?${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('News API rate limit exceeded');
        }
        if (response.status === 401) {
          throw new Error('Invalid News API key');
        }

        const errorText = await response.text();
        throw new Error(`News API error: ${response.status} - ${errorText}`);
      }

      const data: NewsAPIResponse = await response.json();

      // Extract buying signals from articles
      const buying_signals = this.extractBuyingSignals(data.articles, companyName);
      const sources = this.convertToSources(data.articles);

      return {
        buying_signals,
        sources,
      };
    } catch (error) {
      console.error('News API fetch error:', error);

      // Graceful degradation - return empty data instead of throwing
      return { buying_signals: [], sources: [] };
    }
  }

  /**
   * Extract buying signals from news articles
   */
  private extractBuyingSignals(articles: NewsAPIArticle[], companyName: string): BuyingSignal[] {
    const signals: BuyingSignal[] = [];

    for (const article of articles) {
      const title = article.title.toLowerCase();
      const description = (article.description || '').toLowerCase();
      const content = title + ' ' + description;

      // Funding signals
      if (this.containsKeywords(content, ['funding', 'raised', 'investment', 'series', 'venture', 'capital'])) {
        signals.push({
          signal_type: 'funding',
          category: 'expansion',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['funding', 'raised']),
        });
      }

      // Product launch signals
      if (this.containsKeywords(content, ['launch', 'unveil', 'release', 'introduce', 'new product'])) {
        signals.push({
          signal_type: 'product_launch',
          category: 'expansion',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['launch', 'product']),
        });
      }

      // Expansion signals
      if (this.containsKeywords(content, ['expand', 'expansion', 'new office', 'opening', 'growth'])) {
        signals.push({
          signal_type: 'expansion',
          category: 'expansion',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['expand', 'growth']),
        });
      }

      // Hiring signals
      if (this.containsKeywords(content, ['hiring', 'recruit', 'job', 'positions', 'headcount'])) {
        signals.push({
          signal_type: 'hiring',
          category: 'hiring',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['hiring', 'recruit']),
        });
      }

      // Partnership signals
      if (this.containsKeywords(content, ['partner', 'collaboration', 'alliance', 'agreement', 'deal'])) {
        signals.push({
          signal_type: 'partnership',
          category: 'expansion',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['partner', 'deal']),
        });
      }

      // Leadership change signals
      if (this.containsKeywords(content, ['appoint', 'hire', 'ceo', 'cfo', 'cto', 'director', 'executive'])) {
        signals.push({
          signal_type: 'leadership_change',
          category: 'leadership',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['appoint', 'ceo']),
        });
      }

      // Award/Recognition signals
      if (this.containsKeywords(content, ['award', 'winner', 'recognition', 'ranked', 'top'])) {
        signals.push({
          signal_type: 'award',
          category: 'expansion',
          title: article.title,
          description: article.description || undefined,
          detected_date: article.publishedAt,
          confidence: this.calculateConfidence(article.source.name) as ConfidenceLevel,
          source_url: article.url,
          relevance_score: this.calculateRelevanceScore(content, ['award', 'winner']),
        });
      }
    }

    // Deduplicate and sort by relevance
    return this.deduplicateSignals(signals)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 15); // Top 15 signals
  }

  /**
   * Convert articles to source attributions
   */
  private convertToSources(articles: NewsAPIArticle[]): Source[] {
    return articles.slice(0, 10).map((article) => ({
      url: article.url,
      title: article.title,
      published_date: article.publishedAt,
      accessed_date: new Date().toISOString(),
      source_type: this.categorizeSource(article.source.name),
      reliability_score: this.calculateReliability(article.source.name),
      domain: this.extractDomain(article.url),
      content_snippet: article.description || undefined,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if content contains any of the keywords
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    return keywords.some((keyword) => content.includes(keyword.toLowerCase()));
  }

  /**
   * Calculate relevance score based on keyword matches
   */
  private calculateRelevanceScore(content: string, keywords: string[]): number {
    const matches = keywords.filter((keyword) => content.includes(keyword.toLowerCase()));
    return Math.min(0.5 + matches.length * 0.15, 1.0);
  }

  /**
   * Calculate confidence based on source reliability
   */
  private calculateConfidence(sourceName: string): string {
    const reliability = this.calculateReliability(sourceName);

    if (reliability >= 0.8) return 'high';
    if (reliability >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Calculate source reliability score
   */
  private calculateReliability(sourceName: string): number {
    const nameLower = sourceName.toLowerCase();

    // Tier 1: Major business publications (0.9)
    const tier1 = ['financial times', 'wall street journal', 'bloomberg', 'reuters', 'economist'];
    if (tier1.some((s) => nameLower.includes(s))) return 0.9;

    // Tier 2: Reputable news outlets (0.8)
    const tier2 = ['bbc', 'guardian', 'telegraph', 'independent', 'times'];
    if (tier2.some((s) => nameLower.includes(s))) return 0.8;

    // Tier 3: Tech & business press (0.7)
    const tier3 = ['techcrunch', 'venturebeat', 'business insider', 'forbes', 'fortune'];
    if (tier3.some((s) => nameLower.includes(s))) return 0.7;

    // Tier 4: Press releases (0.6)
    if (nameLower.includes('pr newswire') || nameLower.includes('business wire')) {
      return 0.6;
    }

    // Default: Medium reliability
    return 0.6;
  }

  /**
   * Categorize source type
   */
  private categorizeSource(sourceName: string): 'press_release' | 'news_article' | 'industry_report' {
    const nameLower = sourceName.toLowerCase();

    if (nameLower.includes('pr newswire') || nameLower.includes('business wire')) {
      return 'press_release';
    }

    return 'news_article';
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Deduplicate signals with similar titles
   */
  private deduplicateSignals(signals: BuyingSignal[]): BuyingSignal[] {
    const seen = new Set<string>();
    const deduplicated: BuyingSignal[] = [];

    for (const signal of signals) {
      // Create a fingerprint from title and type
      const fingerprint = `${signal.signal_type}:${signal.title.slice(0, 50)}`;

      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        deduplicated.push(signal);
      }
    }

    return deduplicated;
  }

  /**
   * Search for specific topics (e.g., "Company X funding")
   */
  async searchTopic(query: string, pageSize = 10): Promise<NewsData> {
    if (!this.apiKey) {
      return { buying_signals: [], sources: [] };
    }

    try {
      await this.enforceRateLimit();

      const params = new URLSearchParams({
        q: query,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: pageSize.toString(),
        apiKey: this.apiKey,
      });

      const url = `${this.apiUrl}/everything?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data: NewsAPIResponse = await response.json();

      return {
        buying_signals: [],
        sources: this.convertToSources(data.articles),
      };
    } catch (error) {
      console.error('News API search error:', error);
      return { buying_signals: [], sources: [] };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: NewsAPIDataSource | null = null;

export function getNewsAPIDataSource(): NewsAPIDataSource {
  if (!instance) {
    instance = new NewsAPIDataSource();
  }
  return instance;
}

export default NewsAPIDataSource;
