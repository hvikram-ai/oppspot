import { createClient } from '@/lib/supabase/server';
import type { Row } from '@/lib/supabase/helpers'
import type {
  StakeholderEngagement,
  EngagementType,
  EngagementOutcome,
  SentimentTrend,
  TrackEngagementRequest,
  TrackEngagementResponse,
  ActionItem,
  RoleChange,
  StakeholderAlert,
  DetectRoleChangeRequest,
  DetectRoleChangeResponse
} from '../types/stakeholder';

// Interface for role change database row
interface RoleChangeRow {
  id?: string;
  stakeholder_id?: string;
  org_id?: string;
  change_type?: string;
  previous_role?: string;
  new_role?: string;
  previous_department?: string | null;
  new_department?: string | null;
  change_date?: string;
  detected_date?: string;
  impact_on_relationship?: string;
  continuity_risk?: string;
  action_required?: boolean;
  created_at?: string;
}

export class EngagementTracker {
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
   * Track a new stakeholder engagement
   */
  async trackEngagement(
    request: TrackEngagementRequest
  ): Promise<TrackEngagementResponse> {
    try {
      const supabase = await this.getSupabase();

      // Validate and save engagement
      const { data: engagement, error } = await supabase
        .from('stakeholder_engagement')
        .insert(request.engagement)
        .select()
        .single();

      if (error) {
        console.error('Error tracking engagement:', error);
        return {
          success: false,
          engagement: {} as StakeholderEngagement
        };
      }

      // Update stakeholder's last contact date and engagement score
      await this.updateStakeholderEngagementMetrics(
        request.engagement.stakeholder_id,
        engagement
      );

      // Analyze sentiment trend
      const sentimentTrend = await this.analyzeSentimentTrend(
        request.engagement.stakeholder_id
      );

      // Generate next actions based on engagement outcome
      const nextActions = await this.generateNextActions(
        request.engagement.stakeholder_id,
        engagement
      );

      // Check for alerts (e.g., negative sentiment, champion at risk)
      await this.checkEngagementAlerts(
        request.engagement.stakeholder_id,
        engagement
      );

      return {
        success: true,
        engagement: engagement as StakeholderEngagement,
        sentiment_trend: sentimentTrend,
        next_actions: nextActions
      };

    } catch (error) {
      console.error('Engagement tracking error:', error);
      return {
        success: false,
        engagement: {} as StakeholderEngagement
      };
    }
  }

  /**
   * Update stakeholder engagement metrics after new engagement
   */
  private async updateStakeholderEngagementMetrics(
    stakeholder_id: string,
    engagement: { outcome?: string; sentiment_score?: number; engagement_date?: string }
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      // Get recent engagements for score calculation
      const { data: recentEngagements } = await supabase
        .from('stakeholder_engagement')
        .select('outcome, sentiment_score, engagement_date')
        .eq('stakeholder_id', stakeholder_id)
        .order('engagement_date', { ascending: false })
        .limit(10) as { data: Row<'stakeholder_engagement'>[] | null; error: any };

      if (!recentEngagements) return;

      // Calculate engagement score
      let engagementScore = 50; // Base score

      // Frequency factor
      const daysSinceFirstEngagement = recentEngagements.length > 0
        ? Math.floor(
            (Date.now() - new Date(recentEngagements[recentEngagements.length - 1].engagement_date).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : 0;

      if (daysSinceFirstEngagement > 0) {
        const engagementFrequency = recentEngagements.length / daysSinceFirstEngagement * 30;
        engagementScore += Math.min(25, engagementFrequency * 10);
      }

      // Outcome factor
      const positiveOutcomes = recentEngagements.filter(
        e => (e as Error).outcome === 'positive'
      ).length;
      const outcomeRatio = recentEngagements.length > 0
        ? positiveOutcomes / recentEngagements.length
        : 0;
      engagementScore += outcomeRatio * 25;

      // Sentiment factor
      const avgSentiment = recentEngagements
        .filter(e => (e as Error).sentiment_score !== null)
        .reduce((sum, e) => sum + ((e as Error).sentiment_score + 100) / 2, 0) /
        (recentEngagements.filter(e => (e as Error).sentiment_score !== null).length || 1);
      engagementScore = Math.round(Math.min(100, engagementScore * (avgSentiment / 50)));

      // Update stakeholder
      await supabase
        .from('stakeholders')
        .update({
          last_contact_date: engagement.engagement_date,
          engagement_score: engagementScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', stakeholder_id);

    } catch (error) {
      console.error('Error updating engagement metrics:', error);
    }
  }

  /**
   * Analyze sentiment trend from recent engagements
   */
  private async analyzeSentimentTrend(
    stakeholder_id: string
  ): Promise<SentimentTrend> {
    try {
      const supabase = await this.getSupabase();

      const { data: engagements } = await supabase
        .from('stakeholder_engagement')
        .select('sentiment_score, engagement_date')
        .eq('stakeholder_id', stakeholder_id)
        .order('engagement_date', { ascending: false })
        .limit(10) as { data: Row<'stakeholder_engagement'>[] | null; error: any };

      if (!engagements || engagements.length < 2) {
        return 'stable';
      }

      const sentiments = engagements
        .filter(e => (e as Error).sentiment_score !== null)
        .map(e => (e as Error).sentiment_score as number);

      if (sentiments.length < 2) {
        return 'stable';
      }

      // Compare recent vs older
      const mid = Math.ceil(sentiments.length / 2);
      const recentAvg = sentiments.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const olderAvg = sentiments.slice(mid).reduce((a, b) => a + b, 0) / (sentiments.length - mid);

      const diff = recentAvg - olderAvg;
      const variance = sentiments.reduce((sum, val) => {
        const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
        return sum + Math.pow(val - mean, 2);
      }, 0) / sentiments.length;

      if (variance > 1000) return 'volatile';
      if (diff > 15) return 'improving';
      if (diff < -15) return 'declining';
      return 'stable';

    } catch (error) {
      console.error('Error analyzing sentiment trend:', error);
      return 'stable';
    }
  }

  /**
   * Generate next actions based on engagement
   */
  private async generateNextActions(
    stakeholder_id: string,
    engagement: {
      follow_up_required?: boolean;
      follow_up_notes?: string;
      follow_up_date?: string;
      outcome?: string;
      sentiment_score?: number;
      engagement_type?: string;
    }
  ): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    // Follow-up based on outcome
    if (engagement.follow_up_required) {
      actions.push({
        id: crypto.randomUUID(),
        action: engagement.follow_up_notes || 'Follow up on previous engagement',
        due_date: engagement.follow_up_date
      });
    }

    // Outcome-specific actions
    switch (engagement.outcome) {
      case 'negative':
        actions.push({
          id: crypto.randomUUID(),
          action: 'Schedule recovery meeting to address concerns',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        });
        actions.push({
          id: crypto.randomUUID(),
          action: 'Prepare mitigation plan for identified issues',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;

      case 'no_response':
        actions.push({
          id: crypto.randomUUID(),
          action: 'Try alternative communication channel',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;

      case 'follow_up_needed':
        actions.push({
          id: crypto.randomUUID(),
          action: 'Send follow-up materials as discussed',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;

      case 'positive':
        if (engagement.engagement_type === 'meeting' || engagement.engagement_type === 'demo') {
          actions.push({
            id: crypto.randomUUID(),
            action: 'Send thank you note and recap',
            due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
          });
          actions.push({
            id: crypto.randomUUID(),
            action: 'Schedule next step discussion',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
        break;
    }

    return actions;
  }

  /**
   * Check for alerts based on engagement
   */
  private async checkEngagementAlerts(
    stakeholder_id: string,
    engagement: {
      outcome?: string;
      sentiment_score?: number;
      engagement_date?: string;
    }
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const alerts: Partial<StakeholderAlert>[] = [];

      // Get stakeholder info
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('*, champion_tracking!left(*)')
        .eq('id', stakeholder_id)
        .single();

      if (!stakeholder) return;

      // Check for sentiment decline
      if (engagement.sentiment_score < -50) {
        alerts.push({
          stakeholder_id,
          org_id: stakeholder.org_id,
          alert_type: 'sentiment_decline',
          severity: 'urgent',
          title: 'Significant negative sentiment detected',
          message: `${stakeholder.name} expressed strong negative sentiment in recent ${engagement.engagement_type}`,
          action_required: 'Immediate intervention recommended',
          status: 'active'
        });
      }

      // Check for champion at risk
      if (stakeholder.champion_status === 'active' || stakeholder.champion_status === 'super') {
        if (engagement.outcome === 'negative' || engagement.sentiment_score < 0) {
          alerts.push({
            stakeholder_id,
            org_id: stakeholder.org_id,
            alert_type: 'champion_at_risk',
            severity: 'urgent',
            title: 'Champion showing signs of risk',
            message: `Champion ${stakeholder.name} had negative engagement`,
            action_required: 'Review champion status and take corrective action',
            status: 'active'
          });
        }
      }

      // Check for engagement drop
      const { data: recentEngagements } = await supabase
        .from('stakeholder_engagement')
        .select('engagement_date')
        .eq('stakeholder_id', stakeholder_id)
        .order('engagement_date', { ascending: false })
        .limit(2) as { data: Row<'stakeholder_engagement'>[] | null; error: any };

      if (recentEngagements && recentEngagements.length === 2) {
        const daysBetween = Math.floor(
          (new Date(recentEngagements[0].engagement_date).getTime() -
           new Date(recentEngagements[1].engagement_date).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        if (daysBetween > 60) {
          alerts.push({
            stakeholder_id,
            org_id: stakeholder.org_id,
            alert_type: 'engagement_drop',
            severity: 'warning',
            title: 'Long gap between engagements',
            message: `${daysBetween} days since previous engagement with ${stakeholder.name}`,
            action_required: 'Consider increasing engagement frequency',
            status: 'active'
          });
        }
      }

      // Save alerts
      if (alerts.length > 0) {
        await supabase
          .from('stakeholder_alerts')
          .insert(alerts);
      }

    } catch (error) {
      console.error('Error checking engagement alerts:', error);
    }
  }

  /**
   * Detect role changes for stakeholders
   */
  async detectRoleChanges(
    request: DetectRoleChangeRequest
  ): Promise<DetectRoleChangeResponse> {
    try {
      const supabase = await this.getSupabase();
      const changesDetected: RoleChange[] = [];
      const alertsCreated: StakeholderAlert[] = [];

      // Build query
      let query = supabase
        .from('stakeholders')
        .select('*');

      if (request.stakeholder_id) {
        query = query.eq('id', request.stakeholder_id);
      } else if (request.company_id) {
        query = query.eq('company_id', request.company_id);
      }

      const { data: stakeholders } = await query;

      if (!stakeholders) {
        return {
          success: false,
          changes_detected: [],
          alerts_created: []
        };
      }

      // Check each stakeholder for role changes
      for (const stakeholder of stakeholders) {
        const roleChange = await this.checkForRoleChange(stakeholder);

        if (roleChange) {
          // Save role change
          const { data: savedChange } = await supabase
            .from('role_changes')
            .insert(roleChange)
            .select()
            .single();

          if (savedChange) {
            changesDetected.push(savedChange as RoleChange);

            // Create alert
            const alert: Partial<StakeholderAlert> = {
              stakeholder_id: stakeholder.id,
              org_id: stakeholder.org_id,
              alert_type: 'role_change',
              severity: this.determineRoleChangeSeverity(roleChange),
              title: `Role change detected for ${stakeholder.name}`,
              message: `${roleChange.previous_role} → ${roleChange.new_role}`,
              action_required: 'Review and update engagement strategy',
              status: 'active'
            };

            const { data: savedAlert } = await supabase
              .from('stakeholder_alerts')
              .insert(alert)
              .select()
              .single();

            if (savedAlert) {
              alertsCreated.push(savedAlert as StakeholderAlert);
            }
          }
        }
      }

      return {
        success: true,
        changes_detected: changesDetected,
        alerts_created: alertsCreated
      };

    } catch (error) {
      console.error('Role change detection error:', error);
      return {
        success: false,
        changes_detected: [],
        alerts_created: []
      };
    }
  }

  /**
   * Check for role change in a stakeholder
   */
  private async checkForRoleChange(stakeholder: {
    id: string;
    job_title?: string;
    company_id?: string;
    title?: string;
    org_id?: string;
    department?: string;
    role_type?: string;
    influence_level?: number;
    champion_status?: string;
  }): Promise<Partial<RoleChange> | null> {
    // This is a simplified check - in production, you'd integrate with
    // LinkedIn API, company directories, or other data sources

    // Check if title has changed (would need historical data)
    const supabase = await this.getSupabase();

    // Get most recent role change record
    const result = await supabase
      .from('role_changes')
      .select('*')
      .eq('stakeholder_id', stakeholder.id)
      .order('change_date', { ascending: false })
      .limit(1)
      .single();

    const typedLastChange: RoleChangeRow | null = result.data as RoleChangeRow | null;

    // Check if there's no change needed
    if (typedLastChange && typedLastChange.new_role === stakeholder.title) {
      return null;
    }

    // Role has changed or this is the first check
    const previousRole: string | undefined = typedLastChange?.new_role;
    const previousDepartment: string | null | undefined = typedLastChange?.new_department;

    const changeType = this.determineChangeType(
      previousRole,
      stakeholder.title
    );

    return {
      stakeholder_id: stakeholder.id,
      org_id: stakeholder.org_id,
      change_type: changeType,
      previous_role: previousRole || 'Unknown',
      new_role: stakeholder.title || 'Unknown',
      previous_department: previousDepartment || stakeholder.department,
      new_department: stakeholder.department,
      impact_on_relationship: this.assessRoleChangeImpact(changeType),
      continuity_risk: this.assessContinuityRisk(changeType, stakeholder),
      action_required: true,
      change_date: new Date().toISOString(),
      detected_date: new Date().toISOString()
    };
  }

  /**
   * Determine type of role change
   */
  private determineChangeType(
    previousRole?: string,
    newRole?: string
  ): RoleChange['change_type'] {
    if (!previousRole) return 'new_hire';
    if (!newRole) return 'departure';

    const prev = previousRole.toLowerCase();
    const next = newRole.toLowerCase();

    // Check for promotion indicators
    const promotionIndicators = ['senior', 'lead', 'head', 'director', 'vp', 'president', 'chief'];
    const prevLevel = promotionIndicators.findIndex(i => prev.includes(i));
    const nextLevel = promotionIndicators.findIndex(i => next.includes(i));

    if (nextLevel > prevLevel && nextLevel !== -1) {
      return 'promotion';
    } else if (prevLevel > nextLevel && prevLevel !== -1) {
      return 'demotion';
    } else if (prev !== next) {
      return 'lateral_move';
    }

    return 'title_change';
  }

  /**
   * Assess impact of role change on relationship
   */
  private assessRoleChangeImpact(
    changeType: RoleChange['change_type']
  ): RoleChange['impact_on_relationship'] {
    switch (changeType) {
      case 'promotion':
        return 'positive';
      case 'departure':
        return 'negative';
      case 'new_hire':
        return 'unknown';
      case 'demotion':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  /**
   * Assess continuity risk from role change
   */
  private assessContinuityRisk(
    changeType: RoleChange['change_type'],
    stakeholder: { role_type?: string; influence_level?: number; champion_status?: string }
  ): RoleChange['continuity_risk'] {
    if (changeType === 'departure') {
      if (stakeholder.champion_status === 'active' || stakeholder.champion_status === 'super') {
        return 'critical';
      }
      if (stakeholder.role_type === 'decision_maker' || stakeholder.influence_level >= 7) {
        return 'high';
      }
      return 'medium';
    }

    if (changeType === 'demotion') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine severity of role change alert
   */
  private determineRoleChangeSeverity(
    roleChange: Partial<RoleChange>
  ): StakeholderAlert['severity'] {
    if (roleChange.continuity_risk === 'critical') {
      return 'critical';
    } else if (roleChange.continuity_risk === 'high') {
      return 'urgent';
    } else if (roleChange.change_type === 'departure') {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Get engagement summary for a stakeholder
   */
  async getEngagementSummary(
    stakeholder_id: string,
    days: number = 90
  ): Promise<{
    total_engagements: number;
    engagement_types: Record<string, number>;
    average_sentiment: number;
    outcome_distribution: Record<string, number>;
    last_engagement?: StakeholderEngagement;
    engagement_frequency: string;
  }> {
    try {
      const supabase = await this.getSupabase();

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: engagements } = await supabase
        .from('stakeholder_engagement')
        .select('*')
        .eq('stakeholder_id', stakeholder_id)
        .gte('engagement_date', startDate)
        .order('engagement_date', { ascending: false }) as { data: Row<'stakeholder_engagement'>[] | null; error: any };

      if (!engagements || engagements.length === 0) {
        return {
          total_engagements: 0,
          engagement_types: {},
          average_sentiment: 0,
          outcome_distribution: {},
          engagement_frequency: 'none'
        };
      }

      // Calculate metrics
      const engagementTypes: Record<string, number> = {};
      const outcomeDistribution: Record<string, number> = {};
      let totalSentiment = 0;
      let sentimentCount = 0;

      engagements.forEach(e => {
        // Type distribution
        engagementTypes[(e as Error).engagement_type] = (engagementTypes[(e as Error).engagement_type] || 0) + 1;

        // Outcome distribution
        if ((e as Error).outcome) {
          outcomeDistribution[(e as Error).outcome] = (outcomeDistribution[(e as Error).outcome] || 0) + 1;
        }

        // Sentiment average
        if ((e as Error).sentiment_score !== null) {
          totalSentiment += (e as Error).sentiment_score;
          sentimentCount++;
        }
      });

      // Calculate frequency
      const avgDaysBetween = days / engagements.length;
      let frequency: string;
      if (avgDaysBetween <= 7) {
        frequency = 'weekly';
      } else if (avgDaysBetween <= 14) {
        frequency = 'bi_weekly';
      } else if (avgDaysBetween <= 30) {
        frequency = 'monthly';
      } else if (avgDaysBetween <= 90) {
        frequency = 'quarterly';
      } else {
        frequency = 'rare';
      }

      return {
        total_engagements: engagements.length,
        engagement_types: engagementTypes,
        average_sentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
        outcome_distribution: outcomeDistribution,
        last_engagement: engagements[0] as StakeholderEngagement,
        engagement_frequency: frequency
      };

    } catch (error) {
      console.error('Error getting engagement summary:', error);
      return {
        total_engagements: 0,
        engagement_types: {},
        average_sentiment: 0,
        outcome_distribution: {},
        engagement_frequency: 'none'
      };
    }
  }
}

// Export singleton instance
export const engagementTracker = new EngagementTracker();