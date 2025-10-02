// SmartSync™ - AI Enrichment Service
// Enriches CRM data with AI-powered intelligence before syncing

import { createClient } from '@/lib/supabase/server';
import { EnrichmentResult } from './types';

// =====================================================
// Enrichment Service
// =====================================================

export class CRMEnrichmentService {
  constructor() {}

  /**
   * Enrich contact data with AI intelligence
   */
  async enrichContact(contactData: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    companyId?: string;
    organizationId: string;
  }): Promise<EnrichmentResult> {
    const supabase = await createClient();
    const results: Partial<EnrichmentResult> = {
      summary: '',
      buyingSignals: [],
      leadScore: 50,
      suggestedActions: [],
    };

    try {
      // 1. Research company if we have company ID
      if (contactData.companyId) {
        const research = await this.fetchCompanyResearch(contactData.companyId);

        if (research) {
          // Generate AI summary
          results.summary = await this.generateSummary(research);

          // Extract buying signals
          results.buyingSignals = this.extractBuyingSignals(research);

          // Get lead score
          results.leadScore = await this.getLeadScore(contactData.companyId);

          // Get score breakdown
          results.scoreBreakdown = await this.getScoreBreakdown(contactData.companyId);
        } else {
          results.summary = `Contact at ${contactData.company || 'unknown company'}`;
        }
      } else {
        // Basic enrichment without full research
        const fullName = [contactData.firstName, contactData.lastName].filter(Boolean).join(' ');
        results.summary = fullName
          ? `${fullName} at ${contactData.company || 'unknown company'}`
          : `Contact at ${contactData.company || 'unknown company'}`;
      }

      // 2. Determine deal stage based on score and signals
      results.dealStage = this.determineDealStage(
        results.leadScore,
        results.buyingSignals.length
      );

      // 3. Generate suggested actions
      results.suggestedActions = await this.generateActions(
        contactData,
        results.leadScore,
        results.buyingSignals
      );

      // 4. Generate next steps
      results.nextSteps = this.generateNextSteps(
        results.leadScore,
        results.buyingSignals
      );

      // 5. Extract pain points and competitors (if available)
      if (contactData.companyId) {
        const additionalIntel = await this.getAdditionalIntelligence(contactData.companyId);
        results.painPoints = additionalIntel.painPoints;
        results.competitors = additionalIntel.competitors;
        results.recommendations = additionalIntel.recommendations;
      }

      // 6. Auto-assign to rep (based on territory/industry)
      results.assignedTo = await this.assignToRep(contactData);

      return results as EnrichmentResult;
    } catch (error) {
      console.error('Enrichment error:', error);

      // Return basic enrichment on error
      return {
        summary: results.summary || `Contact at ${contactData.company || 'unknown company'}`,
        buyingSignals: [],
        leadScore: 50,
        suggestedActions: ['Research company manually', 'Send introduction email'],
        dealStage: 'prospect',
      };
    }
  }

  /**
   * Fetch company research from ResearchGPT cache
   */
  private async fetchCompanyResearch(companyId: string): Promise<any | null> {
    const supabase = await createClient();

    try {
      // Check if research exists in cache
      const { data: research } = await supabase
        .from('research_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return research;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate AI summary from research data
   */
  private async generateSummary(research: any): Promise<string> {
    try {
      // Extract key information
      const name = research.snapshot?.name || 'Company';
      const industry = research.snapshot?.industry || 'Unknown industry';
      const employeeCount = research.snapshot?.employeeCount || 'Unknown';
      const signals = research.signals?.length || 0;

      // Generate concise summary
      let summary = `${name} is a ${industry} company`;

      if (employeeCount !== 'Unknown') {
        summary += ` with ${employeeCount} employees`;
      }

      if (signals > 0) {
        summary += `. Currently showing ${signals} positive buying signal${signals > 1 ? 's' : ''}`;
      }

      summary += '.';

      return summary;
    } catch (error) {
      return 'Company profile available in oppSpot';
    }
  }

  /**
   * Extract high-priority buying signals
   */
  private extractBuyingSignals(research: any): string[] {
    try {
      if (!research.signals || !Array.isArray(research.signals)) {
        return [];
      }

      return research.signals
        .filter((s: any) => s.priority === 'high' || s.strength === 'strong')
        .map((s: any) => s.signal || s.description || 'Positive signal detected')
        .slice(0, 5); // Max 5 signals
    } catch (error) {
      return [];
    }
  }

  /**
   * Get lead score for company
   */
  private async getLeadScore(companyId: string): Promise<number> {
    const supabase = await createClient();

    try {
      const { data: scoring } = await supabase
        .from('lead_scores')
        .select('total_score')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return scoring?.total_score || 50;
    } catch (error) {
      return 50; // Default mid-range score
    }
  }

  /**
   * Get score breakdown
   */
  private async getScoreBreakdown(companyId: string): Promise<{
    financial: number;
    growth: number;
    engagement: number;
    fit: number;
  }> {
    const supabase = await createClient();

    try {
      const { data: scoring } = await supabase
        .from('lead_scores')
        .select('score_breakdown')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const breakdown = scoring?.score_breakdown || {};

      return {
        financial: breakdown.financial || 50,
        growth: breakdown.growth || 50,
        engagement: breakdown.engagement || 50,
        fit: breakdown.fit || 50,
      };
    } catch (error) {
      return {
        financial: 50,
        growth: 50,
        engagement: 50,
        fit: 50,
      };
    }
  }

  /**
   * Determine deal stage based on score and signals
   */
  private determineDealStage(score: number, signalCount: number): string {
    if (score >= 80 && signalCount >= 2) {
      return 'qualified'; // Hot lead
    } else if (score >= 70 && signalCount >= 1) {
      return 'engaged'; // Warm lead
    } else if (score >= 60) {
      return 'contacted'; // Initial outreach
    } else if (score >= 40) {
      return 'lead'; // Identified opportunity
    } else {
      return 'prospect'; // Early stage
    }
  }

  /**
   * Generate suggested actions based on intelligence
   */
  private async generateActions(
    contactData: any,
    score: number,
    signals: string[]
  ): Promise<string[]> {
    const actions: string[] = [];

    // High-priority actions for hot leads
    if (score >= 80) {
      actions.push('Schedule discovery call within 48 hours');
      actions.push('Send executive summary and case studies');
    } else if (score >= 60) {
      actions.push('Send personalized introduction email');
      actions.push('Share relevant blog post or whitepaper');
    } else {
      actions.push('Add to nurture sequence');
      actions.push('Monitor for buying signals');
    }

    // Signal-specific actions
    const hiringSignal = signals.find(s =>
      s.toLowerCase().includes('hiring') || s.toLowerCase().includes('job')
    );
    if (hiringSignal) {
      actions.push('Mention team scaling benefits in outreach');
    }

    const fundingSignal = signals.find(s =>
      s.toLowerCase().includes('funding') || s.toLowerCase().includes('raised')
    );
    if (fundingSignal) {
      actions.push('Highlight ROI and rapid deployment');
    }

    const expansionSignal = signals.find(s =>
      s.toLowerCase().includes('expansion') || s.toLowerCase().includes('opening')
    );
    if (expansionSignal) {
      actions.push('Focus on scalability in pitch');
    }

    // Generic research action
    if (contactData.company) {
      actions.push(`Research ${contactData.company} on LinkedIn`);
    }

    return actions.slice(0, 5); // Max 5 actions
  }

  /**
   * Generate next steps summary
   */
  private generateNextSteps(score: number, signals: string[]): string {
    if (score >= 80 && signals.length >= 2) {
      return 'High-priority lead: Immediate outreach recommended. Multiple buying signals detected.';
    } else if (score >= 60) {
      return 'Qualified lead: Personalized outreach within 3-5 days. Monitor for additional signals.';
    } else {
      return 'Early-stage prospect: Add to nurture campaign and monitor for engagement.';
    }
  }

  /**
   * Get additional intelligence (pain points, competitors, recommendations)
   */
  private async getAdditionalIntelligence(companyId: string): Promise<{
    painPoints?: string[];
    competitors?: string[];
    recommendations?: string;
  }> {
    const supabase = await createClient();

    try {
      const { data: research } = await supabase
        .from('research_reports')
        .select('analysis')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const analysis = research?.analysis || {};

      return {
        painPoints: analysis.painPoints || [],
        competitors: analysis.competitors || [],
        recommendations: analysis.recommendations || 'Focus on value proposition and ROI',
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Auto-assign contact to sales rep
   * Based on territory, industry, or round-robin
   */
  private async assignToRep(contactData: any): Promise<string | undefined> {
    const supabase = await createClient();

    try {
      // Get organization's team members with sales role
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id, full_name, role, metadata')
        .eq('organization_id', contactData.organizationId)
        .eq('role', 'sales')
        .limit(10);

      if (!teamMembers || teamMembers.length === 0) {
        return undefined; // No sales reps available
      }

      // TODO: Implement smart assignment logic
      // - Check territory (if company location matches rep's territory)
      // - Check industry specialization
      // - Check current workload
      // - Round-robin as fallback

      // For now, return first sales rep
      return teamMembers[0].id;
    } catch (error) {
      return undefined;
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let enrichmentServiceInstance: CRMEnrichmentService | null = null;

export function getEnrichmentService(): CRMEnrichmentService {
  if (!enrichmentServiceInstance) {
    enrichmentServiceInstance = new CRMEnrichmentService();
  }
  return enrichmentServiceInstance;
}
