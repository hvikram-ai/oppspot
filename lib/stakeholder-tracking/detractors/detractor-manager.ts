import { createClient } from '@/lib/supabase/server';
import type {
  Stakeholder,
  DetractorManagement,
  MitigationStatus,
  MitigationAction,
  BusinessImpact,
  SentimentTrend,
  IdentifyDetractorsRequest,
  IdentifyDetractorsResponse
} from '../types/stakeholder';

export class DetractorManager {
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
   * Identify detractors and assess risk
   */
  async identifyDetractors(
    request: IdentifyDetractorsRequest
  ): Promise<IdentifyDetractorsResponse> {
    try {
      const supabase = await this.getSupabase();
      const minRiskScore = request.min_risk_score || 40;

      // Build query
      let query = supabase
        .from('stakeholders')
        .select(`
          *,
          detractor_management!left(*),
          influence_scores!left(*),
          stakeholder_engagement!left(
            engagement_type,
            engagement_date,
            outcome,
            sentiment_score
          )
        `);

      if (request.company_id) {
        query = query.eq('company_id', request.company_id);
      }

      if (request.org_id) {
        query = query.eq('org_id', request.org_id);
      }

      // Focus on detractors and at-risk stakeholders
      query = query.or('role_type.eq.detractor,relationship_status.in.(at_risk,lost)');

      const { data: stakeholders, error } = await query;

      if (error) {
        console.error('Error identifying detractors:', error);
        return {
          success: false,
          detractors: [],
          total_count: 0
        };
      }

      // Assess each potential detractor
      const detractors = await Promise.all(
        (stakeholders || []).map(async (stakeholder) => {
          const riskScore = await this.calculateDetractorRiskScore(stakeholder);
          const priority = this.determineMitigationPriority(
            riskScore,
            stakeholder.influence_scores?.[0]?.overall_influence || 0
          );

          return {
            stakeholder: stakeholder as Stakeholder,
            management: stakeholder.detractor_management?.[0] as DetractorManagement | undefined,
            risk_score: riskScore,
            mitigation_priority: priority
          };
        })
      );

      // Filter by minimum risk score
      const qualifiedDetractors = detractors.filter(d => d.risk_score >= minRiskScore);

      // Sort by priority and risk score
      qualifiedDetractors.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.mitigation_priority] - priorityOrder[a.mitigation_priority];
        return priorityDiff !== 0 ? priorityDiff : b.risk_score - a.risk_score;
      });

      return {
        success: true,
        detractors: qualifiedDetractors,
        total_count: qualifiedDetractors.length
      };

    } catch (error) {
      console.error('Detractor identification error:', error);
      return {
        success: false,
        detractors: [],
        total_count: 0
      };
    }
  }

  /**
   * Calculate detractor risk score
   */
  async calculateDetractorRiskScore(stakeholder: any): Promise<number> {
    let riskScore = 0;
    const weights = {
      role: 0.15,
      influence: 0.25,
      sentiment: 0.20,
      engagement: 0.15,
      relationship: 0.15,
      impact: 0.10
    };

    // Role-based risk
    if (stakeholder.role_type === 'detractor') {
      riskScore += 80 * weights.role;
    } else if (stakeholder.role_type === 'gatekeeper') {
      riskScore += 50 * weights.role;
    } else if (stakeholder.role_type === 'neutral') {
      riskScore += 30 * weights.role;
    }

    // Influence-based risk
    const influence = stakeholder.influence_scores?.[0];
    if (influence) {
      riskScore += (influence.overall_influence || 0) * weights.influence;
    } else if (stakeholder.influence_level) {
      riskScore += (stakeholder.influence_level * 10) * weights.influence;
    }

    // Sentiment analysis
    const engagements = stakeholder.stakeholder_engagement || [];
    if (engagements.length > 0) {
      const negativeSentiments = engagements.filter(
        (e: any) => e.sentiment_score !== null && e.sentiment_score < -20
      );
      const negativeRatio = negativeSentiments.length / engagements.length;
      riskScore += (negativeRatio * 100) * weights.sentiment;

      // Recent negative outcomes
      const recentNegative = engagements
        .slice(0, 5)
        .filter((e: any) => e.outcome === 'negative').length;
      riskScore += (recentNegative * 20) * weights.engagement;
    } else {
      // No engagement is also a risk
      riskScore += 40 * weights.engagement;
    }

    // Relationship status risk
    const relationshipRisks: Record<string, number> = {
      'lost': 100,
      'at_risk': 80,
      'not_contacted': 60,
      'initial_contact': 40,
      'developing': 30,
      'established': 10,
      'strong': 0
    };
    riskScore += (relationshipRisks[stakeholder.relationship_status] || 50) * weights.relationship;

    // Business impact from detractor management
    const management = stakeholder.detractor_management?.[0];
    if (management) {
      const impactScores: Record<string, number> = {
        'critical': 100,
        'high': 80,
        'medium': 50,
        'low': 30,
        'minimal': 10
      };
      riskScore += (impactScores[management.business_impact] || 50) * weights.impact;

      // Adjust for blocking potential
      if (management.blocking_potential) {
        riskScore += 20;
      }
    }

    return Math.min(100, Math.round(riskScore));
  }

  /**
   * Determine mitigation priority
   */
  determineMitigationPriority(
    riskScore: number,
    influenceLevel: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Create priority matrix based on risk and influence
    if (riskScore >= 70 && influenceLevel >= 70) {
      return 'critical';
    } else if (riskScore >= 70 || (riskScore >= 50 && influenceLevel >= 50)) {
      return 'high';
    } else if (riskScore >= 40 || influenceLevel >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Create or update detractor management record
   */
  async createDetractorManagement(
    stakeholder_id: string,
    initial_assessment: {
      detractor_level: number;
      opposition_reasons: string[];
      business_impact: BusinessImpact;
    }
  ): Promise<DetractorManagement | null> {
    try {
      const supabase = await this.getSupabase();

      // Check if management record exists
      const { data: existing } = await supabase
        .from('detractor_management')
        .select('*')
        .eq('stakeholder_id', stakeholder_id)
        .single();

      if (existing) {
        return existing as DetractorManagement;
      }

      // Get stakeholder info
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('org_id, influence_level')
        .eq('id', stakeholder_id)
        .single();

      // Determine influence radius based on level
      let influence_radius: DetractorManagement['influence_radius'] = 'individual';
      if (stakeholder?.influence_level) {
        if (stakeholder.influence_level >= 8) {
          influence_radius = 'company_wide';
        } else if (stakeholder.influence_level >= 6) {
          influence_radius = 'division';
        } else if (stakeholder.influence_level >= 4) {
          influence_radius = 'department';
        } else if (stakeholder.influence_level >= 2) {
          influence_radius = 'team';
        }
      }

      // Create management record
      const { data, error } = await supabase
        .from('detractor_management')
        .insert({
          stakeholder_id,
          org_id: stakeholder?.org_id,
          detractor_level: initial_assessment.detractor_level,
          opposition_reasons: initial_assessment.opposition_reasons,
          business_impact: initial_assessment.business_impact,
          influence_radius,
          mitigation_status: 'not_started',
          deal_risk_score: initial_assessment.detractor_level * 10,
          blocking_potential: initial_assessment.detractor_level >= 7,
          sentiment_trend: 'stable',
          mitigation_actions: []
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating detractor management:', error);
        return null;
      }

      // Update stakeholder role type
      await supabase
        .from('stakeholders')
        .update({
          role_type: 'detractor',
          updated_at: new Date().toISOString()
        })
        .eq('id', stakeholder_id);

      return data as DetractorManagement;

    } catch (error) {
      console.error('Detractor management creation error:', error);
      return null;
    }
  }

  /**
   * Develop mitigation strategy
   */
  async developMitigationStrategy(
    stakeholder_id: string
  ): Promise<{
    strategy: string;
    actions: string[];
    estimated_timeline: string;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get comprehensive stakeholder data
      const { data } = await supabase
        .from('stakeholders')
        .select(`
          *,
          detractor_management!left(*),
          influence_scores!left(*),
          stakeholder_engagement!left(*)
        `)
        .eq('id', stakeholder_id)
        .single();

      if (!data) {
        return {
          strategy: 'Unable to develop strategy - stakeholder not found',
          actions: [],
          estimated_timeline: 'Unknown'
        };
      }

      const management = data.detractor_management?.[0];
      const oppositionReasons = management?.opposition_reasons || [];

      let strategy = '';
      const actions: string[] = [];
      let timeline = '30 days';

      // Analyze opposition reasons and develop targeted strategy
      if (oppositionReasons.includes('bad_experience')) {
        strategy = 'Service Recovery and Trust Rebuilding';
        actions.push('Schedule executive-level apology meeting');
        actions.push('Document and address specific grievances');
        actions.push('Provide compensation or make-good offer');
        actions.push('Assign dedicated success manager');
        timeline = '60 days';
      } else if (oppositionReasons.includes('competitor_preference')) {
        strategy = 'Competitive Differentiation and Value Demonstration';
        actions.push('Conduct competitive analysis session');
        actions.push('Highlight unique value propositions');
        actions.push('Provide proof points and case studies');
        actions.push('Offer trial or pilot program');
        timeline = '90 days';
      } else if (oppositionReasons.includes('budget_concerns')) {
        strategy = 'ROI Focus and Financial Justification';
        actions.push('Develop custom ROI analysis');
        actions.push('Identify cost reduction opportunities');
        actions.push('Propose phased implementation');
        actions.push('Connect with finance stakeholders');
        timeline = '45 days';
      } else if (oppositionReasons.includes('change_resistance')) {
        strategy = 'Change Management and Gradual Adoption';
        actions.push('Address change concerns directly');
        actions.push('Provide change management support');
        actions.push('Identify quick wins');
        actions.push('Build coalition of supporters');
        timeline = '90 days';
      } else {
        strategy = 'Relationship Building and Education';
        actions.push('Schedule listening session');
        actions.push('Identify root concerns');
        actions.push('Provide targeted education');
        actions.push('Build trust through consistency');
        timeline = '60 days';
      }

      // Add universal actions
      actions.push('Monitor sentiment changes weekly');
      actions.push('Document all interactions');
      actions.push('Align with champion advocates');

      // Save strategy to management record
      if (management) {
        await supabase
          .from('detractor_management')
          .update({
            mitigation_strategy: strategy,
            mitigation_status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', management.id);
      }

      return {
        strategy,
        actions,
        estimated_timeline: timeline
      };

    } catch (error) {
      console.error('Mitigation strategy development error:', error);
      return {
        strategy: 'Error developing strategy',
        actions: [],
        estimated_timeline: 'Unknown'
      };
    }
  }

  /**
   * Log mitigation action
   */
  async logMitigationAction(
    management_id: string,
    action: {
      action: string;
      outcome?: string;
      success?: boolean;
    }
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      // Get current actions
      const { data: management } = await supabase
        .from('detractor_management')
        .select('mitigation_actions')
        .eq('id', management_id)
        .single();

      const currentActions = management?.mitigation_actions || [];

      // Add new action
      const newAction: MitigationAction = {
        id: crypto.randomUUID(),
        action: action.action,
        date: new Date().toISOString(),
        outcome: action.outcome,
        success: action.success
      };

      currentActions.push(newAction);

      // Update management record
      const { error } = await supabase
        .from('detractor_management')
        .update({
          mitigation_actions: currentActions,
          updated_at: new Date().toISOString()
        })
        .eq('id', management_id);

      return !error;

    } catch (error) {
      console.error('Mitigation action logging error:', error);
      return false;
    }
  }

  /**
   * Update mitigation status
   */
  async updateMitigationStatus(
    management_id: string,
    new_status: MitigationStatus,
    notes?: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      const { error } = await supabase
        .from('detractor_management')
        .update({
          mitigation_status: new_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', management_id);

      if (!error && notes) {
        // Log status change as action
        await this.logMitigationAction(management_id, {
          action: `Status changed to ${new_status}: ${notes}`,
          success: ['converted', 'neutralized'].includes(new_status)
        });
      }

      // Update stakeholder role if converted
      if (new_status === 'converted') {
        const { data: management } = await supabase
          .from('detractor_management')
          .select('stakeholder_id')
          .eq('id', management_id)
          .single();

        if (management) {
          await supabase
            .from('stakeholders')
            .update({
              role_type: 'neutral',
              relationship_status: 'developing',
              updated_at: new Date().toISOString()
            })
            .eq('id', management.stakeholder_id);
        }
      }

      return !error;

    } catch (error) {
      console.error('Mitigation status update error:', error);
      return false;
    }
  }

  /**
   * Assess conversion potential
   */
  async assessConversionPotential(
    stakeholder_id: string
  ): Promise<{
    potential: number;
    barriers: string[];
    approach: string;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get stakeholder and engagement data
      const { data } = await supabase
        .from('stakeholders')
        .select(`
          *,
          detractor_management!left(*),
          stakeholder_engagement!left(*)
        `)
        .eq('id', stakeholder_id)
        .single();

      if (!data) {
        return {
          potential: 0,
          barriers: ['Stakeholder not found'],
          approach: 'Unable to assess'
        };
      }

      let potential = 20; // Base potential
      const barriers: string[] = [];
      let approach = '';

      const management = data.detractor_management?.[0];
      const engagements = data.stakeholder_engagement || [];

      // Analyze detractor level
      if (management?.detractor_level) {
        if (management.detractor_level <= 3) {
          potential += 30;
        } else if (management.detractor_level <= 5) {
          potential += 20;
          barriers.push('Moderate opposition level');
        } else if (management.detractor_level <= 7) {
          potential += 10;
          barriers.push('High opposition level');
        } else {
          barriers.push('Very high opposition level');
        }
      }

      // Check engagement history
      const positiveEngagements = engagements.filter(
        (e: any) => e.outcome === 'positive'
      ).length;
      const totalEngagements = engagements.length;

      if (totalEngagements > 0) {
        const positiveRatio = positiveEngagements / totalEngagements;
        potential += positiveRatio * 30;

        if (positiveRatio < 0.2) {
          barriers.push('History of negative interactions');
        }
      } else {
        barriers.push('No engagement history');
      }

      // Check for recent improvements
      const recentEngagements = engagements.slice(0, 3);
      const recentPositive = recentEngagements.filter(
        (e: any) => e.sentiment_score > 0
      ).length;

      if (recentPositive >= 2) {
        potential += 20;
      }

      // Analyze opposition reasons
      const oppositionReasons = management?.opposition_reasons || [];

      if (oppositionReasons.includes('bad_experience')) {
        barriers.push('Past negative experience');
        approach = 'Service recovery with executive involvement';
        potential -= 10;
      } else if (oppositionReasons.includes('competitor_preference')) {
        barriers.push('Strong competitor alignment');
        approach = 'Competitive differentiation and pilot program';
        potential -= 15;
      } else if (oppositionReasons.includes('budget_concerns')) {
        barriers.push('Budget constraints');
        approach = 'ROI demonstration and flexible pricing';
        potential += 10; // Budget concerns are more addressable
      } else if (oppositionReasons.includes('change_resistance')) {
        barriers.push('Organizational change resistance');
        approach = 'Gradual adoption with change management support';
      } else {
        approach = 'Relationship building and education';
      }

      // Consider influence level
      if (data.influence_level && data.influence_level >= 7) {
        barriers.push('High influence - conversion critical');
        potential += 10; // Worth the effort
      }

      // Cap potential at 100
      potential = Math.min(100, Math.max(0, potential));

      // Update management record
      if (management) {
        await supabase
          .from('detractor_management')
          .update({
            conversion_potential: potential,
            conversion_barriers: barriers,
            conversion_approach: approach,
            updated_at: new Date().toISOString()
          })
          .eq('id', management.id);
      }

      return {
        potential,
        barriers,
        approach
      };

    } catch (error) {
      console.error('Conversion potential assessment error:', error);
      return {
        potential: 0,
        barriers: ['Assessment error'],
        approach: 'Unable to determine'
      };
    }
  }

  /**
   * Monitor sentiment trend
   */
  async monitorSentimentTrend(
    stakeholder_id: string
  ): Promise<SentimentTrend> {
    try {
      const supabase = await this.getSupabase();

      // Get recent engagements
      const { data: engagements } = await supabase
        .from('stakeholder_engagement')
        .select('engagement_date, sentiment_score')
        .eq('stakeholder_id', stakeholder_id)
        .order('engagement_date', { ascending: false })
        .limit(10);

      if (!engagements || engagements.length < 2) {
        return 'stable';
      }

      // Calculate trend
      const sentiments = engagements
        .filter(e => e.sentiment_score !== null)
        .map(e => e.sentiment_score as number);

      if (sentiments.length < 2) {
        return 'stable';
      }

      // Compare recent vs older sentiments
      const recentAvg = sentiments.slice(0, Math.ceil(sentiments.length / 2))
        .reduce((sum, val) => sum + val, 0) / Math.ceil(sentiments.length / 2);

      const olderAvg = sentiments.slice(Math.ceil(sentiments.length / 2))
        .reduce((sum, val) => sum + val, 0) / (sentiments.length - Math.ceil(sentiments.length / 2));

      const difference = recentAvg - olderAvg;

      // Check for volatility
      const variance = sentiments.reduce((sum, val) => {
        return sum + Math.pow(val - (recentAvg + olderAvg) / 2, 2);
      }, 0) / sentiments.length;

      let trend: SentimentTrend;

      if (variance > 1000) {
        trend = 'volatile';
      } else if (difference > 15) {
        trend = 'improving';
      } else if (difference < -15) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }

      // Update management record
      const { data: management } = await supabase
        .from('detractor_management')
        .select('id')
        .eq('stakeholder_id', stakeholder_id)
        .single();

      if (management) {
        await supabase
          .from('detractor_management')
          .update({
            sentiment_trend: trend,
            last_assessment_date: new Date().toISOString(),
            next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', management.id);
      }

      return trend;

    } catch (error) {
      console.error('Sentiment trend monitoring error:', error);
      return 'stable';
    }
  }
}

// Export singleton instance
export const detractorManager = new DetractorManager();