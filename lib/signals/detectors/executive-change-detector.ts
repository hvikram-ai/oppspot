import { createClient } from '@/lib/supabase/server';
import type { Row } from '@/lib/supabase/helpers'
import {
  ExecutiveChangeSignal,
  Executive,
  ExecutiveLevel,
  ChangeType,
  DecisionImpact,
  Initiative,
  VendorPreference,
  TechnologyPreference,
  SignalStrength,
  ImpactAssessment,
  RecommendedAction,
  IntroductionPath,
  Connection
} from '../types/buying-signals';

// Executive change data interface
export interface ExecutiveChangeData {
  position: string
  department?: string
  incoming_executive?: Executive
  outgoing_executive?: Executive
  change_type: ChangeType
  effective_date?: Date
  announcement_date?: Date
  source: string
}

// Company data interface (reused from technology-adoption-detector)
export interface CompanyData {
  id: string
  name: string
  employee_count?: string
  growth_rate?: 'high' | 'medium' | 'low'
  [key: string]: unknown
}

// Executive impact interface
export interface ExecutiveImpact {
  decision_making_impact: DecisionImpact
  budget_authority: boolean
  likely_initiatives: Initiative[]
  vendor_preferences: VendorPreference[]
  technology_bias: TechnologyPreference[]
}

// Executive intelligence interface
export interface ExecutiveIntelligence {
  previous_companies: Array<{ name: string; industry: string }>
  previous_vendors_used: string[]
  known_methodologies: string[]
  published_articles: string[]
  speaking_engagements: string[]
  social_media_presence: string[]
}

// Executive opportunity scores interface
export interface ExecutiveOpportunity {
  relevance_score: number
  timing_score: number
  influence_score: number
  accessibility_score: number
}

// Engagement strategy interface
export interface EngagementStrategy {
  approach: 'immediate' | 'warming' | 'educational' | 'referral'
  key_messages: string[]
  value_propositions: string[]
  introduction_paths: IntroductionPath[]
  common_connections: Connection[]
}

// Executive background analysis interface
export interface ExecutiveBackground {
  preferred_vendors: string[]
  technology_stack_experience: string[]
  methodology_preferences: string[]
  budget_management_style: 'aggressive' | 'balanced' | 'conservative'
  decision_making_style: 'collaborative' | 'autocratic' | 'delegative'
}

export class ExecutiveChangeDetector {
  private static instance: ExecutiveChangeDetector;

  private constructor() {}

  static getInstance(): ExecutiveChangeDetector {
    if (!this.instance) {
      this.instance = new ExecutiveChangeDetector();
    }
    return this.instance;
  }

  async detectExecutiveChange(
    companyId: string,
    changeData: ExecutiveChangeData
  ): Promise<ExecutiveChangeSignal | null> {
    const supabase = await createClient();

    try {
      // Check for duplicate signals
      const isDuplicate = await this.checkDuplicateExecutiveChange(companyId, changeData);
      if (isDuplicate) {
        console.log('Duplicate executive change signal detected, skipping');
        return null;
      }

      // Get company context
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single() as { data: Row<'businesses'> | null; error: any };

      if (!company) {
        throw new Error('Company not found');
      }

      // Analyze the executive change
      const signalStrength = this.calculateSignalStrength(changeData);
      const buyingProbability = this.calculateBuyingProbability(changeData, company);

      // Assess impact
      const impact = this.assessExecutiveImpact(changeData, company);

      // Generate intelligence
      const intelligence = await this.gatherExecutiveIntelligence(changeData.incoming_executive);

      // Calculate opportunity scores
      const opportunity = this.calculateOpportunityScores(changeData, company, intelligence);

      // Generate engagement strategy
      const engagementStrategy = this.generateEngagementStrategy(
        changeData,
        intelligence,
        opportunity
      );

      // Create the executive change signal
      const executiveSignal: Partial<ExecutiveChangeSignal> = {
        company_id: companyId,
        signal_type: 'executive_change',
        signal_category: 'organizational',
        signal_strength: signalStrength,
        confidence_score: this.calculateConfidenceScore(changeData),
        buying_probability: buyingProbability,
        signal_date: changeData.effective_date || new Date(),

        change_data: {
          position: changeData.position,
          level: this.determineExecutiveLevel(changeData.position) as ExecutiveLevel,
          department: changeData.department,
          incoming_executive: changeData.incoming_executive,
          outgoing_executive: changeData.outgoing_executive,
          change_type: changeData.change_type as ChangeType,
          effective_date: changeData.effective_date,
          announcement_date: changeData.announcement_date || new Date(),
          source: changeData.source
        },

        impact,
        intelligence,
        opportunity,
        engagement_strategy: engagementStrategy,

        impact_assessment: this.createImpactAssessment(changeData, impact),
        recommended_actions: this.generateRecommendedActions(changeData, opportunity),
        engagement_window: this.calculateEngagementWindow(changeData),

        source: changeData.source,
        source_url: changeData.source_url,
        source_reliability: changeData.source_reliability || 'high',
        status: 'detected'
      };

      // Store the signal in database
      const { data: signal, error } = await supabase
        .from('buying_signals')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          ...executiveSignal,
          signal_data: executiveSignal.change_data,
          detected_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // @ts-expect-error - Supabase type inference issue
      // Store executive-specific details
      await supabase.from('executive_change_signals').insert({
        signal_id: signal.id,
        company_id: companyId,
        position_title: changeData.position,
        position_level: executiveSignal.change_data?.level,
        department: changeData.department,
        incoming_executive: changeData.incoming_executive,
        outgoing_executive: changeData.outgoing_executive,
        change_type: changeData.change_type,
        effective_date: changeData.effective_date,
        announcement_date: changeData.announcement_date,
        decision_making_impact: impact.decision_making_impact,
        budget_authority: impact.budget_authority,
        likely_initiatives: impact.likely_initiatives,
        vendor_preferences: impact.vendor_preferences,
        technology_bias: impact.technology_bias,
        previous_companies: intelligence?.previous_companies,
        previous_vendors_used: intelligence?.previous_vendors_used,
        known_methodologies: intelligence?.known_methodologies,
        relevance_score: opportunity.relevance_score,
        timing_score: opportunity.timing_score,
        influence_score: opportunity.influence_score,
        accessibility_score: opportunity.accessibility_score
      });

      return signal as ExecutiveChangeSignal;

    } catch (error) {
      console.error('Error detecting executive change:', error);
      return null;
    }
  }

  private calculateSignalStrength(changeData: ExecutiveChangeData): SignalStrength {
    const level = this.determineExecutiveLevel(changeData.position);
    const changeType = changeData.change_type;

    // C-suite changes are very strong signals
    if (level === 'c_suite' && changeType === 'new_hire') {
      return 'very_strong';
    }

    // VP level or C-suite promotions are strong
    if (level === 'vp' || (level === 'c_suite' && changeType === 'promotion')) {
      return 'strong';
    }

    // Director level changes are moderate
    if (level === 'director') {
      return 'moderate';
    }

    return 'weak';
  }

  private calculateBuyingProbability(changeData: ExecutiveChangeData, company: CompanyData): number {
    let probability = 40; // Base probability

    const level = this.determineExecutiveLevel(changeData.position);
    const department = changeData.department?.toLowerCase();

    // Increase based on level
    if (level === 'c_suite') probability += 30;
    else if (level === 'vp') probability += 20;
    else if (level === 'director') probability += 10;

    // Increase based on department relevance
    if (department?.includes('technology') || department?.includes('it')) {
      probability += 20;
    } else if (department?.includes('operations') || department?.includes('sales')) {
      probability += 15;
    } else if (department?.includes('marketing')) {
      probability += 10;
    }

    // New hires have higher probability than departures
    if (changeData.change_type === 'new_hire') {
      probability += 15;
    } else if (changeData.change_type === 'promotion') {
      probability += 10;
    }

    // Consider company growth
    if (company.growth_rate === 'high') {
      probability += 10;
    }

    return Math.min(100, probability);
  }

  private assessExecutiveImpact(changeData: ExecutiveChangeData, company: CompanyData): ExecutiveImpact {
    const level = this.determineExecutiveLevel(changeData.position);
    const department = changeData.department?.toLowerCase();

    const impact: ExecutiveImpact = {
      decision_making_impact: 'low' as DecisionImpact,
      budget_authority: false,
      likely_initiatives: [] as Initiative[],
      vendor_preferences: [] as VendorPreference[],
      technology_bias: [] as TechnologyPreference[]
    };

    // Assess decision-making impact
    if (level === 'c_suite') {
      impact.decision_making_impact = 'high';
      impact.budget_authority = true;
    } else if (level === 'vp') {
      impact.decision_making_impact = 'medium';
      impact.budget_authority = true;
    } else if (level === 'director') {
      impact.decision_making_impact = 'medium';
      impact.budget_authority = department?.includes('technology') || department?.includes('it');
    }

    // Predict likely initiatives based on role
    if (department?.includes('technology') || department?.includes('it')) {
      impact.likely_initiatives = [
        {
          name: 'Digital transformation',
          type: 'technology',
          priority: 'high',
          timeline: '6-12 months',
          budget_impact: 'significant'
        },
        {
          name: 'Cloud migration',
          type: 'infrastructure',
          priority: 'high',
          timeline: '3-6 months',
          budget_impact: 'moderate'
        },
        {
          name: 'Tool consolidation',
          type: 'optimization',
          priority: 'medium',
          timeline: '3-6 months',
          budget_impact: 'moderate'
        }
      ];

      impact.technology_bias = [
        { technology: 'Cloud platforms', preference: 'positive', experience_level: 'high' },
        { technology: 'AI/ML tools', preference: 'positive', experience_level: 'medium' },
        { technology: 'Legacy systems', preference: 'negative', experience_level: 'high' }
      ];
    } else if (department?.includes('sales')) {
      impact.likely_initiatives = [
        {
          name: 'Sales enablement',
          type: 'process',
          priority: 'high',
          timeline: '3-6 months',
          budget_impact: 'moderate'
        },
        {
          name: 'CRM optimization',
          type: 'technology',
          priority: 'high',
          timeline: '1-3 months',
          budget_impact: 'moderate'
        }
      ];
    } else if (department?.includes('marketing')) {
      impact.likely_initiatives = [
        {
          name: 'MarTech stack upgrade',
          type: 'technology',
          priority: 'high',
          timeline: '3-6 months',
          budget_impact: 'significant'
        },
        {
          name: 'Analytics implementation',
          type: 'technology',
          priority: 'medium',
          timeline: '3-6 months',
          budget_impact: 'moderate'
        }
      ];
    }

    return impact;
  }

  private async gatherExecutiveIntelligence(executive: Executive | undefined): Promise<ExecutiveIntelligence | null> {
    if (!executive) return null;

    // This would typically integrate with LinkedIn API, news sources, etc.
    // For now, returning structured placeholder data
    return {
      previous_companies: [
        { name: executive.previous_company || 'Unknown', industry: 'Technology' }
      ],
      previous_vendors_used: [],
      known_methodologies: ['Agile', 'DevOps', 'Lean'],
      published_articles: [],
      speaking_engagements: [],
      social_media_presence: []
    };
  }

  private calculateOpportunityScores(changeData: ExecutiveChangeData, company: CompanyData, intelligence: ExecutiveIntelligence | null): ExecutiveOpportunity {
    const level = this.determineExecutiveLevel(changeData.position);
    const department = changeData.department?.toLowerCase();

    let relevanceScore = 50;
    let timingScore = 50;
    let influenceScore = 50;
    let accessibilityScore = 50;

    // Relevance based on department
    if (department?.includes('technology') || department?.includes('it')) {
      relevanceScore = 90;
    } else if (department?.includes('operations')) {
      relevanceScore = 75;
    } else if (department?.includes('sales') || department?.includes('marketing')) {
      relevanceScore = 70;
    }

    // Timing based on change type
    if (changeData.change_type === 'new_hire') {
      timingScore = 85; // New hires make changes quickly
    } else if (changeData.change_type === 'promotion') {
      timingScore = 70; // Promotions also drive change
    }

    // Influence based on level
    if (level === 'c_suite') {
      influenceScore = 95;
    } else if (level === 'vp') {
      influenceScore = 75;
    } else if (level === 'director') {
      influenceScore = 60;
    }

    // Accessibility (simplified for now)
    if (changeData.change_type === 'new_hire') {
      accessibilityScore = 70; // New executives often open to vendor meetings
    }

    return {
      relevance_score: relevanceScore,
      timing_score: timingScore,
      influence_score: influenceScore,
      accessibility_score: accessibilityScore
    };
  }

  private generateEngagementStrategy(changeData: ExecutiveChangeData, intelligence: ExecutiveIntelligence | null, opportunity: ExecutiveOpportunity): EngagementStrategy {
    const strategy: EngagementStrategy = {
      approach: 'warming' as const,
      key_messages: [],
      value_propositions: [],
      introduction_paths: [] as IntroductionPath[],
      common_connections: [] as Connection[]
    };

    // Determine approach based on scores
    if (opportunity.timing_score > 80 && opportunity.relevance_score > 80) {
      strategy.approach = 'immediate';
    } else if (opportunity.relevance_score > 70) {
      strategy.approach = 'warming';
    } else if (opportunity.relevance_score > 50) {
      strategy.approach = 'educational';
    } else {
      strategy.approach = 'referral';
    }

    // Generate key messages based on role
    const department = changeData.department?.toLowerCase();
    if (department?.includes('technology')) {
      strategy.key_messages = [
        'Congratulations on your new role - exciting times ahead for technology transformation',
        'We help technology leaders achieve quick wins in their first 100 days',
        'Our solutions align with modern technology strategies'
      ];

      strategy.value_propositions = [
        'Rapid time to value - show impact within 30 days',
        'Proven success with similar companies in your industry',
        'Risk-free pilot programs for new executives'
      ];
    } else if (department?.includes('sales')) {
      strategy.key_messages = [
        'Accelerate sales performance in your new role',
        'Drive revenue growth with proven sales enablement',
        'Quick wins to establish your leadership impact'
      ];

      strategy.value_propositions = [
        'Increase sales productivity by 30%',
        'Reduce ramp time for new hires by 50%',
        'Improve win rates with better insights'
      ];
    }

    // Suggest introduction paths
    if (strategy.approach === 'immediate' || strategy.approach === 'warming') {
      strategy.introduction_paths = [
        { path_type: 'Direct LinkedIn outreach', strength: 70 },
        { path_type: 'Executive briefing invitation', strength: 80 },
        { path_type: 'Industry event introduction', strength: 60 }
      ];
    } else {
      strategy.introduction_paths = [
        { path_type: 'Referral from peer', intermediary: 'Industry contact', strength: 90 },
        { path_type: 'Content engagement', strength: 50 },
        { path_type: 'Webinar invitation', strength: 40 }
      ];
    }

    return strategy;
  }

  private determineExecutiveLevel(position: string): ExecutiveLevel {
    const title = position.toLowerCase();

    if (title.includes('chief') || title.includes('ceo') || title.includes('cto') ||
        title.includes('cfo') || title.includes('cio') || title.includes('cmo') ||
        title.includes('coo') || title.includes('cpo') || title.includes('cro')) {
      return 'c_suite';
    } else if (title.includes('vice president') || title.includes('vp ') || title === 'vp') {
      return 'vp';
    } else if (title.includes('director')) {
      return 'director';
    } else {
      return 'manager';
    }
  }

  private calculateConfidenceScore(changeData: ExecutiveChangeData): number {
    let confidence = 60; // Base confidence

    // Increase based on data completeness
    if (changeData.incoming_executive) confidence += 10;
    if (changeData.effective_date) confidence += 10;
    if (changeData.announcement_date) confidence += 5;
    if (changeData.source_reliability === 'verified') confidence += 15;

    return Math.min(100, confidence);
  }

  private createImpactAssessment(changeData: ExecutiveChangeData, impact: ExecutiveImpact): ImpactAssessment {
    const level = this.determineExecutiveLevel(changeData.position);

    return {
      revenue_impact: level === 'c_suite' ? 1000000 : 500000,
      urgency_level: changeData.change_type === 'new_hire' ? 8 : 6,
      decision_timeline: '3-6 months',
      budget_implications: impact.budget_authority ? 'Direct budget control' : 'Influence on budget',
      strategic_alignment: 80
    };
  }

  private generateRecommendedActions(changeData: ExecutiveChangeData, opportunity: ExecutiveOpportunity): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (opportunity.timing_score > 80) {
      actions.push({
        action: 'Send personalized congratulations and introduction',
        priority: 'urgent',
        timeline: '1-2 days',
        resources_needed: ['Executive brief', 'Personalized message template']
      });
    }

    if (opportunity.relevance_score > 70) {
      actions.push({
        action: 'Schedule executive briefing on industry best practices',
        priority: 'high',
        timeline: '1-2 weeks',
        resources_needed: ['Industry report', 'Executive presentation', 'Success stories']
      });
    }

    actions.push({
      action: 'Add to executive nurture campaign',
      priority: 'medium',
      timeline: 'Immediate',
      resources_needed: ['Email sequences', 'Thought leadership content']
    });

    if (opportunity.accessibility_score > 60) {
      actions.push({
        action: 'Request introduction through mutual connection',
        priority: 'medium',
        timeline: '1 week',
        resources_needed: ['Connection mapping', 'Introduction template']
      });
    }

    return actions;
  }

  private calculateEngagementWindow(changeData: ExecutiveChangeData) {
    const effectiveDate = new Date(changeData.effective_date || Date.now());

    // Optimal engagement is 2-4 weeks after start date for new hires
    if (changeData.change_type === 'new_hire') {
      return {
        optimal_start: new Date(effectiveDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        optimal_end: new Date(effectiveDate.getTime() + 28 * 24 * 60 * 60 * 1000),
        reason: 'New executive settling in and evaluating vendor landscape'
      };
    } else {
      // For promotions/reorgs, engage sooner
      return {
        optimal_start: new Date(effectiveDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        optimal_end: new Date(effectiveDate.getTime() + 21 * 24 * 60 * 60 * 1000),
        reason: 'Executive planning new initiatives in expanded role'
      };
    }
  }

  private async checkDuplicateExecutiveChange(companyId: string, changeData: ExecutiveChangeData): Promise<boolean> {
    const supabase = await createClient();

    // Check for similar executive changes in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from('executive_change_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('position_title', changeData.position)
      .gte('created_at', thirtyDaysAgo.toISOString() as { data: Row<'executive_change_signals'>[] | null; error: any });

    return existing && existing.length > 0;
  }

  // Track multiple executive moves
  async trackExecutiveMove(executive: Executive): Promise<ExecutiveChangeSignal[]> {
    const signals: ExecutiveChangeSignal[] = [];

    // This would integrate with LinkedIn API, news monitoring, etc.
    // Placeholder for tracking executive career moves

    return signals;
  }

  // Analyze executive background for vendor preferences
  async analyzeExecutiveBackground(executive: Executive): Promise<ExecutiveBackground> {
    // This would analyze previous roles, companies, and public statements
    // to understand technology preferences and vendor relationships

    return {
      preferred_vendors: [],
      technology_stack_experience: [],
      methodology_preferences: [],
      budget_management_style: 'balanced',
      decision_making_style: 'collaborative'
    };
  }
}

export default ExecutiveChangeDetector.getInstance();