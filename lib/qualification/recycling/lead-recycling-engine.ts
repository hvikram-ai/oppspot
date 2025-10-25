import { createClient } from '@/lib/supabase/server';
import {
  LeadRecyclingRule,
  LeadRecyclingHistory,
  NurtureCampaign,
  RecycleLeadRequest,
  CampaignStep
} from '../types/qualification';

interface LeadData {
  id?: string;
  total_score?: number;
  last_contact_date?: string;
  recent_website_visits?: number;
  email_opens?: number;
  content_downloads?: number;
  event_attendance?: boolean;
  original_assigned_to?: string;
  assigned_to?: string;
  updated_at?: string;
  previous_score?: number;
  score?: number;
  demo_requested?: boolean;
  price_inquiry?: boolean;
}

export class LeadRecyclingEngine {
  private static instance: LeadRecyclingEngine;

  private constructor() {}

  static getInstance(): LeadRecyclingEngine {
    if (!this.instance) {
      this.instance = new LeadRecyclingEngine();
    }
    return this.instance;
  }

  async recycleLead(request: RecycleLeadRequest) {
    const supabase = await createClient();

    try {
      // Get lead's current qualification status
      const { data: leadData, error: leadError } = await supabase
        .from('lead_scores')
        .select(`
          *,
          bant_qualifications(*),
          meddic_qualifications(*)
        `)
        .eq('id', request.lead_id)
        .single();

      if (leadError || !leadData) {
        throw new Error('Lead not found');
      }

      // Find applicable recycling rule
      const rule = await this.findApplicableRule(
        request.reason,
        leadData,
        request.company_id
      );

      if (!rule && !request.force) {
        return {
          success: false,
          message: 'No recycling rule applies to this lead'
        };
      }

      // Execute recycling action
      const recyclingResult = await this.executeRecycling(
        leadData,
        rule,
        request.reason
      );

      // Record recycling history
      await this.recordHistory(
        request.lead_id,
        request.company_id,
        rule?.id,
        recyclingResult
      );

      return {
        success: true,
        action: recyclingResult.action,
        assigned_to: recyclingResult.assigned_to,
        nurture_campaign: recyclingResult.nurture_campaign
      };

    } catch (error) {
      console.error('Error recycling lead:', error);
      return {
        success: false,
        message: 'Failed to recycle lead'
      };
    }
  }

  private async findApplicableRule(
    reason: string,
    leadData: LeadData,
    companyId: string
  ): Promise<LeadRecyclingRule | null> {
    const supabase = await createClient();

    const { data: rules, error } = await supabase
      .from('lead_recycling_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !rules) return null;

    // Find matching rule based on conditions
    for (const rule of rules) {
      if (this.matchesConditions(rule as LeadRecyclingRule, reason, leadData)) {
        return rule as LeadRecyclingRule;
      }
    }

    return null;
  }

  private matchesConditions(
    rule: LeadRecyclingRule,
    reason: string,
    leadData: LeadData
  ): boolean {
    const conditions = rule.trigger_conditions;

    // Check disqualification reason
    if (conditions.disqualification_reason?.length) {
      if (!conditions.disqualification_reason.includes(reason)) {
        return false;
      }
    }

    // Check time since disqualification
    if (conditions.time_since_disqualification && leadData.updated_at) {
      const daysSinceDisqualification = this.calculateDaysSince(
        leadData.updated_at
      );
      if (daysSinceDisqualification < conditions.time_since_disqualification) {
        return false;
      }
    }

    // Check score improvement
    if (conditions.score_improvement) {
      const previousScore = leadData.previous_score || 0;
      const currentScore = leadData.score || 0;
      if (currentScore - previousScore < conditions.score_improvement) {
        return false;
      }
    }

    // Check engagement signals
    if (conditions.engagement_signals?.length) {
      const hasSignal = conditions.engagement_signals.some(signal =>
        this.hasEngagementSignal(leadData, signal)
      );
      if (!hasSignal) return false;
    }

    return true;
  }

  private hasEngagementSignal(leadData: LeadData, signal: string): boolean {
    switch (signal) {
      case 'website_visit':
        return (leadData.recent_website_visits ?? 0) > 0;
      case 'email_open':
        return (leadData.email_opens ?? 0) > 0;
      case 'content_download':
        return (leadData.content_downloads ?? 0) > 0;
      case 'demo_request':
        return leadData.demo_requested === true;
      case 'price_inquiry':
        return leadData.price_inquiry === true;
      default:
        return false;
    }
  }

  private async executeRecycling(
    leadData: LeadData,
    rule: LeadRecyclingRule | null,
    reason: string
  ) {
    const supabase = await createClient();
    const action = rule?.recycling_action || 'nurture';

    let assigned_to = null;
    let nurture_campaign = null;

    switch (action) {
      case 're_engage':
        // Immediate re-engagement with sales
        assigned_to = await this.determineAssignment(
          rule?.assignment_strategy || 'original_rep',
          leadData
        );

        // Update lead status to re-engaged
        if (leadData.id) {
          await supabase
            .from('lead_scores')
            .update({
              status: 're_engaged',
              assigned_to,
              re_engaged_at: new Date().toISOString()
            })
            .eq('id', leadData.id)
        }
        break;

      case 'nurture':
        // Add to nurture campaign
        nurture_campaign = await this.selectNurtureCampaign(
          reason,
          leadData
        );

        if (nurture_campaign && leadData.id) {
          await this.addToNurtureCampaign(
            leadData.id,
            nurture_campaign.id
          );
        }

        // Update lead status
        if (leadData.id) {
          await supabase
            .from('lead_scores')
            .update({
              status: 'nurturing',
              nurture_campaign_id: nurture_campaign?.id
            })
            .eq('id', leadData.id)
        }
        break;

      case 're_qualify':
        // Reset qualification and re-run
        if (leadData.id) {
          await this.resetQualification(leadData.id);
        }

        // Trigger re-qualification workflow
        assigned_to = await this.determineAssignment(
          rule?.assignment_strategy || 'new_rep',
          leadData
        );

        if (leadData.id) {
          await supabase
            .from('lead_scores')
            .update({
              status: 're_qualifying',
              assigned_to,
              re_qualification_date: new Date().toISOString()
            })
            .eq('id', leadData.id)
        }
        break;

      case 'archive':
        // Archive the lead
        if (leadData.id) {
          await supabase
            .from('lead_scores')
            .update({
              status: 'archived',
              archived_at: new Date().toISOString(),
              archive_reason: reason
            })
            .eq('id', leadData.id)
        }
        break;
    }

    return {
      action,
      assigned_to,
      nurture_campaign
    };
  }

  private async selectNurtureCampaign(
    reason: string,
    leadData: LeadData
  ): Promise<NurtureCampaign | null> {
    const supabase = await createClient();

    // Map disqualification reasons to campaign types
    const campaignTypeMap: Record<string, string> = {
      'no_budget': 'no_budget',
      'not_ready': 'not_ready',
      'lost_to_competitor': 'lost_to_competitor',
      'bad_timing': 'bad_timing',
      'price_objection': 'price_objection'
    };

    const campaignType = campaignTypeMap[reason] || 'general';

    const { data: campaign, error } = await supabase
      .from('nurture_campaigns')
      .select('*')
      .eq('campaign_type', campaignType)
      .eq('is_active', true)
      .single();

    if (error || !campaign) {
      // Fall back to general campaign
      const { data: generalCampaign } = await supabase
        .from('nurture_campaigns')
        .select('*')
        .eq('campaign_type', 'general')
        .eq('is_active', true)
        .single();

      return generalCampaign as NurtureCampaign | null;
    }

    return campaign as NurtureCampaign;
  }

  private async addToNurtureCampaign(
    leadId: string,
    campaignId: string
  ) {
    const supabase = await createClient();

    // Add lead to campaign enrollment
    await supabase
      .from('nurture_campaign_enrollments')
      .insert({
        lead_id: leadId,
        campaign_id: campaignId,
        enrolled_at: new Date().toISOString(),
        status: 'active',
        current_step: 0
      } as Record<string, unknown>);

    // Schedule first campaign step
    const { data: campaign } = await supabase
      .from('nurture_campaigns')
      .select('*, nurture_campaign_steps(*)')
      .eq('id', campaignId)
      .single();

    const typedCampaign = campaign;
    if (typedCampaign?.nurture_campaign_steps?.length) {
      await this.scheduleNextStep(
        leadId,
        campaignId,
        typedCampaign.nurture_campaign_steps[0]
      );
    }
  }

  private async scheduleNextStep(
    leadId: string,
    campaignId: string,
    step: CampaignStep
  ) {
    const supabase = await createClient();

    // Calculate execution time based on step timing
    const executionTime = this.calculateStepExecutionTime(step.timing);

    // Create scheduled task
    await supabase
      .from('scheduled_campaign_tasks')
      .insert({
        lead_id: leadId,
        campaign_id: campaignId,
        step_id: step.id,
        task_type: step.type,
        scheduled_for: executionTime,
        status: 'pending'
      } as Record<string, unknown>);
  }

  private calculateStepExecutionTime(timing: string): string {
    const now = new Date();

    // Parse timing string (e.g., "1d", "3h", "1w")
    const match = timing.match(/(\d+)([dhwm])/);
    if (!match) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Default 1 day
    }

    const [, amount, unit] = match;
    const value = parseInt(amount);

    switch (unit) {
      case 'h': // hours
        now.setHours(now.getHours() + value);
        break;
      case 'd': // days
        now.setDate(now.getDate() + value);
        break;
      case 'w': // weeks
        now.setDate(now.getDate() + value * 7);
        break;
      case 'm': // months
        now.setMonth(now.getMonth() + value);
        break;
    }

    return now.toISOString();
  }

  private async determineAssignment(
    strategy: string,
    leadData: LeadData
  ): Promise<string | null> {
    const supabase = await createClient();

    switch (strategy) {
      case 'original_rep':
        return leadData.original_assigned_to || leadData.assigned_to || null;

      case 'new_rep':
        // Get available reps
        const { data: reps } = await supabase
          .from('team_members')
          .select('*')
          .eq('is_active', true)
          .eq('accepts_recycled_leads', true);

        if (reps?.length) {
          // Simple round-robin for now
          const randomIndex = Math.floor(Math.random() * reps.length);
          return reps[randomIndex]?.id;
        }
        break;

      case 'nurture_team':
        // Get nurture team member
        const { data: nurtureTeam } = await supabase
          .from('team_members')
          .select('*')
          .eq('team', 'nurture')
          .eq('is_active', true)
          .single();

        return nurtureTeam?.id;

      case 'marketing':
        // Assign to marketing team queue
        return 'marketing_queue';

      case 'round_robin':
        // Use existing round-robin logic
        const { data: nextRep } = await supabase
          .rpc('get_next_available_rep');
        return nextRep;
    }

    return null;
  }

  private async resetQualification(leadId: string) {
    const supabase = await createClient();

    // Delete existing qualifications
    await supabase
      .from('bant_qualifications')
      .delete()
      .eq('lead_id', leadId);

    await supabase
      .from('meddic_qualifications')
      .delete()
      .eq('lead_id', leadId);

    // Reset lead score
    await supabase
      .from('lead_scores')
      .update({
        score: 0,
        qualification_status: null,
        qualified_at: null
      })
      .eq('id', leadId);
  }

  private async recordHistory(
    leadId: string,
    companyId: string,
    ruleId: string | undefined,
    result: Record<string, unknown>
  ) {
    const supabase = await createClient();

    await supabase
      .from('lead_recycling_history')
      .insert({
        lead_id: leadId,
        company_id: companyId,
        rule_id: ruleId,
        recycling_reason: result.action as string,
        recycled_to: result.assigned_to as string,
        created_at: new Date().toISOString()
      } as Record<string, unknown>);
  }

  private calculateDaysSince(date: string): number {
    const then = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // AI-powered optimization methods
  async optimizeRecyclingRules() {
    const supabase = await createClient();

    // Analyze historical recycling success rates
    const { data: history } = await supabase
      .from('lead_recycling_history')
      .select('*')
      .not('outcome', 'is', null);

    if (!history?.length) return;

    // Calculate success rates by rule
    const rulePerformance = new Map<string, {
      total: number;
      successful: number;
      avgDaysToConversion: number;
    }>();

    for (const record of history) {
      const typedRecord = record as LeadRecyclingHistory;
      const ruleId = typedRecord.rule_id;
      if (!ruleId) continue;

      if (!rulePerformance.has(ruleId)) {
        rulePerformance.set(ruleId, {
          total: 0,
          successful: 0,
          avgDaysToConversion: 0
        });
      }

      const perf = rulePerformance.get(ruleId)!;
      perf.total++;

      if (typedRecord.outcome === 'converted' || typedRecord.outcome === 're_qualified') {
        perf.successful++;
        if (typedRecord.outcome_date && typedRecord.created_at) {
          const days = this.calculateDaysSince(typedRecord.created_at);
          perf.avgDaysToConversion =
            (perf.avgDaysToConversion * (perf.successful - 1) + days) / perf.successful;
        }
      }
    }

    // Update rule priorities based on performance
    for (const [ruleId, performance] of rulePerformance) {
      const successRate = performance.successful / performance.total;

      // Boost priority for high-performing rules
      if (successRate > 0.3) {
        await supabase
          .from('lead_recycling_rules')
          .update({
            priority: Math.min(100, Math.round(successRate * 100)),
            settings: {
              success_rate: successRate,
              avg_conversion_days: performance.avgDaysToConversion,
              total_processed: performance.total
            }
          })
          .eq('id', ruleId);
      }
    }
  }

  async predictRecyclingSuccess(leadId: string): Promise<number> {
    const supabase = await createClient();

    // Get lead data with historical patterns
    const { data: lead } = await supabase
      .from('lead_scores')
      .select(`
        *,
        company:businesses(
          industry,
          company_size,
          revenue_range
        )
      `)
      .eq('id', leadId)
      .single();

    if (!lead) return 0;

    // Get similar leads that were recycled
    const { data: similarLeads } = await supabase
      .from('lead_recycling_history')
      .select(`
        *,
        lead:lead_scores(
          *,
          company:businesses(
            industry,
            company_size,
            revenue_range
          )
        )
      `)
      .eq('lead.company.industry', lead.company?.industry)
      .not('outcome', 'is', null);

    if (!similarLeads?.length) return 0.5; // Default 50% if no data

    interface RecyclingHistoryData {
      outcome: string | null;
    }

    // Calculate success rate for similar leads
    const typedLeads = similarLeads as unknown as RecyclingHistoryData[];
    const successful = typedLeads.filter((l) =>
      l.outcome === 'converted' || l.outcome === 're_qualified'
    ).length;

    return successful / typedLeads.length;
  }

  async getRecyclingRecommendations(leadId: string) {
    const successProbability = await this.predictRecyclingSuccess(leadId);

    const recommendations = [];

    if (successProbability > 0.7) {
      recommendations.push({
        action: 're_engage',
        confidence: 'high',
        reason: 'High probability of successful re-engagement based on similar leads'
      });
    } else if (successProbability > 0.4) {
      recommendations.push({
        action: 'nurture',
        confidence: 'medium',
        reason: 'Moderate success probability - nurturing recommended'
      });
    } else {
      recommendations.push({
        action: 'archive',
        confidence: 'low',
        reason: 'Low probability of conversion - consider archiving'
      });
    }

    return recommendations;
  }
}

export default LeadRecyclingEngine.getInstance();