import { createClient } from '@/lib/supabase/server';
import type {
  Stakeholder,
  ChampionTracking,
  ChampionStatus,
  DevelopmentStage,
  IdentifyChampionsRequest,
  IdentifyChampionsResponse,
  ChampionGoal,
  DevelopmentAction
} from '../types/stakeholder';

export class ChampionIdentifier {
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
   * Identify potential and existing champions
   */
  async identifyChampions(
    request: IdentifyChampionsRequest
  ): Promise<IdentifyChampionsResponse> {
    try {
      const supabase = await this.getSupabase();
      const minScore = request.min_score || 60;

      // Build query
      let query = supabase
        .from('stakeholders')
        .select(`
          *,
          champion_tracking!left(*),
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

      // Filter for champions or potential champions
      if (!request.include_potential) {
        query = query.in('champion_status', ['active', 'super', 'developing']);
      }

      const { data: stakeholders, error } = await query;

      if (error) {
        console.error('Error identifying champions:', error);
        return {
          success: false,
          champions: [],
          total_count: 0
        };
      }

      // Score and rank champions
      const champions = await Promise.all(
        (stakeholders || []).map(async (stakeholder) => {
          const score = await this.calculateChampionScore(stakeholder);
          const recommendation = await this.generateChampionRecommendation(
            stakeholder,
            score
          );

          return {
            stakeholder: stakeholder as Stakeholder,
            tracking: stakeholder.champion_tracking?.[0] as ChampionTracking | undefined,
            score,
            recommendation
          };
        })
      );

      // Filter by minimum score
      const qualifiedChampions = champions.filter(c => c.score >= minScore);

      // Sort by score descending
      qualifiedChampions.sort((a, b) => b.score - a.score);

      return {
        success: true,
        champions: qualifiedChampions,
        total_count: qualifiedChampions.length
      };

    } catch (error) {
      console.error('Champion identification error:', error);
      return {
        success: false,
        champions: [],
        total_count: 0
      };
    }
  }

  /**
   * Calculate champion score based on multiple factors
   */
  async calculateChampionScore(stakeholder: any): Promise<number> {
    let score = 0;
    const weights = {
      role: 0.15,
      influence: 0.20,
      engagement: 0.25,
      advocacy: 0.20,
      activity: 0.10,
      sentiment: 0.10
    };

    // Role-based scoring
    const roleScores: Record<string, number> = {
      'champion': 100,
      'influencer': 80,
      'decision_maker': 70,
      'end_user': 50,
      'neutral': 30,
      'gatekeeper': 40,
      'detractor': 0
    };
    score += (roleScores[stakeholder.role_type] || 30) * weights.role;

    // Influence level
    const influenceScore = stakeholder.influence_scores?.[0];
    if (influenceScore) {
      score += (influenceScore.overall_influence || 0) * weights.influence;
    } else if (stakeholder.influence_level) {
      score += (stakeholder.influence_level * 10) * weights.influence;
    }

    // Engagement score
    if (stakeholder.engagement_score) {
      score += stakeholder.engagement_score * weights.engagement;
    }

    // Advocacy level from champion tracking
    const tracking = stakeholder.champion_tracking?.[0];
    if (tracking) {
      const advocacyScore = (tracking.advocacy_level || 0) * 10;
      score += advocacyScore * weights.advocacy;

      // Activity metrics
      const activityScore = Math.min(100,
        (tracking.referrals_made || 0) * 10 +
        (tracking.meetings_facilitated || 0) * 15 +
        (tracking.internal_advocates || 0) * 20 +
        (tracking.success_stories_shared || 0) * 25
      );
      score += activityScore * weights.activity;
    }

    // Sentiment analysis from recent engagements
    const engagements = stakeholder.stakeholder_engagement || [];
    if (engagements.length > 0) {
      const avgSentiment = engagements
        .filter((e: any) => e.sentiment_score !== null)
        .reduce((sum: number, e: any) => sum + (e.sentiment_score + 100) / 2, 0) /
        engagements.length;
      score += (avgSentiment || 50) * weights.sentiment;
    }

    // Bonus points for specific attributes
    if (stakeholder.decision_authority) score += 5;
    if (stakeholder.budget_authority) score += 5;

    // Cap at 100
    return Math.min(100, Math.round(score));
  }

  /**
   * Generate champion recommendation based on score and status
   */
  async generateChampionRecommendation(
    stakeholder: any,
    score: number
  ): Promise<string> {
    const status = stakeholder.champion_status;
    const tracking = stakeholder.champion_tracking?.[0];

    // Score-based recommendations
    if (score >= 85) {
      if (status === 'super') {
        return 'Maintain super champion status with VIP treatment and exclusive benefits';
      }
      return 'Prime candidate for super champion program - initiate advanced cultivation';
    } else if (score >= 70) {
      if (status === 'active') {
        return 'Continue nurturing - focus on increasing advocacy activities';
      }
      return 'Strong champion potential - accelerate development program';
    } else if (score >= 60) {
      if (status === 'developing') {
        return 'Monitor progress closely - provide additional support and resources';
      }
      return 'Good potential - begin structured champion development';
    } else if (score >= 45) {
      return 'Moderate potential - assess barriers and create targeted engagement plan';
    } else {
      return 'Low champion potential - maintain relationship but focus efforts elsewhere';
    }
  }

  /**
   * Create or update champion tracking
   */
  async createChampionTracking(
    stakeholder_id: string,
    initial_stage: DevelopmentStage = 'identified'
  ): Promise<ChampionTracking | null> {
    try {
      const supabase = await this.getSupabase();

      // Check if tracking already exists
      const { data: existing } = await supabase
        .from('champion_tracking')
        .select('*')
        .eq('stakeholder_id', stakeholder_id)
        .single();

      if (existing) {
        return existing as ChampionTracking;
      }

      // Get stakeholder info
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('org_id')
        .eq('id', stakeholder_id)
        .single();

      // Create new tracking
      const { data, error } = await supabase
        .from('champion_tracking')
        .insert({
          stakeholder_id,
          org_id: stakeholder?.org_id,
          development_stage: initial_stage,
          advocacy_level: 1,
          internal_influence: 1,
          engagement_frequency: 'monthly',
          risk_level: 'low',
          development_actions: []
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating champion tracking:', error);
        return null;
      }

      // Update stakeholder champion status
      await supabase
        .from('stakeholders')
        .update({
          champion_status: 'potential',
          champion_score: 0
        })
        .eq('id', stakeholder_id);

      return data as ChampionTracking;

    } catch (error) {
      console.error('Champion tracking creation error:', error);
      return null;
    }
  }

  /**
   * Update champion development stage
   */
  async updateDevelopmentStage(
    tracking_id: string,
    new_stage: DevelopmentStage,
    notes?: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      const { error } = await supabase
        .from('champion_tracking')
        .update({
          development_stage: new_stage,
          updated_at: new Date().toISOString()
        })
        .eq('id', tracking_id);

      if (error) {
        console.error('Error updating development stage:', error);
        return false;
      }

      // Log stage transition
      await this.logDevelopmentAction(tracking_id, {
        action: `Stage changed to ${new_stage}`,
        category: 'stage_transition',
        notes
      });

      return true;

    } catch (error) {
      console.error('Development stage update error:', error);
      return false;
    }
  }

  /**
   * Log champion development action
   */
  async logDevelopmentAction(
    tracking_id: string,
    action: {
      action: string;
      category: string;
      notes?: string;
      impact?: number;
    }
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      // Get current actions
      const { data: tracking } = await supabase
        .from('champion_tracking')
        .select('development_actions')
        .eq('id', tracking_id)
        .single();

      const currentActions = tracking?.development_actions || [];

      // Add new action
      const newAction: DevelopmentAction = {
        id: crypto.randomUUID(),
        action: action.action,
        category: action.category,
        completed: false,
        impact: action.impact
      };

      currentActions.push(newAction);

      // Update tracking
      const { error } = await supabase
        .from('champion_tracking')
        .update({
          development_actions: currentActions,
          updated_at: new Date().toISOString()
        })
        .eq('id', tracking_id);

      return !error;

    } catch (error) {
      console.error('Development action logging error:', error);
      return false;
    }
  }

  /**
   * Set champion goals
   */
  async setChampionGoals(
    tracking_id: string,
    goals: Array<{
      goal: string;
      target_date?: string;
    }>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      const championGoals: ChampionGoal[] = goals.map(g => ({
        id: crypto.randomUUID(),
        goal: g.goal,
        target_date: g.target_date,
        status: 'pending',
        progress: 0
      }));

      const { error } = await supabase
        .from('champion_tracking')
        .update({
          champion_goals: championGoals,
          updated_at: new Date().toISOString()
        })
        .eq('id', tracking_id);

      return !error;

    } catch (error) {
      console.error('Champion goals setting error:', error);
      return false;
    }
  }

  /**
   * Assess champion risk
   */
  async assessChampionRisk(stakeholder_id: string): Promise<{
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_factors: string[];
    recommendations: string[];
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get stakeholder and tracking data
      const { data } = await supabase
        .from('stakeholders')
        .select(`
          *,
          champion_tracking!left(*),
          stakeholder_engagement!left(
            engagement_date,
            outcome,
            sentiment_score
          )
        `)
        .eq('id', stakeholder_id)
        .single();

      if (!data) {
        return {
          risk_level: 'low',
          risk_factors: [],
          recommendations: []
        };
      }

      const riskFactors: string[] = [];
      const recommendations: string[] = [];
      let riskScore = 0;

      const tracking = data.champion_tracking?.[0];
      const engagements = data.stakeholder_engagement || [];

      // Check engagement recency
      const lastEngagement = engagements[0];
      if (lastEngagement) {
        const daysSinceContact = Math.floor(
          (Date.now() - new Date(lastEngagement.engagement_date).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        if (daysSinceContact > 60) {
          riskFactors.push('No contact in over 60 days');
          recommendations.push('Schedule immediate check-in call');
          riskScore += 30;
        } else if (daysSinceContact > 30) {
          riskFactors.push('Limited recent engagement');
          recommendations.push('Increase engagement frequency');
          riskScore += 15;
        }
      }

      // Check sentiment trend
      const recentSentiments = engagements
        .slice(0, 5)
        .map(e => e.sentiment_score)
        .filter(s => s !== null);

      if (recentSentiments.length >= 2) {
        const trend = recentSentiments[0] - recentSentiments[recentSentiments.length - 1];
        if (trend < -20) {
          riskFactors.push('Declining sentiment detected');
          recommendations.push('Investigate concerns and address issues');
          riskScore += 25;
        }
      }

      // Check advocacy metrics
      if (tracking) {
        if (tracking.advocacy_level < 5) {
          riskFactors.push('Low advocacy level');
          recommendations.push('Develop advocacy skills and opportunities');
          riskScore += 20;
        }

        if (tracking.referrals_made === 0 && tracking.meetings_facilitated === 0) {
          riskFactors.push('No active advocacy behaviors');
          recommendations.push('Create advocacy opportunities and incentives');
          riskScore += 25;
        }
      }

      // Check relationship status
      if (data.relationship_status === 'at_risk' || data.relationship_status === 'lost') {
        riskFactors.push(`Relationship status: ${data.relationship_status}`);
        recommendations.push('Immediate intervention required');
        riskScore += 40;
      }

      // Determine risk level
      let risk_level: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore >= 70) {
        risk_level = 'critical';
      } else if (riskScore >= 50) {
        risk_level = 'high';
      } else if (riskScore >= 25) {
        risk_level = 'medium';
      } else {
        risk_level = 'low';
      }

      // Update tracking if exists
      if (tracking) {
        await supabase
          .from('champion_tracking')
          .update({
            risk_level,
            risk_factors: riskFactors,
            updated_at: new Date().toISOString()
          })
          .eq('id', tracking.id);
      }

      return {
        risk_level,
        risk_factors: riskFactors,
        recommendations
      };

    } catch (error) {
      console.error('Champion risk assessment error:', error);
      return {
        risk_level: 'low',
        risk_factors: [],
        recommendations: []
      };
    }
  }

  /**
   * Generate cultivation plan for champion
   */
  async generateCultivationPlan(
    stakeholder_id: string
  ): Promise<string> {
    try {
      const supabase = await this.getSupabase();

      // Get comprehensive stakeholder data
      const { data } = await supabase
        .from('stakeholders')
        .select(`
          *,
          champion_tracking!left(*),
          influence_scores!left(*)
        `)
        .eq('id', stakeholder_id)
        .single();

      if (!data) {
        return 'Unable to generate plan - stakeholder not found';
      }

      const tracking = data.champion_tracking?.[0];
      const influence = data.influence_scores?.[0];

      let plan = '## Champion Cultivation Plan\n\n';

      // Current Status
      plan += `### Current Status\n`;
      plan += `- Champion Status: ${data.champion_status || 'Potential'}\n`;
      plan += `- Development Stage: ${tracking?.development_stage || 'Not started'}\n`;
      plan += `- Influence Level: ${influence?.overall_influence || data.influence_level || 'Unknown'}/100\n\n`;

      // Development Objectives
      plan += `### Development Objectives\n`;

      if (!tracking || tracking.development_stage === 'identified') {
        plan += `1. Qualify champion potential through discovery conversations\n`;
        plan += `2. Assess motivation and alignment with our solution\n`;
        plan += `3. Identify internal influence network\n`;
      } else if (tracking.development_stage === 'qualifying') {
        plan += `1. Deepen relationship through value-add interactions\n`;
        plan += `2. Provide exclusive insights and early access\n`;
        plan += `3. Map decision-making process and key stakeholders\n`;
      } else if (tracking.development_stage === 'developing') {
        plan += `1. Activate advocacy through success story development\n`;
        plan += `2. Enable internal selling with tools and content\n`;
        plan += `3. Facilitate peer connections and references\n`;
      } else {
        plan += `1. Maintain engagement through regular value delivery\n`;
        plan += `2. Expand influence through introductions\n`;
        plan += `3. Recognize and reward advocacy behaviors\n`;
      }

      plan += `\n### Engagement Strategy\n`;
      plan += `- **Frequency**: ${tracking?.engagement_frequency || 'Monthly'} touchpoints\n`;
      plan += `- **Channels**: Mix of meetings, emails, and informal interactions\n`;
      plan += `- **Content**: Industry insights, exclusive previews, success stories\n\n`;

      plan += `### Key Actions\n`;
      plan += `1. **Immediate** (Next 7 days):\n`;
      plan += `   - Schedule relationship building call\n`;
      plan += `   - Send personalized value-add content\n`;
      plan += `2. **Short-term** (Next 30 days):\n`;
      plan += `   - Conduct champion assessment\n`;
      plan += `   - Identify collaboration opportunities\n`;
      plan += `3. **Long-term** (Next 90 days):\n`;
      plan += `   - Develop into active advocate\n`;
      plan += `   - Create success story together\n\n`;

      plan += `### Success Metrics\n`;
      plan += `- Advocacy level increase to 7+/10\n`;
      plan += `- Minimum 2 referrals or introductions\n`;
      plan += `- 1+ internal advocacy action per month\n`;

      // Save plan to tracking
      if (tracking) {
        await supabase
          .from('champion_tracking')
          .update({
            cultivation_plan: plan,
            updated_at: new Date().toISOString()
          })
          .eq('id', tracking.id);
      }

      return plan;

    } catch (error) {
      console.error('Cultivation plan generation error:', error);
      return 'Error generating cultivation plan';
    }
  }
}

// Export singleton instance
export const championIdentifier = new ChampionIdentifier();