import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
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

// Database type aliases
type StakeholderRow = Database['public']['Tables']['stakeholders']['Row'];
type StakeholderEngagementRow = Database['public']['Tables']['stakeholder_engagement']['Row'];
type StakeholderEngagementInsert = Database['public']['Tables']['stakeholder_engagement']['Insert'];
type StakeholderUpdate = Database['public']['Tables']['stakeholders']['Update'];

// Interface for role change database row (table doesn't exist yet, using type definition)
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

// Interface for engagement data with extended fields (stored in metadata)
interface EngagementData {
  outcome?: string;
  sentiment_score?: number;
  engagement_date?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  follow_up_date?: string;
  engagement_type?: string;
  subject?: string;
  description?: string;
  duration_minutes?: number;
  participants?: unknown[];
  meeting_link?: string;
  recording_url?: string;
  attachments?: unknown[];
}

export class EngagementTracker {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

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

      // Map StakeholderEngagement to database schema
      const dbEngagement: StakeholderEngagementInsert = {
        stakeholder_id: request.engagement.stakeholder_id,
        user_id: request.engagement.initiated_by || '', // Required field
        engagement_type: request.engagement.engagement_type || 'other',
        engagement_score: request.engagement.sentiment_score || 0,
        last_contact: request.engagement.engagement_date,
        metadata: {
          outcome: request.engagement.outcome,
          sentiment_score: request.engagement.sentiment_score,
          engagement_date: request.engagement.engagement_date,
          follow_up_required: request.engagement.follow_up_required,
          follow_up_notes: request.engagement.follow_up_notes,
          follow_up_date: request.engagement.follow_up_date,
          subject: request.engagement.subject,
          description: request.engagement.description,
          duration_minutes: request.engagement.duration_minutes,
          participants: request.engagement.participants,
          meeting_link: request.engagement.meeting_link,
          recording_url: request.engagement.recording_url,
          attachments: request.engagement.attachments
        } as Database['public']['Tables']['stakeholder_engagement']['Insert']['metadata']
      };

      // Validate and save engagement
      // Cast to any due to complex metadata structure in insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertResult = await (supabase as any)
        .from('stakeholder_engagement')
        .insert(dbEngagement)
        .select()
        .single();

      const { data: engagement, error } = insertResult as { data: StakeholderEngagementRow | null; error: unknown };

      if (error || !engagement) {
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

      // Create complete engagement object with id and timestamps
      const completeEngagement: StakeholderEngagement = {
        ...request.engagement,
        id: engagement.id,
        created_at: engagement.created_at,
        updated_at: engagement.updated_at
      };

      return {
        success: true,
        engagement: completeEngagement,
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
    engagement: EngagementData
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      // Get recent engagements for score calculation
      const { data: recentEngagements } = await supabase
        .from('stakeholder_engagement')
        .select('engagement_type, engagement_score, last_contact, metadata')
        .eq('stakeholder_id', stakeholder_id)
        .order('last_contact', { ascending: false })
        .limit(10)
        .returns<StakeholderEngagementRow[]>();

      if (!recentEngagements) return;

      // Calculate engagement score
      let engagementScore = 50; // Base score

      // Frequency factor
      const daysSinceFirstEngagement = recentEngagements.length > 0 && recentEngagements[recentEngagements.length - 1].last_contact
        ? Math.floor(
            (Date.now() - new Date(recentEngagements[recentEngagements.length - 1].last_contact!).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : 0;

      if (daysSinceFirstEngagement > 0) {
        const engagementFrequency = recentEngagements.length / daysSinceFirstEngagement * 30;
        engagementScore += Math.min(25, engagementFrequency * 10);
      }

      // Outcome factor - using metadata field for extended data
      const positiveOutcomes = recentEngagements.filter(
        (e) => {
          const metadata = e.metadata as { outcome?: string } | null;
          return metadata && metadata.outcome === 'positive';
        }
      ).length;
      const outcomeRatio = recentEngagements.length > 0
        ? positiveOutcomes / recentEngagements.length
        : 0;
      engagementScore += outcomeRatio * 25;

      // Sentiment factor - using engagement_score from database
      const avgSentiment = recentEngagements
        .filter((e) => e.engagement_score !== null && e.engagement_score !== undefined)
        .reduce((sum, e) => sum + (e.engagement_score + 100) / 2, 0) /
        (recentEngagements.filter((e) => e.engagement_score !== null && e.engagement_score !== undefined).length || 1);
      engagementScore = Math.round(Math.min(100, engagementScore * (avgSentiment / 50)));

      // Update stakeholder - merge existing metadata with new fields
      const { data: currentStakeholder } = await supabase
        .from('stakeholders')
        .select('metadata')
        .eq('id', stakeholder_id)
        .returns<Pick<StakeholderRow, 'metadata'>[]>()
        .single();

      const existingMetadata = (currentStakeholder?.metadata as Record<string, unknown>) || {};
      const updatedMetadata = {
        ...existingMetadata,
        last_contact_date: engagement.engagement_date,
        engagement_score: engagementScore
      } as Database['public']['Tables']['stakeholders']['Update']['metadata'];

      // Cast to any for the update since metadata structure is complex
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('stakeholders')
        .update({
          metadata: updatedMetadata,
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
        .select('engagement_score, last_contact')
        .eq('stakeholder_id', stakeholder_id)
        .order('last_contact', { ascending: false })
        .limit(10)
        .returns<StakeholderEngagementRow[]>();

      if (!engagements || engagements.length < 2) {
        return 'stable';
      }

      const sentiments = engagements
        .filter((e) => e.engagement_score !== null && e.engagement_score !== undefined)
        .map((e) => e.engagement_score);

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
    engagement: StakeholderEngagementRow
  ): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    // Extract metadata for extended fields
    const metadata = engagement.metadata as EngagementData | null;

    // Follow-up based on outcome
    if (metadata?.follow_up_required) {
      actions.push({
        id: crypto.randomUUID(),
        action: metadata.follow_up_notes || 'Follow up on previous engagement',
        due_date: metadata.follow_up_date
      });
    }

    // Outcome-specific actions
    switch (metadata?.outcome) {
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
    engagement: StakeholderEngagementRow
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const alerts: Partial<StakeholderAlert>[] = [];

      // Get stakeholder info
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('id', stakeholder_id)
        .returns<StakeholderRow[]>()
        .single();

      if (!stakeholder) return;

      // Extract metadata
      const metadata = engagement.metadata as EngagementData | null;
      const stakeholderMetadata = stakeholder.metadata as { champion_status?: string; org_id?: string } | null;

      // Check for sentiment decline
      if (metadata?.sentiment_score && metadata.sentiment_score < -50) {
        alerts.push({
          stakeholder_id,
          org_id: stakeholderMetadata?.org_id,
          alert_type: 'sentiment_decline',
          severity: 'urgent',
          title: 'Significant negative sentiment detected',
          message: `${stakeholder.name} expressed strong negative sentiment in recent engagement`,
          action_required: 'Immediate intervention recommended',
          status: 'active'
        });
      }

      // Check for champion at risk
      if (stakeholderMetadata?.champion_status === 'active' || stakeholderMetadata?.champion_status === 'super') {
        if (metadata?.outcome === 'negative' || (metadata?.sentiment_score && metadata.sentiment_score < 0)) {
          alerts.push({
            stakeholder_id,
            org_id: stakeholderMetadata?.org_id,
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
        .select('last_contact')
        .eq('stakeholder_id', stakeholder_id)
        .order('last_contact', { ascending: false })
        .limit(2)
        .returns<Pick<StakeholderEngagementRow, 'last_contact'>[]>();

      if (recentEngagements && recentEngagements.length === 2 && recentEngagements[0].last_contact && recentEngagements[1].last_contact) {
        const daysBetween = Math.floor(
          (new Date(recentEngagements[0].last_contact).getTime() -
           new Date(recentEngagements[1].last_contact).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        if (daysBetween > 60) {
          alerts.push({
            stakeholder_id,
            org_id: stakeholderMetadata?.org_id,
            alert_type: 'engagement_drop',
            severity: 'warning',
            title: 'Long gap between engagements',
            message: `${daysBetween} days since previous engagement with ${stakeholder.name}`,
            action_required: 'Consider increasing engagement frequency',
            status: 'active'
          });
        }
      }

      // Save alerts - Note: stakeholder_alerts table doesn't exist yet
      // This will fail gracefully and log error if table doesn't exist
      if (alerts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
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

      const { data: stakeholders } = await query.returns<StakeholderRow[]>();

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
          // Save role change - Note: role_changes table doesn't exist yet
          // This will fail gracefully and log error if table doesn't exist
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: savedChange } = await (supabase as any)
            .from('role_changes')
            .insert(roleChange)
            .select()
            .single();

          if (savedChange) {
            changesDetected.push(savedChange as RoleChange);

            // Extract metadata
            const stakeholderMetadata = stakeholder.metadata as { org_id?: string } | null;

            // Create alert
            const alert: Partial<StakeholderAlert> = {
              stakeholder_id: stakeholder.id,
              org_id: stakeholderMetadata?.org_id,
              alert_type: 'role_change',
              severity: this.determineRoleChangeSeverity(roleChange),
              title: `Role change detected for ${stakeholder.name}`,
              message: `${roleChange.previous_role} → ${roleChange.new_role}`,
              action_required: 'Review and update engagement strategy',
              status: 'active'
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: savedAlert } = await (supabase as any)
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
  private async checkForRoleChange(stakeholder: StakeholderRow): Promise<Partial<RoleChange> | null> {
    // This is a simplified check - in production, you'd integrate with
    // LinkedIn API, company directories, or other data sources

    // Check if title has changed (would need historical data)
    const supabase = await this.getSupabase();

    // Get most recent role change record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase as any)
      .from('role_changes')
      .select('*')
      .eq('stakeholder_id', stakeholder.id)
      .order('change_date', { ascending: false })
      .limit(1)
      .single();

    const typedLastChange: RoleChangeRow | null = result.data as RoleChangeRow | null;

    // Check if there's no change needed
    if (typedLastChange && typedLastChange.new_role === stakeholder.job_title) {
      return null;
    }

    // Extract metadata for extended fields
    const metadata = stakeholder.metadata as {
      org_id?: string;
      role_type?: string;
      influence_level?: number;
      champion_status?: string;
    } | null;

    // Role has changed or this is the first check
    const previousRole: string | undefined = typedLastChange?.new_role;
    const previousDepartment: string | null | undefined = typedLastChange?.new_department;

    const changeType = this.determineChangeType(
      previousRole,
      stakeholder.job_title
    );

    return {
      stakeholder_id: stakeholder.id,
      org_id: metadata?.org_id,
      change_type: changeType,
      previous_role: previousRole || 'Unknown',
      new_role: stakeholder.job_title || 'Unknown',
      previous_department: previousDepartment ?? stakeholder.department ?? undefined,
      new_department: stakeholder.department ?? undefined,
      impact_on_relationship: this.assessRoleChangeImpact(changeType),
      continuity_risk: this.assessContinuityRisk(changeType, metadata),
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
    metadata: { role_type?: string; influence_level?: number; champion_status?: string } | null
  ): RoleChange['continuity_risk'] {
    if (changeType === 'departure') {
      if (metadata?.champion_status === 'active' || metadata?.champion_status === 'super') {
        return 'critical';
      }
      if (metadata?.role_type === 'decision_maker' || (metadata?.influence_level && metadata.influence_level >= 7)) {
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
        .gte('last_contact', startDate)
        .order('last_contact', { ascending: false })
        .returns<StakeholderEngagementRow[]>();

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

      engagements.forEach((e) => {
        // Type distribution
        engagementTypes[e.engagement_type] = (engagementTypes[e.engagement_type] || 0) + 1;

        // Extract metadata for outcome
        const metadata = e.metadata as EngagementData | null;

        // Outcome distribution
        if (metadata?.outcome) {
          outcomeDistribution[metadata.outcome] = (outcomeDistribution[metadata.outcome] || 0) + 1;
        }

        // Sentiment average using engagement_score
        if (e.engagement_score !== null && e.engagement_score !== undefined) {
          totalSentiment += e.engagement_score;
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

      // Convert database row to StakeholderEngagement format
      const lastEngagement = engagements[0];
      const lastMetadata = lastEngagement.metadata as EngagementData | null;

      const convertedLastEngagement: StakeholderEngagement = {
        id: lastEngagement.id,
        stakeholder_id: lastEngagement.stakeholder_id,
        engagement_type: lastEngagement.engagement_type as EngagementType,
        engagement_date: lastEngagement.last_contact || new Date().toISOString(),
        sentiment_score: lastEngagement.engagement_score,
        outcome: lastMetadata?.outcome as EngagementOutcome | undefined,
        follow_up_required: lastMetadata?.follow_up_required,
        follow_up_date: lastMetadata?.follow_up_date,
        follow_up_notes: lastMetadata?.follow_up_notes,
        subject: lastMetadata?.subject as string | undefined,
        description: lastMetadata?.description as string | undefined,
        created_at: lastEngagement.created_at,
        updated_at: lastEngagement.updated_at
      };

      return {
        total_engagements: engagements.length,
        engagement_types: engagementTypes,
        average_sentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
        outcome_distribution: outcomeDistribution,
        last_engagement: convertedLastEngagement,
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