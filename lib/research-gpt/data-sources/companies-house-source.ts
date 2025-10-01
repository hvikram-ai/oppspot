/**
 * Companies House Data Source for ResearchGPT™
 *
 * Extends the existing Companies House service with research-specific methods.
 * Provides structured data for:
 * - Company snapshot (fundamentals)
 * - Revenue signals (financial performance)
 * - Leadership changes (buying signals)
 * - Decision makers (officers)
 *
 * Source reliability: 1.0 (official government data)
 */

import { getCompaniesHouseService } from '@/lib/services/companies-house';
import type {
  CompanySnapshot,
  BuyingSignal,
  DecisionMaker,
  RevenueSignal,
  Source,
  ConfidenceLevel,
} from '@/types/research-gpt';

// ============================================================================
// TYPES
// ============================================================================

export interface CompaniesHouseData {
  snapshot: Partial<CompanySnapshot>;
  revenue_signals: RevenueSignal[];
  buying_signals: BuyingSignal[];
  decision_makers: DecisionMaker[];
  sources: Source[];
}

// ============================================================================
// COMPANIES HOUSE DATA SOURCE
// ============================================================================

export class CompaniesHouseDataSource {
  private service = getCompaniesHouseService();

  /**
   * Fetch all research data from Companies House API
   */
  async fetchCompanyData(companyNumber: string): Promise<CompaniesHouseData> {
    try {
      // Fetch data in parallel
      const [profile, officers, filings] = await Promise.all([
        this.service.getCompanyProfile(companyNumber),
        this.service.getCompanyOfficers(companyNumber).catch(() => ({ items: [] })),
        this.service.getFilingHistory(companyNumber, 50).catch(() => ({ items: [] })),
      ]);

      // Extract structured data
      const snapshot = this.extractSnapshot(profile);
      const revenue_signals = this.extractRevenueSignals(profile, filings.items);
      const buying_signals = this.extractBuyingSignals(officers.items, filings.items);
      const decision_makers = this.extractDecisionMakers(officers.items);
      const sources = this.generateSources(companyNumber, profile.company_name);

      return {
        snapshot,
        revenue_signals,
        buying_signals,
        decision_makers,
        sources,
      };
    } catch (error) {
      console.error('Companies House fetch error:', error);
      throw new Error(`Failed to fetch Companies House data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract company snapshot data
   */
  private extractSnapshot(profile: any): Partial<CompanySnapshot> {
    return {
      company_name: profile.company_name,
      company_number: profile.company_number,
      founded_year: profile.date_of_incorporation
        ? new Date(profile.date_of_incorporation).getFullYear()
        : null,
      company_type: this.formatCompanyType(profile.type),
      company_status: profile.company_status,
      registered_address: profile.registered_office_address
        ? {
            street: profile.registered_office_address.address_line_1 || '',
            city: profile.registered_office_address.locality || '',
            postal_code: profile.registered_office_address.postal_code || '',
            country: profile.registered_office_address.country || 'United Kingdom',
          }
        : undefined,
      industry: this.extractIndustry(profile.sic_codes),
      sic_codes: profile.sic_codes || [],
      jurisdiction: profile.jurisdiction || 'England & Wales',
    };
  }

  /**
   * Extract revenue signals from accounts data
   */
  private extractRevenueSignals(profile: any, filings: any[]): RevenueSignal[] {
    const signals: RevenueSignal[] = [];

    // Financial health from accounts status
    if (profile.accounts) {
      const accountsOverdue = profile.accounts.overdue;
      const nextDue = profile.accounts.next_due;

      signals.push({
        signal_type: 'financial_health',
        description: accountsOverdue
          ? 'Accounts overdue - potential financial stress'
          : 'Accounts up to date',
        confidence: 'high' as ConfidenceLevel,
        detected_date: new Date().toISOString(),
        source_url: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`,
        positive: !accountsOverdue,
      });

      // Last accounts filing
      if (profile.accounts.last_accounts?.made_up_to) {
        const madeUpTo = new Date(profile.accounts.last_accounts.made_up_to);
        const ageMonths = Math.floor(
          (Date.now() - madeUpTo.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        signals.push({
          signal_type: 'accounts_filing',
          description: `Last accounts filed: ${madeUpTo.toLocaleDateString('en-GB')} (${ageMonths} months ago)`,
          confidence: 'high' as ConfidenceLevel,
          detected_date: madeUpTo.toISOString(),
          source_url: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}/filing-history`,
          positive: true,
        });
      }
    }

    // Check for recent annual returns/confirmation statements
    const recentConfirmations = filings
      .filter((f) => f.category === 'confirmation-statement' || f.category === 'annual-return')
      .slice(0, 3);

    if (recentConfirmations.length > 0) {
      signals.push({
        signal_type: 'compliance',
        description: `${recentConfirmations.length} recent confirmation statements filed`,
        confidence: 'high' as ConfidenceLevel,
        detected_date: recentConfirmations[0].date,
        source_url: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}/filing-history`,
        positive: true,
      });
    }

    // Company status signals
    if (profile.company_status === 'active') {
      signals.push({
        signal_type: 'business_status',
        description: 'Company actively trading',
        confidence: 'high' as ConfidenceLevel,
        detected_date: new Date().toISOString(),
        source_url: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`,
        positive: true,
      });
    } else if (profile.company_status === 'liquidation' || profile.company_status === 'administration') {
      signals.push({
        signal_type: 'business_status',
        description: `Company in ${profile.company_status} - high risk`,
        confidence: 'high' as ConfidenceLevel,
        detected_date: new Date().toISOString(),
        source_url: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`,
        positive: false,
      });
    }

    return signals;
  }

  /**
   * Extract buying signals (leadership changes, capital raises)
   */
  private extractBuyingSignals(officers: any[], filings: any[]): BuyingSignal[] {
    const signals: BuyingSignal[] = [];

    // Recent leadership changes (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const recentAppointments = officers.filter((officer) => {
      if (!officer.appointed_on) return false;
      const appointedDate = new Date(officer.appointed_on);
      return appointedDate > twelveMonthsAgo;
    });

    if (recentAppointments.length > 0) {
      for (const officer of recentAppointments.slice(0, 5)) {
        signals.push({
          signal_type: 'leadership_change',
          category: 'leadership',
          title: `New ${officer.officer_role}: ${officer.name}`,
          description: `${officer.name} appointed as ${officer.officer_role} on ${new Date(officer.appointed_on).toLocaleDateString('en-GB')}`,
          detected_date: officer.appointed_on,
          confidence: 'high' as ConfidenceLevel,
          source_url: `https://find-and-update.company-information.service.gov.uk/company/${officers[0]?.links?.self?.split('/company/')[1]?.split('/')[0]}/officers`,
          relevance_score: 0.8,
        });
      }
    }

    // Check for capital increases (share allotments)
    const capitalFilings = filings.filter(
      (f) =>
        f.type === 'SH01' || // Statement of capital
        f.type === 'SH02' || // Return of allotment of shares
        f.description.toLowerCase().includes('capital') ||
        f.description.toLowerCase().includes('allot')
    );

    for (const filing of capitalFilings.slice(0, 3)) {
      const filingDate = new Date(filing.date);
      if (filingDate > twelveMonthsAgo) {
        signals.push({
          signal_type: 'funding',
          category: 'expansion',
          title: 'Capital increase',
          description: filing.description,
          detected_date: filing.date,
          confidence: 'medium' as ConfidenceLevel,
          source_url: filing.links?.self
            ? `https://find-and-update.company-information.service.gov.uk${filing.links.self}`
            : undefined,
          relevance_score: 0.7,
        });
      }
    }

    // Check for change of name (potential rebrand/pivot)
    const nameChanges = filings.filter(
      (f) => f.type === 'NM01' || f.description.toLowerCase().includes('change of name')
    );

    for (const filing of nameChanges.slice(0, 2)) {
      const filingDate = new Date(filing.date);
      if (filingDate > twelveMonthsAgo) {
        signals.push({
          signal_type: 'company_update',
          category: 'expansion',
          title: 'Company name change',
          description: `Company changed name on ${filingDate.toLocaleDateString('en-GB')}`,
          detected_date: filing.date,
          confidence: 'high' as ConfidenceLevel,
          source_url: filing.links?.self
            ? `https://find-and-update.company-information.service.gov.uk${filing.links.self}`
            : undefined,
          relevance_score: 0.6,
        });
      }
    }

    return signals;
  }

  /**
   * Extract decision makers (directors and officers)
   */
  private extractDecisionMakers(officers: any[]): DecisionMaker[] {
    return officers
      .filter((officer) => !officer.resigned_on) // Only active officers
      .filter((officer) => this.isKeyRole(officer.officer_role))
      .map((officer) => ({
        name: officer.name,
        job_title: this.formatRole(officer.officer_role),
        department: this.inferDepartment(officer.officer_role),
        seniority_level: this.inferSeniority(officer.officer_role),
        appointed_date: officer.appointed_on || undefined,
        business_email: null, // Not available from Companies House
        phone_number: null, // Not available from Companies House
        linkedin_url: null, // Not available from Companies House
        contact_source: 'Companies House',
        is_decision_maker: true,
        influence_score: this.calculateInfluenceScore(officer.officer_role),
        notes: officer.nationality ? `Nationality: ${officer.nationality}` : undefined,
      }))
      .slice(0, 10); // Top 10 most relevant
  }

  /**
   * Generate source attributions
   */
  private generateSources(companyNumber: string, companyName: string): Source[] {
    const baseUrl = 'https://find-and-update.company-information.service.gov.uk';

    return [
      {
        url: `${baseUrl}/company/${companyNumber}`,
        title: `${companyName} - Companies House Profile`,
        published_date: null,
        accessed_date: new Date().toISOString(),
        source_type: 'companies_house',
        reliability_score: 1.0, // Official government data
        domain: 'company-information.service.gov.uk',
        content_snippet: 'Official company information from Companies House, including registered office address, company status, and incorporation date.',
      },
      {
        url: `${baseUrl}/company/${companyNumber}/officers`,
        title: `${companyName} - Officers and Directors`,
        published_date: null,
        accessed_date: new Date().toISOString(),
        source_type: 'companies_house',
        reliability_score: 1.0,
        domain: 'company-information.service.gov.uk',
        content_snippet: 'Current and resigned officers, directors, and secretaries registered with Companies House.',
      },
      {
        url: `${baseUrl}/company/${companyNumber}/filing-history`,
        title: `${companyName} - Filing History`,
        published_date: null,
        accessed_date: new Date().toISOString(),
        source_type: 'companies_house',
        reliability_score: 1.0,
        domain: 'company-information.service.gov.uk',
        content_snippet: 'Complete filing history including accounts, annual returns, and statutory documents.',
      },
    ];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private formatCompanyType(type: string): string {
    const typeMap: Record<string, string> = {
      'ltd': 'Private Limited Company',
      'plc': 'Public Limited Company',
      'llp': 'Limited Liability Partnership',
      'private-limited-guarant-nsc-limited-exemption': 'Private Limited by Guarantee',
      'private-limited-guarant-nsc': 'Private Limited by Guarantee',
      'private-unlimited-nsc': 'Private Unlimited Company',
    };

    return typeMap[type.toLowerCase()] || type;
  }

  private extractIndustry(sicCodes?: string[]): string | null {
    if (!sicCodes || sicCodes.length === 0) return null;

    // Map SIC codes to industries (simplified - could be enhanced)
    const primaryCode = sicCodes[0];
    const codeNumber = parseInt(primaryCode);

    if (codeNumber >= 45000 && codeNumber <= 47999) return 'Retail & Wholesale';
    if (codeNumber >= 60000 && codeNumber <= 63999) return 'Technology & Telecommunications';
    if (codeNumber >= 64000 && codeNumber <= 66999) return 'Financial Services';
    if (codeNumber >= 70000 && codeNumber <= 75000) return 'Professional Services';
    if (codeNumber >= 85000 && codeNumber <= 88999) return 'Education & Healthcare';
    if (codeNumber >= 10000 && codeNumber <= 33999) return 'Manufacturing';
    if (codeNumber >= 41000 && codeNumber <= 43999) return 'Construction';

    return 'Other';
  }

  private isKeyRole(role: string): boolean {
    const keyRoles = [
      'director',
      'ceo',
      'cfo',
      'cto',
      'managing-director',
      'secretary',
      'llp-member',
      'member',
    ];

    return keyRoles.some((key) => role.toLowerCase().includes(key));
  }

  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'director': 'Director',
      'ceo': 'Chief Executive Officer',
      'cfo': 'Chief Financial Officer',
      'cto': 'Chief Technology Officer',
      'secretary': 'Company Secretary',
      'corporate-director': 'Corporate Director',
      'llp-member': 'LLP Member',
      'llp-designated-member': 'LLP Designated Member',
      'managing-director': 'Managing Director',
    };

    return roleMap[role.toLowerCase()] || role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private inferDepartment(role: string): string | null {
    const roleLower = role.toLowerCase();

    if (roleLower.includes('cfo') || roleLower.includes('finance')) return 'Finance';
    if (roleLower.includes('cto') || roleLower.includes('technology')) return 'Technology';
    if (roleLower.includes('coo') || roleLower.includes('operations')) return 'Operations';
    if (roleLower.includes('cmo') || roleLower.includes('marketing')) return 'Marketing';
    if (roleLower.includes('secretary')) return 'Legal & Compliance';

    return 'Executive';
  }

  private inferSeniority(role: string): 'c-level' | 'vp' | 'director' | 'manager' | 'individual_contributor' {
    const roleLower = role.toLowerCase();

    if (roleLower.includes('ceo') || roleLower.includes('cfo') || roleLower.includes('cto')) {
      return 'c-level';
    }

    if (roleLower.includes('director') || roleLower.includes('managing')) {
      return 'director';
    }

    return 'director'; // Default for Companies House officers
  }

  private calculateInfluenceScore(role: string): number {
    const roleLower = role.toLowerCase();

    if (roleLower.includes('ceo') || roleLower.includes('managing-director')) return 1.0;
    if (roleLower.includes('cfo')) return 0.9;
    if (roleLower.includes('cto')) return 0.85;
    if (roleLower.includes('director')) return 0.8;
    if (roleLower.includes('secretary')) return 0.7;

    return 0.6;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: CompaniesHouseDataSource | null = null;

export function getCompaniesHouseDataSource(): CompaniesHouseDataSource {
  if (!instance) {
    instance = new CompaniesHouseDataSource();
  }
  return instance;
}

export default CompaniesHouseDataSource;
