/**
 * Website Scraper
 * Scrapes company websites for basic information
 */

import type {
  ScrapingResult,
  NormalizedCompanyData,
  WebsiteScrapingTargets,
} from '../types';

export class WebsiteScraper {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = this.normalizeUrl(baseUrl);
    this.timeout = timeout;
  }

  /**
   * Normalize URL to ensure it has protocol
   */
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Fetch HTML from URL with timeout
   */
  private async fetchWithTimeout(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; oppSpot/1.0; +https://oppspot.ai)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Discover common page URLs
   */
  private discoverPages(): WebsiteScrapingTargets {
    const commonPaths = {
      about_page: ['/about', '/about-us', '/company', '/who-we-are'],
      team_page: ['/team', '/about/team', '/people', '/leadership'],
      contact_page: ['/contact', '/contact-us', '/get-in-touch'],
      products_page: ['/products', '/services', '/solutions', '/what-we-do'],
      news_page: ['/news', '/blog', '/press', '/media'],
    };

    const targets: WebsiteScrapingTargets = {};

    for (const [key, paths] of Object.entries(commonPaths)) {
      // Try first path by default
      targets[key as keyof WebsiteScrapingTargets] = `${this.baseUrl}${paths[0]}`;
    }

    return targets;
  }

  /**
   * Extract text content from HTML (remove scripts, styles, etc.)
   */
  private extractTextContent(html: string): string {
    // Remove scripts and styles
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Extract structured data from HTML (JSON-LD, meta tags, etc.)
   */
  private extractStructuredData(html: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract JSON-LD
    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is
    );
    if (jsonLdMatch) {
      try {
        data.jsonLd = JSON.parse(jsonLdMatch[1]);
      } catch (e) {
        // Invalid JSON-LD
      }
    }

    // Extract meta tags
    const metaTags: Record<string, string> = {};

    // OG tags
    const ogMatches = html.matchAll(
      /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi
    );
    for (const match of ogMatches) {
      metaTags[`og:${match[1]}`] = match[2];
    }

    // Twitter tags
    const twitterMatches = html.matchAll(
      /<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi
    );
    for (const match of twitterMatches) {
      metaTags[`twitter:${match[1]}`] = match[2];
    }

    // Description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );
    if (descMatch) {
      metaTags.description = descMatch[1];
    }

    data.metaTags = metaTags;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      data.title = titleMatch[1].trim();
    }

    return data;
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(text: string): Partial<NormalizedCompanyData> {
    const contact: Partial<NormalizedCompanyData> = {};

    // Email pattern
    const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    if (emailMatch) {
      contact.email = emailMatch[0];
    }

    // Phone pattern (UK format)
    const phoneMatch = text.match(
      /\b(?:\+44\s?|0)(?:\d\s?){9,10}\b/
    );
    if (phoneMatch) {
      contact.phone = phoneMatch[0].replace(/\s/g, '');
    }

    // LinkedIn URL
    const linkedinMatch = text.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+/i
    );
    if (linkedinMatch) {
      contact.linkedin_url = linkedinMatch[0];
    }

    // Twitter URL
    const twitterMatch = text.match(
      /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/i
    );
    if (twitterMatch) {
      contact.twitter_url = twitterMatch[0];
    }

    return contact;
  }

  /**
   * Scrape homepage
   */
  async scrapeHomepage(): Promise<ScrapingResult> {
    try {
      const html = await this.fetchWithTimeout(this.baseUrl);
      const text = this.extractTextContent(html);
      const structured = this.extractStructuredData(html);
      const contact = this.extractContactInfo(text);

      return {
        success: true,
        data: {
          url: this.baseUrl,
          text: text.substring(0, 5000), // Limit to 5000 chars
          structured,
          contact,
        },
        confidence: 'medium',
        source_url: this.baseUrl,
        scraped_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape homepage',
        confidence: 'low',
        source_url: this.baseUrl,
        scraped_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Scrape About page
   */
  async scrapeAboutPage(): Promise<ScrapingResult> {
    const targets = this.discoverPages();

    for (const aboutUrl of [
      targets.about_page,
      `${this.baseUrl}/about`,
      `${this.baseUrl}/about-us`,
    ]) {
      try {
        const html = await this.fetchWithTimeout(aboutUrl!);
        const text = this.extractTextContent(html);

        return {
          success: true,
          data: {
            url: aboutUrl,
            text: text.substring(0, 10000), // Limit to 10K chars
          },
          confidence: 'high',
          source_url: aboutUrl!,
          scraped_at: new Date().toISOString(),
        };
      } catch (error) {
        // Try next URL
        continue;
      }
    }

    return {
      success: false,
      error: 'About page not found',
      confidence: 'low',
      source_url: this.baseUrl,
      scraped_at: new Date().toISOString(),
    };
  }

  /**
   * Scrape all available pages
   */
  async scrapeAll(): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    // Homepage
    results.push(await this.scrapeHomepage());

    // About page
    results.push(await this.scrapeAboutPage());

    return results;
  }
}
