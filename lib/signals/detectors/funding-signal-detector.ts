import { createClient } from '@/lib/supabase/server';
import {
  FundingSignal,
  BuyingSignal,
  RoundType,
  GrowthStage,
  Investor,
  FundingRound,
  BudgetEstimate,
  SignalStrength,
  ImpactAssessment,
  RecommendedAction
} from '../types/buying-signals';

export class FundingSignalDetector {
  private static instance: FundingSignalDetector;

  private constructor() {}

  static getInstance(): FundingSignalDetector {
    if (!this.instance) {
      this.instance = new FundingSignalDetector();
    }
    return this.instance;
  }

  async detectFundingRound(companyId: string, fundingData: any): Promise<FundingSignal | null> {
    const supabase = await createClient();

    try {
      // Check if we already have this funding round
      const isDuplicate = await this.checkDuplicateFunding(companyId, fundingData);
      if (isDuplicate) {
        console.log('Duplicate funding signal detected, skipping');
        return null;
      }

      // Get company data for context
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single();

      if (!company) {
        throw new Error('Company not found');
      }

      // Calculate signal strength and buying probability
      const signalStrength = this.calculateSignalStrength(fundingData);
      const buyingProbability = this.calculateBuyingProbability(fundingData, company);

      // Generate insights
      const insights = this.generateFundingInsights(fundingData, company);

      // Calculate budget availability
      const budgetEstimate = this.estimateBudgetAvailability(fundingData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(fundingData, insights);

      // Calculate engagement window
      const engagementWindow = this.calculateEngagementWindow(fundingData);

      // Create the funding signal
      const fundingSignal: Partial<FundingSignal> = {
        company_id: companyId,
        signal_type: 'funding_round',
        signal_category: 'financial',
        signal_strength: signalStrength,
        confidence_score: this.calculateConfidenceScore(fundingData),
        buying_probability: buyingProbability,
        signal_date: fundingData.announcement_date || new Date(),

        funding_data: {
          round_type: fundingData.round_type as RoundType,
          amount: fundingData.amount,
          currency: fundingData.currency || 'USD',
          valuation: fundingData.valuation,
          investors: fundingData.investors || [],
          lead_investor: fundingData.lead_investor,
          announcement_date: fundingData.announcement_date,
          close_date: fundingData.close_date
        },

        context: {
          previous_rounds: await this.getPreviousFundingRounds(companyId),
          total_raised: await this.calculateTotalRaised(companyId, fundingData.amount),
          burn_rate_estimate: this.estimateBurnRate(fundingData, company),
          runway_months: this.calculateRunway(fundingData, company),
          growth_stage: this.determineGrowthStage(fundingData.round_type)
        },

        insights: {
          budget_availability: budgetEstimate,
          expansion_plans: insights.expansion_plans,
          investment_focus: insights.investment_focus,
          hiring_intentions: insights.hiring_intentions,
          technology_upgrade_likely: insights.technology_upgrade_likely
        },

        impact_assessment: this.assessImpact(fundingData, company),
        recommended_actions: recommendations,
        engagement_window: engagementWindow,

        source: fundingData.source,
        source_url: fundingData.source_url,
        source_reliability: fundingData.source_reliability || 'high',
        status: 'detected'
      };

      // Store the signal in database
      const { data: signal, error } = await supabase
        .from('buying_signals')
        .insert({
          ...fundingSignal,
          signal_data: fundingSignal.funding_data,
          detected_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // Store funding-specific details
      await supabase.from('funding_signals').insert({
        signal_id: signal.id,
        company_id: companyId,
        round_type: fundingData.round_type,
        amount: fundingData.amount,
        currency: fundingData.currency || 'USD',
        valuation: fundingData.valuation,
        investors: fundingData.investors,
        lead_investor: fundingData.lead_investor,
        investor_count: fundingData.investors?.length || 0,
        announcement_date: fundingData.announcement_date,
        close_date: fundingData.close_date,
        previous_rounds: fundingSignal.context?.previous_rounds,
        total_raised: fundingSignal.context?.total_raised,
        burn_rate_estimate: fundingSignal.context?.burn_rate_estimate,
        runway_months: fundingSignal.context?.runway_months,
        growth_stage: fundingSignal.context?.growth_stage,
        budget_availability: budgetEstimate,
        expansion_plans: insights.expansion_plans,
        investment_focus: insights.investment_focus,
        hiring_intentions: insights.hiring_intentions,
        technology_upgrade_likely: insights.technology_upgrade_likely
      });

      return signal as FundingSignal;

    } catch (error) {
      console.error('Error detecting funding round:', error);
      return null;
    }
  }

  private calculateSignalStrength(fundingData: any): SignalStrength {
    const amount = fundingData.amount || 0;
    const roundType = fundingData.round_type;

    // Strength based on amount and round type
    if (amount > 50000000 || roundType === 'series_c' || roundType === 'series_d_plus') {
      return 'very_strong';
    } else if (amount > 10000000 || roundType === 'series_b') {
      return 'strong';
    } else if (amount > 2000000 || roundType === 'series_a') {
      return 'moderate';
    } else {
      return 'weak';
    }
  }

  private calculateBuyingProbability(fundingData: any, company: any): number {
    let probability = 50; // Base probability

    // Increase based on round size
    const amount = fundingData.amount || 0;
    if (amount > 50000000) probability += 30;
    else if (amount > 20000000) probability += 25;
    else if (amount > 10000000) probability += 20;
    else if (amount > 5000000) probability += 15;
    else if (amount > 1000000) probability += 10;

    // Adjust based on round type
    const roundType = fundingData.round_type;
    if (roundType === 'series_a') probability += 15;
    else if (roundType === 'series_b') probability += 20;
    else if (roundType === 'series_c') probability += 25;

    // Consider company growth rate
    if (company.growth_rate === 'high') probability += 10;

    // Consider investor quality
    if (fundingData.investors?.some((i: Investor) => i.type === 'vc')) {
      probability += 10;
    }

    return Math.min(100, probability);
  }

  private generateFundingInsights(fundingData: any, company: any) {
    const amount = fundingData.amount || 0;
    const roundType = fundingData.round_type;

    const insights = {
      expansion_plans: [] as string[],
      investment_focus: [] as string[],
      hiring_intentions: false,
      technology_upgrade_likely: false
    };

    // Expansion plans based on round type and size
    if (roundType === 'series_a' || roundType === 'series_b') {
      insights.expansion_plans = ['Product development', 'Market expansion', 'Team growth'];
      insights.hiring_intentions = true;
    } else if (roundType === 'series_c' || roundType === 'series_d_plus') {
      insights.expansion_plans = ['International expansion', 'M&A activity', 'Enterprise features'];
    }

    // Investment focus
    if (amount > 10000000) {
      insights.investment_focus = ['Technology infrastructure', 'Sales & Marketing', 'R&D'];
      insights.technology_upgrade_likely = true;
    } else if (amount > 5000000) {
      insights.investment_focus = ['Product development', 'Customer acquisition', 'Operations'];
      insights.technology_upgrade_likely = true;
    } else {
      insights.investment_focus = ['Core product', 'Initial team', 'Market validation'];
    }

    // Technology upgrade likelihood
    if (company.industry === 'Technology' || company.industry === 'SaaS') {
      insights.technology_upgrade_likely = true;
    }

    return insights;
  }

  private estimateBudgetAvailability(fundingData: any): BudgetEstimate {
    const amount = fundingData.amount || 0;

    // Estimate 20-30% of funding for technology/vendors
    const techBudget = amount * 0.25;

    return {
      estimated_amount: techBudget,
      confidence: 70,
      allocation_areas: [
        'Technology infrastructure',
        'Software licenses',
        'Professional services',
        'Marketing tools'
      ],
      timeline: {
        start: new Date(),
        end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
      }
    };
  }

  private generateRecommendations(fundingData: any, insights: any): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];

    // Immediate outreach for large rounds
    if (fundingData.amount > 10000000) {
      recommendations.push({
        action: 'Schedule executive briefing on scaling solutions',
        priority: 'urgent',
        timeline: '1-2 weeks',
        resources_needed: ['Executive deck', 'ROI calculator', 'Case studies']
      });
    }

    // Technology upgrade opportunities
    if (insights.technology_upgrade_likely) {
      recommendations.push({
        action: 'Send technology assessment and upgrade path proposal',
        priority: 'high',
        timeline: '2-3 weeks',
        resources_needed: ['Technical assessment', 'Migration plan', 'Cost analysis']
      });
    }

    // Hiring support
    if (insights.hiring_intentions) {
      recommendations.push({
        action: 'Offer team onboarding and productivity solutions',
        priority: 'medium',
        timeline: '1 month',
        resources_needed: ['Onboarding tools', 'Training resources']
      });
    }

    return recommendations;
  }

  private calculateEngagementWindow(fundingData: any) {
    const announcementDate = new Date(fundingData.announcement_date || Date.now());

    // Optimal engagement is 2-8 weeks after funding announcement
    return {
      optimal_start: new Date(announcementDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      optimal_end: new Date(announcementDate.getTime() + 56 * 24 * 60 * 60 * 1000),
      reason: 'Post-funding planning and budget allocation phase'
    };
  }

  private calculateConfidenceScore(fundingData: any): number {
    let confidence = 60; // Base confidence

    // Increase confidence based on data completeness
    if (fundingData.amount) confidence += 10;
    if (fundingData.investors?.length > 0) confidence += 10;
    if (fundingData.valuation) confidence += 10;
    if (fundingData.source_reliability === 'verified') confidence += 10;

    return Math.min(100, confidence);
  }

  private assessImpact(fundingData: any, company: any): ImpactAssessment {
    const amount = fundingData.amount || 0;

    return {
      revenue_impact: amount * 0.05, // Estimate 5% could be vendor spend
      urgency_level: amount > 10000000 ? 9 : 6,
      decision_timeline: '3-6 months',
      budget_implications: 'Significant budget available for new initiatives',
      strategic_alignment: 85
    };
  }

  private estimateBurnRate(fundingData: any, company: any): number {
    // Simple burn rate estimation based on funding amount and stage
    const amount = fundingData.amount || 0;
    const monthlyBurn = amount / 18; // Assume 18 months runway target

    return monthlyBurn;
  }

  private calculateRunway(fundingData: any, company: any): number {
    const amount = fundingData.amount || 0;
    const burnRate = this.estimateBurnRate(fundingData, company);

    if (burnRate === 0) return 0;

    return Math.round(amount / burnRate);
  }

  private determineGrowthStage(roundType: RoundType): GrowthStage {
    switch (roundType) {
      case 'seed':
        return 'early';
      case 'series_a':
        return 'growth';
      case 'series_b':
      case 'series_c':
        return 'expansion';
      case 'series_d_plus':
      case 'ipo':
        return 'mature';
      default:
        return 'growth';
    }
  }

  private async checkDuplicateFunding(companyId: string, fundingData: any): Promise<boolean> {
    const supabase = await createClient();

    // Check for similar funding signals in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from('funding_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('round_type', fundingData.round_type)
      .eq('amount', fundingData.amount)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return existing && existing.length > 0;
  }

  private async getPreviousFundingRounds(companyId: string): Promise<FundingRound[]> {
    const supabase = await createClient();

    const { data: previousRounds } = await supabase
      .from('funding_signals')
      .select('round_type, amount, announcement_date')
      .eq('company_id', companyId)
      .order('announcement_date', { ascending: false })
      .limit(5);

    if (!previousRounds) return [];

    return previousRounds.map(round => ({
      round_type: round.round_type as RoundType,
      amount: round.amount,
      date: round.announcement_date
    }));
  }

  private async calculateTotalRaised(companyId: string, currentAmount: number): Promise<number> {
    const supabase = await createClient();

    const { data: rounds } = await supabase
      .from('funding_signals')
      .select('amount')
      .eq('company_id', companyId);

    const previousTotal = rounds?.reduce((sum, round) => sum + (round.amount || 0), 0) || 0;
    return previousTotal + currentAmount;
  }

  // Public method to validate funding data
  async validateFundingData(signal: FundingSignal): Promise<boolean> {
    // Validate required fields
    if (!signal.funding_data.amount || !signal.funding_data.round_type) {
      return false;
    }

    // Validate amount is reasonable
    if (signal.funding_data.amount < 0 || signal.funding_data.amount > 10000000000) {
      return false;
    }

    // Validate dates
    const announcementDate = new Date(signal.funding_data.announcement_date);
    if (announcementDate > new Date()) {
      return false; // Can't have future announcement dates
    }

    return true;
  }

  // Monitor multiple companies for funding signals
  async monitorCompaniesForFunding(companyIds: string[]): Promise<FundingSignal[]> {
    const signals: FundingSignal[] = [];

    for (const companyId of companyIds) {
      // This would typically integrate with external APIs
      // For now, we'll check for any recent funding data
      const signal = await this.checkForRecentFunding(companyId);
      if (signal) {
        signals.push(signal);
      }
    }

    return signals;
  }

  private async checkForRecentFunding(companyId: string): Promise<FundingSignal | null> {
    // This would integrate with external data sources
    // Placeholder implementation
    return null;
  }
}

export default FundingSignalDetector.getInstance();