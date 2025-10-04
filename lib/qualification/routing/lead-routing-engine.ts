import { createClient } from '@/lib/supabase/server';
import type {
  LeadRoutingRule,
  LeadAssignment,
  RoutingDecision,
  RouteLeadRequest
} from '../types/qualification';

interface LeadData {
  id?: string;
  total_score?: number;
  qualification_stage?: string;
  engagement_level?: string;
  businesses?: {
    industry?: string;
    region?: string;
    city?: string;
    revenue?: number;
  };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  current_load: number;
  max_capacity: number;
  skills?: string[];
  territories?: string[];
  availability_status: 'available' | 'busy' | 'unavailable';
  performance_score?: number;
}

export class LeadRoutingEngine {
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
   * Route a lead to the optimal representative
   */
  async routeLead(request: RouteLeadRequest): Promise<RoutingDecision | null> {
    try {
      const supabase = await this.getSupabase();

      // Get lead and company data
      const { data: lead } = await supabase
        .from('lead_scores')
        .select(`
          *,
          businesses!inner(*)
        `)
        .eq('id', request.lead_id)
        .single();

      if (!lead) {
        console.error('Lead not found');
        return null;
      }

      // Get routing rules
      const rules = await this.getApplicableRules(lead, request.company_id);

      // Override with preferred assignee if specified
      if (request.preferred_assignee && !request.override_rules) {
        return this.createDirectAssignment(request.preferred_assignee, 'Manual assignment');
      }

      // Apply routing rules in priority order
      for (const rule of rules) {
        if (this.evaluateRuleConditions(rule, lead)) {
          const decision = await this.applyRoutingAlgorithm(rule, lead);
          if (decision) {
            // Save assignment
            await this.saveAssignment(request.lead_id, request.company_id, decision, rule.id);
            return decision;
          }
        }
      }

      // Fallback to round-robin if no rules match
      return await this.fallbackRouting(lead);

    } catch (error) {
      console.error('Lead routing error:', error);
      return null;
    }
  }

  /**
   * Get applicable routing rules for the organization
   */
  private async getApplicableRules(lead: LeadData, company_id: string): Promise<LeadRoutingRule[]> {
    const supabase = await this.getSupabase();

    // Get organization ID
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user?.id)
      .single();

    const { data: rules } = await supabase
      .from('lead_routing_rules')
      .select('*')
      .eq('org_id', profile?.org_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    return (rules || []).map(r => this.mapRuleFromDatabase(r));
  }

  /**
   * Evaluate if a rule's conditions match the lead
   */
  private evaluateRuleConditions(rule: LeadRoutingRule, lead: LeadData): boolean {
    const conditions = rule.conditions;

    // Score range check
    if (conditions.score_range) {
      const score = lead.total_score || 0;
      if (score < conditions.score_range.min || score > conditions.score_range.max) {
        return false;
      }
    }

    // Company size check
    if (conditions.company_size && conditions.company_size.length > 0) {
      const size = this.categorizeCompanySize(lead.businesses?.employee_count);
      if (!conditions.company_size.includes(size)) {
        return false;
      }
    }

    // Industry check
    if (conditions.industry && conditions.industry.length > 0) {
      const industry = lead.businesses?.industry;
      if (!industry || !conditions.industry.includes(industry)) {
        return false;
      }
    }

    // Geography check
    if (conditions.geography && conditions.geography.length > 0) {
      const location = lead.businesses?.city || lead.businesses?.region;
      if (!location || !conditions.geography.some(g => location.includes(g))) {
        return false;
      }
    }

    // Engagement level check
    if (conditions.engagement_level) {
      const engagementScore = lead.engagement_score || 0;
      const level = this.categorizeEngagementLevel(engagementScore);
      if (level !== conditions.engagement_level) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply the specified routing algorithm
   */
  private async applyRoutingAlgorithm(rule: LeadRoutingRule, lead: LeadData): Promise<RoutingDecision | null> {
    const teamMembers = await this.getTeamMembers(rule);

    if (!teamMembers || teamMembers.length === 0) {
      console.error('No team members available for routing');
      return null;
    }

    let assignedTo: string;
    let reason: string;

    switch (rule.routing_algorithm) {
      case 'round_robin':
        const assigned = await this.roundRobinAssignment(teamMembers);
        assignedTo = assigned.id;
        reason = `Round-robin assignment to ${assigned.name}`;
        break;

      case 'weighted':
        const weighted = await this.weightedAssignment(teamMembers);
        assignedTo = weighted.id;
        reason = `Weighted distribution to ${weighted.name} (capacity: ${weighted.current_load}/${weighted.max_capacity})`;
        break;

      case 'skill_based':
        const skilled = await this.skillBasedAssignment(teamMembers, lead);
        assignedTo = skilled.id;
        reason = `Skill-matched assignment to ${skilled.name}`;
        break;

      case 'territory':
        const territorial = await this.territoryBasedAssignment(teamMembers, lead);
        assignedTo = territorial.id;
        reason = `Territory assignment to ${territorial.name}`;
        break;

      case 'account_based':
        const account = await this.accountBasedAssignment(teamMembers, lead);
        assignedTo = account.id;
        reason = `Account-based assignment to ${account.name}`;
        break;

      case 'ai_optimized':
        const optimized = await this.aiOptimizedAssignment(teamMembers, lead);
        assignedTo = optimized.id;
        reason = `AI-optimized assignment to ${optimized.name}`;
        break;

      default:
        const defaultMember = teamMembers[0];
        assignedTo = defaultMember.id;
        reason = `Default assignment to ${defaultMember.name}`;
    }

    return {
      assigned_to: assignedTo,
      routing_reason: reason,
      priority: this.calculatePriority(lead.total_score || 0),
      sla: rule.sla_hours || 24,
      escalation_path: await this.defineEscalationPath(rule)
    };
  }

  /**
   * Round-robin assignment algorithm
   */
  private async roundRobinAssignment(teamMembers: TeamMember[]): Promise<TeamMember> {
    const supabase = await this.getSupabase();

    // Get last assignment
    const { data: lastAssignment } = await supabase
      .from('lead_assignments')
      .select('assigned_to')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastAssignment) {
      return teamMembers[0];
    }

    // Find next team member in rotation
    const lastIndex = teamMembers.findIndex(m => m.id === lastAssignment.assigned_to);
    const nextIndex = (lastIndex + 1) % teamMembers.length;

    return teamMembers[nextIndex];
  }

  /**
   * Weighted assignment based on capacity
   */
  private async weightedAssignment(teamMembers: TeamMember[]): Promise<TeamMember> {
    // Filter available members with capacity
    const available = teamMembers.filter(m =>
      m.availability_status === 'available' &&
      m.current_load < m.max_capacity
    );

    if (available.length === 0) {
      // Fallback to least loaded member
      return teamMembers.reduce((min, m) =>
        (m.current_load / m.max_capacity) < (min.current_load / min.max_capacity) ? m : min
      );
    }

    // Calculate weights based on available capacity
    const weights = available.map(m => ({
      member: m,
      weight: (m.max_capacity - m.current_load) / m.max_capacity
    }));

    // Select based on weighted random
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const w of weights) {
      random -= w.weight;
      if (random <= 0) {
        return w.member;
      }
    }

    return available[0];
  }

  /**
   * Skill-based assignment
   */
  private async skillBasedAssignment(teamMembers: TeamMember[], lead: LeadData): Promise<TeamMember> {
    // Determine required skills based on lead characteristics
    const requiredSkills: string[] = [];

    if (lead.businesses?.industry) {
      requiredSkills.push(lead.businesses.industry.toLowerCase());
    }

    if (lead.total_score >= 80) {
      requiredSkills.push('enterprise');
    } else if (lead.total_score >= 60) {
      requiredSkills.push('mid-market');
    } else {
      requiredSkills.push('smb');
    }

    // Score team members based on skill match
    const scored = teamMembers.map(m => ({
      member: m,
      score: this.calculateSkillMatch(m.skills || [], requiredSkills)
    }));

    // Sort by score and return best match
    scored.sort((a, b) => b.score - a.score);

    // If no good match, use performance score
    if (scored[0].score === 0) {
      const byPerformance = teamMembers
        .filter(m => m.availability_status === 'available')
        .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));

      return byPerformance[0] || teamMembers[0];
    }

    return scored[0].member;
  }

  /**
   * Territory-based assignment
   */
  private async territoryBasedAssignment(teamMembers: TeamMember[], lead: LeadData): Promise<TeamMember> {
    const territory = lead.businesses?.region || lead.businesses?.city;

    if (!territory) {
      return teamMembers[0];
    }

    // Find team member with matching territory
    const territoryMatch = teamMembers.find(m =>
      m.territories?.some(t => territory.toLowerCase().includes(t.toLowerCase()))
    );

    if (territoryMatch) {
      return territoryMatch;
    }

    // Fallback to round-robin
    return await this.roundRobinAssignment(teamMembers);
  }

  /**
   * Account-based assignment
   */
  private async accountBasedAssignment(teamMembers: TeamMember[], lead: any): Promise<TeamMember> {
    const supabase = await this.getSupabase();

    // Check if company has existing assigned rep
    const { data: existingAssignment } = await supabase
      .from('lead_assignments')
      .select('assigned_to')
      .eq('company_id', lead.company_id)
      .eq('status', 'working')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingAssignment) {
      const existingRep = teamMembers.find(m => m.id === existingAssignment.assigned_to);
      if (existingRep && existingRep.availability_status === 'available') {
        return existingRep;
      }
    }

    // Check for similar companies
    const { data: similarCompanies } = await supabase
      .from('businesses')
      .select('id')
      .eq('industry', lead.businesses?.industry)
      .neq('id', lead.company_id)
      .limit(10);

    if (similarCompanies && similarCompanies.length > 0) {
      const { data: similarAssignments } = await supabase
        .from('lead_assignments')
        .select('assigned_to, COUNT(*) as count')
        .in('company_id', similarCompanies.map(c => c.id))
        .group('assigned_to');

      if (similarAssignments && similarAssignments.length > 0) {
        // Assign to rep with most experience in this industry
        const bestRep = similarAssignments
          .map(a => ({
            ...a,
            member: teamMembers.find(m => m.id === a.assigned_to)
          }))
          .filter(a => a.member && a.member.availability_status === 'available')
          .sort((a, b) => b.count - a.count)[0];

        if (bestRep?.member) {
          return bestRep.member;
        }
      }
    }

    // Fallback to weighted assignment
    return await this.weightedAssignment(teamMembers);
  }

  /**
   * AI-optimized assignment
   */
  private async aiOptimizedAssignment(teamMembers: TeamMember[], lead: any): Promise<TeamMember> {
    // Score each team member based on multiple factors
    const scores = await Promise.all(teamMembers.map(async (member) => {
      let score = 0;

      // Capacity score (30%)
      const capacityRatio = member.current_load / member.max_capacity;
      score += (1 - capacityRatio) * 30;

      // Performance score (25%)
      score += (member.performance_score || 50) * 0.25;

      // Skill match score (20%)
      const skills = this.extractRequiredSkills(lead);
      score += this.calculateSkillMatch(member.skills || [], skills) * 20;

      // Availability score (15%)
      if (member.availability_status === 'available') score += 15;
      else if (member.availability_status === 'busy') score += 5;

      // Historical success rate (10%)
      const successRate = await this.getHistoricalSuccessRate(member.id, lead);
      score += successRate * 10;

      return {
        member,
        score: Math.round(score)
      };
    }));

    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);
    return scores[0].member;
  }

  /**
   * Get historical success rate for a team member
   */
  private async getHistoricalSuccessRate(memberId: string, lead: LeadData): Promise<number> {
    const supabase = await this.getSupabase();

    // Get similar leads assigned to this member
    const { data: assignments } = await supabase
      .from('lead_assignments')
      .select('status')
      .eq('assigned_to', memberId)
      .in('status', ['completed', 'reassigned']);

    if (!assignments || assignments.length === 0) {
      return 0.5; // Default 50% if no history
    }

    const completed = assignments.filter(a => a.status === 'completed').length;
    return completed / assignments.length;
  }

  /**
   * Extract required skills from lead data
   */
  private extractRequiredSkills(lead: any): string[] {
    const skills: string[] = [];

    if (lead.businesses?.industry) {
      skills.push(lead.businesses.industry.toLowerCase());
    }

    if (lead.businesses?.employee_count > 500) {
      skills.push('enterprise');
    } else if (lead.businesses?.employee_count > 50) {
      skills.push('mid-market');
    } else {
      skills.push('smb');
    }

    if (lead.technology_score >= 80) {
      skills.push('technical');
    }

    return skills;
  }

  /**
   * Calculate skill match percentage
   */
  private calculateSkillMatch(memberSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 1;

    const matches = requiredSkills.filter(skill =>
      memberSkills.some(ms => ms.toLowerCase().includes(skill.toLowerCase()))
    ).length;

    return matches / requiredSkills.length;
  }

  /**
   * Get team members based on rule configuration
   */
  private async getTeamMembers(rule: LeadRoutingRule): Promise<TeamMember[]> {
    const supabase = await this.getSupabase();

    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        skills,
        territories
      `);

    // Filter based on assignment type
    if (rule.assignment_type === 'individual' && rule.assignment_target?.user_id) {
      query = query.eq('id', rule.assignment_target.user_id);
    } else if (rule.assignment_type === 'team' && rule.assignment_target?.team_ids) {
      // This would need a team membership table
      // For now, we'll get all sales reps
      query = query.in('role', ['sales_rep', 'account_executive', 'sales_manager']);
    }

    const { data: members } = await query;

    if (!members) return [];

    // Get current load for each member
    const memberData = await Promise.all(members.map(async (member) => {
      const { count } = await supabase
        .from('lead_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', member.id)
        .in('status', ['assigned', 'accepted', 'working']);

      // Get performance metrics
      const { data: completedAssignments } = await supabase
        .from('lead_assignments')
        .select('response_time_minutes')
        .eq('assigned_to', member.id)
        .eq('status', 'completed')
        .limit(10);

      let performanceScore = 70; // Default
      if (completedAssignments && completedAssignments.length > 0) {
        const avgResponseTime = completedAssignments.reduce((sum, a) =>
          sum + (a.response_time_minutes || 0), 0
        ) / completedAssignments.length;

        // Better response time = higher score
        if (avgResponseTime < 30) performanceScore = 95;
        else if (avgResponseTime < 60) performanceScore = 85;
        else if (avgResponseTime < 120) performanceScore = 75;
        else if (avgResponseTime < 240) performanceScore = 65;
        else performanceScore = 55;
      }

      return {
        id: member.id,
        name: member.full_name || member.email,
        email: member.email,
        current_load: count || 0,
        max_capacity: 50, // Default max capacity
        skills: member.skills || [],
        territories: member.territories || [],
        availability_status: count >= 50 ? 'unavailable' : count >= 40 ? 'busy' : 'available',
        performance_score: performanceScore
      } as TeamMember;
    }));

    return memberData;
  }

  /**
   * Calculate priority based on lead score
   */
  private calculatePriority(score: number): 'urgent' | 'high' | 'medium' | 'low' {
    if (score >= 85) return 'urgent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Define escalation path for the rule
   */
  private async defineEscalationPath(rule: LeadRoutingRule): Promise<string[]> {
    const supabase = await this.getSupabase();

    const path: string[] = [];

    // Get management hierarchy
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['sales_manager', 'sales_director', 'vp_sales'])
      .order('role');

    if (managers) {
      path.push(...managers.map(m => m.id));
    }

    // Add configured escalation target
    if (rule.escalation_target?.user_id) {
      path.push(rule.escalation_target.user_id);
    }

    return path;
  }

  /**
   * Create direct assignment
   */
  private createDirectAssignment(assigneeId: string, reason: string): RoutingDecision {
    return {
      assigned_to: assigneeId,
      routing_reason: reason,
      priority: 'medium',
      sla: 24,
      escalation_path: []
    };
  }

  /**
   * Fallback routing when no rules match
   */
  private async fallbackRouting(lead: LeadData): Promise<RoutingDecision> {
    const supabase = await this.getSupabase();

    // Get any available sales rep
    const { data: reps } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['sales_rep', 'account_executive'])
      .limit(5);

    if (!reps || reps.length === 0) {
      throw new Error('No sales representatives available');
    }

    // Simple round-robin
    const randomRep = reps[Math.floor(Math.random() * reps.length)];

    return {
      assigned_to: randomRep.id,
      routing_reason: `Fallback assignment to ${randomRep.full_name}`,
      priority: this.calculatePriority(lead.total_score || 0),
      sla: 48,
      escalation_path: []
    };
  }

  /**
   * Save assignment to database
   */
  private async saveAssignment(
    leadId: string,
    companyId: string,
    decision: RoutingDecision,
    ruleId?: string
  ): Promise<void> {
    const supabase = await this.getSupabase();

    const { data: { user } } = await supabase.auth.getUser();

    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + decision.sla);

    await supabase
      .from('lead_assignments')
      .insert({
        lead_id: leadId,
        company_id: companyId,
        assigned_to: decision.assigned_to,
        assigned_by: user?.id,
        routing_rule_id: ruleId,
        assignment_reason: decision.routing_reason,
        priority: decision.priority,
        sla_deadline: slaDeadline.toISOString(),
        status: 'assigned',
        routing_metadata: {
          escalation_path: decision.escalation_path,
          routing_timestamp: new Date().toISOString()
        }
      });

    // Send notification to assigned rep
    await this.sendAssignmentNotification(decision.assigned_to, leadId, decision.priority);
  }

  /**
   * Send notification for new assignment
   */
  private async sendAssignmentNotification(
    assigneeId: string,
    leadId: string,
    priority: string
  ): Promise<void> {
    const supabase = await this.getSupabase();

    await supabase
      .from('notifications')
      .insert({
        user_id: assigneeId,
        type: 'lead_assigned',
        title: `New ${priority} priority lead assigned`,
        message: `You have been assigned a new lead. Please review and take action.`,
        priority,
        data: { lead_id: leadId },
        read: false
      });
  }

  /**
   * Categorize company size
   */
  private categorizeCompanySize(employeeCount?: number): string {
    if (!employeeCount) return 'unknown';
    if (employeeCount > 1000) return 'enterprise';
    if (employeeCount > 100) return 'mid-market';
    if (employeeCount > 10) return 'smb';
    return 'startup';
  }

  /**
   * Categorize engagement level
   */
  private categorizeEngagementLevel(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 20) return 'low';
    return 'none';
  }

  /**
   * Map rule from database format
   */
  private mapRuleFromDatabase(data: Record<string, unknown>): LeadRoutingRule {
    return {
      id: data.id,
      org_id: data.org_id,
      name: data.name,
      description: data.description,
      priority: data.priority,
      is_active: data.is_active,
      conditions: data.conditions || {},
      routing_algorithm: data.routing_algorithm,
      assignment_type: data.assignment_type,
      assignment_target: data.assignment_target,
      sla_hours: data.sla_hours,
      escalation_hours: data.escalation_hours,
      escalation_target: data.escalation_target,
      settings: data.settings
    };
  }
}

// Export singleton instance
export const leadRoutingEngine = new LeadRoutingEngine();