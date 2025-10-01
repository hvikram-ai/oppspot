/**
 * Reed.co.uk Jobs API Data Source for ResearchGPT™
 *
 * Fetches job postings to detect hiring signals:
 * - Active job openings
 * - Hiring velocity (number of roles)
 * - Department expansion (which teams are hiring)
 * - Seniority of roles (executive vs individual contributor)
 *
 * Source reliability: 0.8 (official job board)
 * Rate limit: Respects Reed API limits (configurable)
 */

import type {
  BuyingSignal,
  Source,
  ConfidenceLevel,
} from '@/types/research-gpt';

// ============================================================================
// TYPES
// ============================================================================

interface ReedJob {
  jobId: number;
  employerId: number;
  employerName: string;
  jobTitle: string;
  locationName: string;
  minimumSalary: number | null;
  maximumSalary: number | null;
  currency: string;
  expirationDate: string;
  date: string;
  jobDescription: string;
  applications: number;
  jobUrl: string;
}

interface ReedSearchResponse {
  results: ReedJob[];
  totalResults: number;
}

export interface JobsData {
  buying_signals: BuyingSignal[];
  sources: Source[];
  job_count: number;
  departments_hiring: string[];
}

// ============================================================================
// REED JOBS API DATA SOURCE
// ============================================================================

export class ReedJobsDataSource {
  private apiKey: string;
  private apiUrl = 'https://www.reed.co.uk/api/1.0';
  private rateLimitDelay = 500; // 2 requests per second
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = process.env.REED_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Reed API key not configured (optional)');
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
   * Fetch job postings for a company
   */
  async fetchCompanyJobs(companyName: string, resultsToTake = 50): Promise<JobsData> {
    if (!this.apiKey) {
      console.warn('Reed API key not configured, returning empty data');
      return {
        buying_signals: [],
        sources: [],
        job_count: 0,
        departments_hiring: [],
      };
    }

    try {
      await this.enforceRateLimit();

      const params = new URLSearchParams({
        employerName: companyName,
        resultsToTake: resultsToTake.toString(),
        resultsToSkip: '0',
      });

      const url = `${this.apiUrl}/search?${params}`;
      const auth = Buffer.from(`${this.apiKey}:`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Reed API rate limit exceeded');
        }
        if (response.status === 401) {
          throw new Error('Invalid Reed API key');
        }

        const errorText = await response.text();
        throw new Error(`Reed API error: ${response.status} - ${errorText}`);
      }

      const data: ReedSearchResponse = await response.json();

      // Extract buying signals from jobs
      const buying_signals = this.extractHiringSignals(data.results, companyName);
      const sources = this.convertToSources(data.results);
      const departments_hiring = this.extractDepartments(data.results);

      return {
        buying_signals,
        sources,
        job_count: data.results.length,
        departments_hiring,
      };
    } catch (error) {
      console.error('Reed API fetch error:', error);

      // Graceful degradation
      return {
        buying_signals: [],
        sources: [],
        job_count: 0,
        departments_hiring: [],
      };
    }
  }

  /**
   * Extract hiring signals from job postings
   */
  private extractHiringSignals(jobs: ReedJob[], companyName: string): BuyingSignal[] {
    const signals: BuyingSignal[] = [];

    if (jobs.length === 0) {
      return signals;
    }

    // Overall hiring velocity signal
    if (jobs.length > 0) {
      signals.push({
        signal_type: 'hiring',
        category: 'hiring',
        title: `${companyName} is actively hiring`,
        description: `${jobs.length} active job posting${jobs.length > 1 ? 's' : ''} found on Reed.co.uk`,
        detected_date: new Date().toISOString(),
        confidence: 'high' as ConfidenceLevel,
        source_url: 'https://www.reed.co.uk',
        relevance_score: Math.min(0.5 + jobs.length * 0.02, 1.0),
      });
    }

    // Department-specific hiring signals
    const departmentGroups = this.groupByDepartment(jobs);

    for (const [department, departmentJobs] of Object.entries(departmentGroups)) {
      if (departmentJobs.length >= 2) {
        // Multiple roles in same department = expansion
        signals.push({
          signal_type: 'hiring',
          category: 'hiring',
          title: `Expanding ${department} team`,
          description: `${departmentJobs.length} ${department} roles open: ${departmentJobs.slice(0, 3).map(j => j.jobTitle).join(', ')}`,
          detected_date: new Date().toISOString(),
          confidence: 'high' as ConfidenceLevel,
          source_url: 'https://www.reed.co.uk',
          relevance_score: 0.8,
        });
      }
    }

    // Executive/senior hiring signals (high intent)
    const seniorRoles = jobs.filter((job) => this.isSeniorRole(job.jobTitle));

    if (seniorRoles.length > 0) {
      for (const role of seniorRoles.slice(0, 3)) {
        signals.push({
          signal_type: 'leadership_change',
          category: 'leadership',
          title: `Hiring: ${role.jobTitle}`,
          description: this.sanitizeDescription(role.jobDescription),
          detected_date: role.date,
          confidence: 'high' as ConfidenceLevel,
          source_url: role.jobUrl,
          relevance_score: 0.9,
        });
      }
    }

    // High-salary roles (indicates budget/investment)
    const highSalaryRoles = jobs.filter(
      (job) => job.maximumSalary && job.maximumSalary > 80000
    );

    if (highSalaryRoles.length > 0) {
      signals.push({
        signal_type: 'hiring',
        category: 'expansion',
        title: 'Hiring high-value roles',
        description: `${highSalaryRoles.length} role(s) with £80k+ salary, indicating investment in talent`,
        detected_date: new Date().toISOString(),
        confidence: 'medium' as ConfidenceLevel,
        source_url: 'https://www.reed.co.uk',
        relevance_score: 0.75,
      });
    }

    // Recent postings (last 7 days) = urgent hiring
    const recentJobs = jobs.filter((job) => {
      const jobDate = new Date(job.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return jobDate > sevenDaysAgo;
    });

    if (recentJobs.length >= 3) {
      signals.push({
        signal_type: 'hiring',
        category: 'hiring',
        title: 'Rapid hiring activity',
        description: `${recentJobs.length} jobs posted in last 7 days`,
        detected_date: new Date().toISOString(),
        confidence: 'high' as ConfidenceLevel,
        source_url: 'https://www.reed.co.uk',
        relevance_score: 0.85,
      });
    }

    return signals.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)).slice(0, 10);
  }

  /**
   * Convert jobs to source attributions
   */
  private convertToSources(jobs: ReedJob[]): Source[] {
    return jobs.slice(0, 5).map((job) => ({
      url: job.jobUrl,
      title: `${job.jobTitle} at ${job.employerName}`,
      published_date: job.date,
      accessed_date: new Date().toISOString(),
      source_type: 'job_posting',
      reliability_score: 0.8,
      domain: 'reed.co.uk',
      content_snippet: this.sanitizeDescription(job.jobDescription),
    }));
  }

  /**
   * Extract department names from job titles
   */
  private extractDepartments(jobs: ReedJob[]): string[] {
    const departments = new Set<string>();

    for (const job of jobs) {
      const department = this.inferDepartment(job.jobTitle);
      if (department) {
        departments.add(department);
      }
    }

    return Array.from(departments);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Group jobs by department
   */
  private groupByDepartment(jobs: ReedJob[]): Record<string, ReedJob[]> {
    const groups: Record<string, ReedJob[]> = {};

    for (const job of jobs) {
      const department = this.inferDepartment(job.jobTitle) || 'Other';

      if (!groups[department]) {
        groups[department] = [];
      }

      groups[department].push(job);
    }

    return groups;
  }

  /**
   * Infer department from job title
   */
  private inferDepartment(jobTitle: string): string | null {
    const title = jobTitle.toLowerCase();

    if (title.includes('engineer') || title.includes('developer') || title.includes('tech')) {
      return 'Engineering';
    }
    if (title.includes('sales') || title.includes('account')) {
      return 'Sales';
    }
    if (title.includes('market')) {
      return 'Marketing';
    }
    if (title.includes('product')) {
      return 'Product';
    }
    if (title.includes('design') || title.includes('ux')) {
      return 'Design';
    }
    if (title.includes('finance') || title.includes('account')) {
      return 'Finance';
    }
    if (title.includes('hr') || title.includes('people') || title.includes('recruit')) {
      return 'HR';
    }
    if (title.includes('operations') || title.includes('ops')) {
      return 'Operations';
    }
    if (title.includes('legal') || title.includes('compliance')) {
      return 'Legal';
    }
    if (title.includes('data') || title.includes('analytics')) {
      return 'Data & Analytics';
    }

    return null;
  }

  /**
   * Check if role is senior/executive
   */
  private isSeniorRole(jobTitle: string): boolean {
    const title = jobTitle.toLowerCase();
    const seniorKeywords = [
      'director',
      'head of',
      'vp',
      'vice president',
      'chief',
      'ceo',
      'cto',
      'cfo',
      'cmo',
      'lead',
      'principal',
      'senior manager',
    ];

    return seniorKeywords.some((keyword) => title.includes(keyword));
  }

  /**
   * Sanitize job description (remove HTML, limit length)
   */
  private sanitizeDescription(description: string): string {
    // Remove HTML tags
    const text = description.replace(/<[^>]*>/g, '');

    // Limit to 200 characters
    if (text.length > 200) {
      return text.substring(0, 197) + '...';
    }

    return text;
  }

  /**
   * Calculate hiring velocity (jobs per month)
   */
  calculateHiringVelocity(jobs: ReedJob[]): number {
    if (jobs.length === 0) return 0;

    // Group by month
    const monthCounts: Record<string, number> = {};

    for (const job of jobs) {
      const month = job.date.substring(0, 7); // YYYY-MM
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    // Calculate average
    const months = Object.keys(monthCounts).length;
    const totalJobs = Object.values(monthCounts).reduce((sum, count) => sum + count, 0);

    return months > 0 ? totalJobs / months : 0;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: ReedJobsDataSource | null = null;

export function getReedJobsDataSource(): ReedJobsDataSource {
  if (!instance) {
    instance = new ReedJobsDataSource();
  }
  return instance;
}

export default ReedJobsDataSource;
