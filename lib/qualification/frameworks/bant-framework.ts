import { createClient } from '@/lib/supabase/server';
import type {
  BANTQualification,
  CalculateBANTRequest,
  DecisionMaker,
  PainPoint,
  UseCase,
  QualificationAction
} from '../types/qualification';

export class BANTFramework {
  private supabase;

  constructor() {
    // Initialize in methods to handle async
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Calculate BANT qualification score for a lead
   */
  async calculateBANT(request: CalculateBANTRequest): Promise<BANTQualification | null> {
    try {
      const supabase = await this.getSupabase();

      // Get existing qualification or create new
      let qualification: BANTQualification;

      const { data: existing } = await supabase
        .from('bant_qualifications')
        .select('*')
        .eq('lead_id', request.lead_id)
        .eq('company_id', request.company_id)
        .single();

      if (existing) {
        qualification = this.mapFromDatabase(existing);
      } else {
        qualification = this.createEmptyQualification(request.lead_id, request.company_id);
      }

      // Merge with provided data
      if (request.data) {
        qualification = { ...qualification, ...request.data };
      }

      // Auto-populate if requested
      if (request.auto_populate) {
        qualification = await this.autoPopulateData(qualification);
      }

      // Calculate scores
      qualification.budget.score = this.calculateBudgetScore(qualification.budget);
      qualification.authority.score = this.calculateAuthorityScore(qualification.authority);
      qualification.need.score = this.calculateNeedScore(qualification.need);
      qualification.timeline.score = this.calculateTimelineScore(qualification.timeline);

      // Calculate overall score and status
      qualification.overall_score = this.calculateOverallScore(qualification);
      qualification.qualification_status = this.determineQualificationStatus(qualification.overall_score);

      // Generate next actions
      qualification.next_actions = this.generateNextActions(qualification);

      // Save to database
      const saved = await this.saveQualification(qualification);

      return saved;

    } catch (error) {
      console.error('BANT calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate Budget score (0-100)
   */
  private calculateBudgetScore(budget: BANTQualification['budget']): number {
    let score = 0;

    // Budget confirmation (40 points)
    if (budget.budget_confirmed) {
      score += 40;
    } else if (budget.budget_source === 'estimated') {
      score += 20;
    } else if (budget.budget_source === 'inferred') {
      score += 10;
    }

    // Budget range adequacy (30 points)
    const rangeScores = {
      'under_10k': 10,
      '10k_50k': 15,
      '50k_100k': 20,
      '100k_500k': 25,
      'over_500k': 30
    };
    score += rangeScores[budget.budget_range] || 0;

    // Financial health indicators (30 points)
    if (budget.financial_indicators) {
      const indicators = budget.financial_indicators;

      // Revenue size (10 points)
      if (indicators.revenue) {
        if (indicators.revenue > 10000000) score += 10;
        else if (indicators.revenue > 5000000) score += 7;
        else if (indicators.revenue > 1000000) score += 5;
        else if (indicators.revenue > 500000) score += 3;
      }

      // Growth rate (10 points)
      if (indicators.growth_rate) {
        if (indicators.growth_rate > 50) score += 10;
        else if (indicators.growth_rate > 20) score += 7;
        else if (indicators.growth_rate > 10) score += 5;
        else if (indicators.growth_rate > 0) score += 3;
      }

      // Funding status (5 points)
      if (indicators.funding_status) {
        const fundingScores: Record<string, number> = {
          'series_c+': 5,
          'series_b': 4,
          'series_a': 3,
          'seed': 2,
          'bootstrapped': 1
        };
        score += fundingScores[indicators.funding_status.toLowerCase()] || 0;
      }

      // Credit score (5 points)
      if (indicators.credit_score) {
        if (indicators.credit_score >= 80) score += 5;
        else if (indicators.credit_score >= 70) score += 4;
        else if (indicators.credit_score >= 60) score += 3;
        else if (indicators.credit_score >= 50) score += 2;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate Authority score (0-100)
   */
  private calculateAuthorityScore(authority: BANTQualification['authority']): number {
    let score = 0;

    // Decision makers identified (30 points)
    const dmCount = authority.decision_makers.length;
    if (dmCount > 0) {
      score += Math.min(30, dmCount * 10);

      // Executive involvement (20 points)
      const hasExecutive = authority.decision_makers.some(
        dm => dm.authority_level === 'executive'
      );
      if (hasExecutive) score += 20;

      // Engagement status (10 points)
      const engagedCount = authority.decision_makers.filter(
        dm => dm.engagement_status === 'engaged'
      ).length;
      score += Math.min(10, engagedCount * 5);
    }

    // Buying committee size appropriateness (10 points)
    if (authority.buying_committee_size > 0) {
      if (authority.buying_committee_size >= 3 && authority.buying_committee_size <= 7) {
        score += 10;
      } else if (authority.buying_committee_size < 3) {
        score += 5;
      } else {
        score += 3; // Too large committee can be problematic
      }
    }

    // Engagement levels (30 points)
    const engagement = authority.engagement_level;
    score += Math.min(15, (engagement.executive / 100) * 15);
    score += Math.min(10, (engagement.manager / 100) * 10);
    score += Math.min(5, (engagement.user / 100) * 5);

    return Math.min(100, score);
  }

  /**
   * Calculate Need score (0-100)
   */
  private calculateNeedScore(need: BANTQualification['need']): number {
    let score = 0;

    // Problem acknowledgment (20 points)
    if (need.problem_acknowledgment) {
      score += 20;
    }

    // Pain points identified (25 points)
    const painPointsScore = Math.min(25, need.pain_points.length * 5);
    score += painPointsScore;

    // Pain point severity bonus (15 points)
    const criticalPains = need.pain_points.filter(p => p.severity === 'critical').length;
    const highPains = need.pain_points.filter(p => p.severity === 'high').length;
    score += Math.min(15, criticalPains * 10 + highPains * 5);

    // Use cases defined (15 points)
    const useCasesScore = Math.min(15, need.use_cases.length * 5);
    score += useCasesScore;

    // Urgency level (15 points)
    const urgencyScores = {
      'critical': 15,
      'high': 10,
      'medium': 5,
      'low': 2
    };
    score += urgencyScores[need.urgency_level] || 0;

    // Solution fit (10 points)
    score += Math.min(10, (need.solution_fit_score / 100) * 10);

    return Math.min(100, score);
  }

  /**
   * Calculate Timeline score (0-100)
   */
  private calculateTimelineScore(timeline: BANTQualification['timeline']): number {
    let score = 0;

    // Decision date proximity (30 points)
    if (timeline.decision_date) {
      const daysUntilDecision = this.getDaysUntilDate(timeline.decision_date);
      if (daysUntilDecision <= 30) score += 30;
      else if (daysUntilDecision <= 60) score += 25;
      else if (daysUntilDecision <= 90) score += 20;
      else if (daysUntilDecision <= 180) score += 15;
      else if (daysUntilDecision <= 365) score += 10;
      else score += 5;
    }

    // Implementation date set (15 points)
    if (timeline.implementation_date) {
      score += 15;
    }

    // Buying stage progression (25 points)
    const stageScores = {
      'awareness': 5,
      'consideration': 15,
      'decision': 25,
      'purchase': 25
    };
    score += stageScores[timeline.buying_stage] || 0;

    // Urgency indicators (20 points)
    const urgencyIndicatorScore = Math.min(20, timeline.urgency_indicators.length * 5);
    score += urgencyIndicatorScore;

    // Timeline confidence (10 points)
    score += Math.min(10, (timeline.timeline_confidence / 100) * 10);

    return Math.min(100, score);
  }

  /**
   * Calculate overall BANT score
   */
  private calculateOverallScore(qualification: BANTQualification): number {
    // Weighted average of BANT components
    const weights = {
      budget: 0.3,
      authority: 0.25,
      need: 0.25,
      timeline: 0.2
    };

    const score =
      qualification.budget.score * weights.budget +
      qualification.authority.score * weights.authority +
      qualification.need.score * weights.need +
      qualification.timeline.score * weights.timeline;

    return Math.round(score);
  }

  /**
   * Determine qualification status based on score
   */
  private determineQualificationStatus(score: number): BANTQualification['qualification_status'] {
    if (score >= 70) return 'qualified';
    if (score >= 40) return 'nurture';
    return 'disqualified';
  }

  /**
   * Generate next actions based on BANT analysis
   */
  private generateNextActions(qualification: BANTQualification): QualificationAction[] {
    const actions: QualificationAction[] = [];

    // Budget-related actions
    if (qualification.budget.score < 50) {
      if (!qualification.budget.budget_confirmed) {
        actions.push({
          action: 'Confirm budget availability with decision maker',
          priority: 'high',
          due_date: this.getDateFromNow(7)
        });
      }
      if (!qualification.budget.financial_indicators?.revenue) {
        actions.push({
          action: 'Gather financial health indicators',
          priority: 'medium',
          due_date: this.getDateFromNow(14)
        });
      }
    }

    // Authority-related actions
    if (qualification.authority.score < 50) {
      if (qualification.authority.decision_makers.length === 0) {
        actions.push({
          action: 'Identify and map decision makers',
          priority: 'urgent',
          due_date: this.getDateFromNow(3)
        });
      }
      const unengaged = qualification.authority.decision_makers.filter(
        dm => dm.engagement_status !== 'engaged'
      );
      if (unengaged.length > 0) {
        actions.push({
          action: `Engage unengaged stakeholders: ${unengaged.map(dm => dm.name).join(', ')}`,
          priority: 'high',
          due_date: this.getDateFromNow(7)
        });
      }
    }

    // Need-related actions
    if (qualification.need.score < 50) {
      if (!qualification.need.problem_acknowledgment) {
        actions.push({
          action: 'Secure problem acknowledgment from stakeholder',
          priority: 'high',
          due_date: this.getDateFromNow(5)
        });
      }
      if (qualification.need.pain_points.length < 2) {
        actions.push({
          action: 'Conduct discovery to identify additional pain points',
          priority: 'medium',
          due_date: this.getDateFromNow(10)
        });
      }
    }

    // Timeline-related actions
    if (qualification.timeline.score < 50) {
      if (!qualification.timeline.decision_date) {
        actions.push({
          action: 'Establish decision timeline with stakeholder',
          priority: 'high',
          due_date: this.getDateFromNow(7)
        });
      }
      if (qualification.timeline.buying_stage === 'awareness') {
        actions.push({
          action: 'Move prospect to consideration stage with targeted content',
          priority: 'medium',
          due_date: this.getDateFromNow(14)
        });
      }
    }

    // Overall qualification actions
    if (qualification.qualification_status === 'qualified') {
      actions.push({
        action: 'Schedule demo/proposal presentation',
        priority: 'urgent',
        due_date: this.getDateFromNow(3)
      });
    } else if (qualification.qualification_status === 'nurture') {
      actions.push({
        action: 'Add to nurture campaign and set follow-up cadence',
        priority: 'medium',
        due_date: this.getDateFromNow(7)
      });
    }

    return actions;
  }

  /**
   * Auto-populate BANT data from various sources
   */
  private async autoPopulateData(qualification: BANTQualification): Promise<BANTQualification> {
    const supabase = await this.getSupabase();

    try {
      // Get company data
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', qualification.company_id)
        .single();

      if (company) {
        // Populate budget indicators from company data
        if (!qualification.budget.financial_indicators) {
          qualification.budget.financial_indicators = {};
        }

        if (company.annual_revenue) {
          qualification.budget.financial_indicators.revenue = company.annual_revenue;

          // Estimate budget range based on revenue
          if (!qualification.budget.budget_range) {
            if (company.annual_revenue > 50000000) {
              qualification.budget.budget_range = 'over_500k';
            } else if (company.annual_revenue > 10000000) {
              qualification.budget.budget_range = '100k_500k';
            } else if (company.annual_revenue > 5000000) {
              qualification.budget.budget_range = '50k_100k';
            } else if (company.annual_revenue > 1000000) {
              qualification.budget.budget_range = '10k_50k';
            } else {
              qualification.budget.budget_range = 'under_10k';
            }
          }
        }

        if (company.employee_count) {
          // Estimate buying committee size based on company size
          if (!qualification.authority.buying_committee_size) {
            if (company.employee_count > 1000) {
              qualification.authority.buying_committee_size = 7;
            } else if (company.employee_count > 500) {
              qualification.authority.buying_committee_size = 5;
            } else if (company.employee_count > 100) {
              qualification.authority.buying_committee_size = 4;
            } else if (company.employee_count > 50) {
              qualification.authority.buying_committee_size = 3;
            } else {
              qualification.authority.buying_committee_size = 2;
            }
          }
        }
      }

      // Get engagement data
      const { data: engagements } = await supabase
        .from('engagement_events')
        .select('*')
        .eq('lead_id', qualification.lead_id)
        .order('event_date', { ascending: false })
        .limit(10);

      if (engagements && engagements.length > 0) {
        // Analyze engagement patterns for urgency indicators
        const recentEngagements = engagements.filter(e => {
          const daysSince = this.getDaysSinceDate(e.event_date);
          return daysSince <= 7;
        });

        if (recentEngagements.length >= 3) {
          qualification.timeline.urgency_indicators.push('High engagement frequency');
        }

        // Determine buying stage based on engagement types
        const hasDemo = engagements.some(e => e.event_type === 'demo_scheduled');
        const hasProposal = engagements.some(e => e.event_type === 'proposal_sent');

        if (hasProposal) {
          qualification.timeline.buying_stage = 'decision';
        } else if (hasDemo) {
          qualification.timeline.buying_stage = 'consideration';
        }
      }

      // Get stakeholder data
      const { data: stakeholders } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('company_id', qualification.company_id);

      if (stakeholders && stakeholders.length > 0) {
        // Map stakeholders to decision makers
        qualification.authority.decision_makers = stakeholders.map(s => ({
          name: s.name,
          title: s.title || 'Unknown',
          department: s.department,
          authority_level: this.mapTitleToAuthority(s.title),
          engagement_status: s.engagement_score > 50 ? 'engaged' :
                           s.engagement_score > 20 ? 'aware' : 'unaware',
          contact_info: {
            email: s.email,
            phone: s.phone
          }
        }));

        // Calculate engagement levels
        const executives = stakeholders.filter(s =>
          this.mapTitleToAuthority(s.title) === 'executive'
        );
        const managers = stakeholders.filter(s =>
          this.mapTitleToAuthority(s.title) === 'manager'
        );

        qualification.authority.engagement_level = {
          executive: executives.length > 0 ?
            executives.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / executives.length : 0,
          manager: managers.length > 0 ?
            managers.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / managers.length : 0,
          user: 0
        };
      }

    } catch (error) {
      console.error('Error auto-populating BANT data:', error);
    }

    return qualification;
  }

  /**
   * Map job title to authority level
   */
  private mapTitleToAuthority(title?: string): DecisionMaker['authority_level'] {
    if (!title) return 'influencer';

    const lower = title.toLowerCase();

    if (lower.includes('ceo') || lower.includes('cto') || lower.includes('cfo') ||
        lower.includes('president') || lower.includes('vp') || lower.includes('vice president')) {
      return 'executive';
    } else if (lower.includes('director') || lower.includes('head of')) {
      return 'director';
    } else if (lower.includes('manager') || lower.includes('lead')) {
      return 'manager';
    }

    return 'influencer';
  }

  /**
   * Save qualification to database
   */
  private async saveQualification(qualification: BANTQualification): Promise<BANTQualification | null> {
    try {
      const supabase = await this.getSupabase();

      const dbData = this.mapToDatabase(qualification);

      const { data, error } = await supabase
        .from('bant_qualifications')
        .upsert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error saving BANT qualification:', error);
        return null;
      }

      // Log activity
      await supabase
        .from('qualification_activities')
        .insert({
          lead_id: qualification.lead_id,
          company_id: qualification.company_id,
          activity_type: 'bant_calculated',
          activity_description: `BANT score calculated: ${qualification.overall_score}`,
          activity_data: {
            scores: {
              budget: qualification.budget.score,
              authority: qualification.authority.score,
              need: qualification.need.score,
              timeline: qualification.timeline.score
            },
            status: qualification.qualification_status
          },
          score_impact: qualification.overall_score,
          framework_affected: 'BANT'
        });

      return this.mapFromDatabase(data);

    } catch (error) {
      console.error('Error saving qualification:', error);
      return null;
    }
  }

  /**
   * Map qualification to database format
   */
  private mapToDatabase(qualification: BANTQualification): Record<string, unknown> {
    return {
      lead_id: qualification.lead_id,
      company_id: qualification.company_id,
      budget_score: qualification.budget.score,
      authority_score: qualification.authority.score,
      need_score: qualification.need.score,
      timeline_score: qualification.timeline.score,
      overall_score: qualification.overall_score,
      qualification_status: qualification.qualification_status,
      budget_details: qualification.budget,
      authority_details: qualification.authority,
      need_details: qualification.need,
      timeline_details: qualification.timeline,
      calculated_at: new Date().toISOString(),
      notes: qualification.notes
    };
  }

  /**
   * Map from database format to qualification
   */
  private mapFromDatabase(data: Record<string, unknown>): BANTQualification {
    return {
      id: data.id,
      lead_id: data.lead_id,
      company_id: data.company_id,
      budget: data.budget_details || this.createEmptyBudget(),
      authority: data.authority_details || this.createEmptyAuthority(),
      need: data.need_details || this.createEmptyNeed(),
      timeline: data.timeline_details || this.createEmptyTimeline(),
      overall_score: data.overall_score || 0,
      qualification_status: data.qualification_status || 'disqualified',
      next_actions: [],
      calculated_at: data.calculated_at,
      calculated_by: data.calculated_by,
      notes: data.notes
    };
  }

  /**
   * Create empty qualification structure
   */
  private createEmptyQualification(lead_id: string, company_id: string): BANTQualification {
    return {
      lead_id,
      company_id,
      budget: this.createEmptyBudget(),
      authority: this.createEmptyAuthority(),
      need: this.createEmptyNeed(),
      timeline: this.createEmptyTimeline(),
      overall_score: 0,
      qualification_status: 'disqualified',
      next_actions: []
    };
  }

  private createEmptyBudget(): BANTQualification['budget'] {
    return {
      score: 0,
      budget_confirmed: false,
      budget_range: 'under_10k',
      budget_source: 'inferred'
    };
  }

  private createEmptyAuthority(): BANTQualification['authority'] {
    return {
      score: 0,
      decision_makers: [],
      buying_committee_size: 0,
      engagement_level: {
        executive: 0,
        manager: 0,
        user: 0
      }
    };
  }

  private createEmptyNeed(): BANTQualification['need'] {
    return {
      score: 0,
      pain_points: [],
      use_cases: [],
      urgency_level: 'low',
      problem_acknowledgment: false,
      solution_fit_score: 0
    };
  }

  private createEmptyTimeline(): BANTQualification['timeline'] {
    return {
      score: 0,
      urgency_indicators: [],
      buying_stage: 'awareness',
      timeline_confidence: 0
    };
  }

  /**
   * Utility: Get days until a future date
   */
  private getDaysUntilDate(date: Date | string): number {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Utility: Get days since a past date
   */
  private getDaysSinceDate(date: Date | string): number {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = now.getTime() - targetDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Utility: Get date from now
   */
  private getDateFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }
}

// Export singleton instance
export const bantFramework = new BANTFramework();