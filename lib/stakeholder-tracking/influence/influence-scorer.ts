import { createClient } from '@/lib/supabase/server';
import type {
  Stakeholder,
  InfluenceScores,
  StakeholderRelationship,
  StakeholderEngagement,
  ChampionTracking,
  CalculateInfluenceRequest,
  CalculateInfluenceResponse
} from '../types/stakeholder';

// Extended type for stakeholder with joined relationships
interface StakeholderWithRelations extends Stakeholder {
  influence_scores?: InfluenceScores[];
  stakeholder_relationships?: StakeholderRelationship[];
  stakeholder_engagement?: StakeholderEngagement[];
  champion_tracking?: ChampionTracking[];
}

// Extended types for database operations
interface InfluenceScoresWithId extends InfluenceScores {
  id: string;
  last_calculated: string;
}

interface StakeholderUpdate {
  influence_level: number;
  updated_at: string;
}

export class InfluenceScorer {
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
   * Calculate comprehensive influence scores for a stakeholder
   */
  async calculateInfluence(
    request: CalculateInfluenceRequest
  ): Promise<CalculateInfluenceResponse> {
    try {
      const supabase = await this.getSupabase();

      // Get stakeholder data
      const { data: stakeholder, error } = await supabase
        .from('stakeholders')
        .select(`
          *,
          influence_scores!left(*),
          stakeholder_relationships!stakeholder_id(*),
          stakeholder_engagement!left(*)
        `)
        .eq('id', request.stakeholder_id)
        .single() as { data: StakeholderWithRelations | null, error: Error | null };

      if (error || !stakeholder) {
        console.error('Error fetching stakeholder:', error);
        return {
          success: false,
          influence_scores: {} as InfluenceScores
        };
      }

      // Check if we should recalculate or use existing
      const existing = stakeholder.influence_scores?.[0] as InfluenceScoresWithId | undefined;
      if (existing && !request.recalculate) {
        const hoursSinceCalculation =
          (Date.now() - new Date(existing.last_calculated).getTime()) / (1000 * 60 * 60);

        if (hoursSinceCalculation < 24) {
          // Use cached scores if less than 24 hours old
          const response: CalculateInfluenceResponse = {
            success: true,
            influence_scores: existing as unknown as InfluenceScores
          };

          if (request.include_network) {
            response.network_analysis = await this.analyzeNetwork(request.stakeholder_id);
          }

          return response;
        }
      }

      // Calculate individual influence dimensions
      const hierarchicalInfluence = await this.calculateHierarchicalInfluence(stakeholder);
      const socialInfluence = await this.calculateSocialInfluence(stakeholder);
      const technicalInfluence = await this.calculateTechnicalInfluence(stakeholder);
      const politicalInfluence = await this.calculatePoliticalInfluence(stakeholder);

      // Calculate composite score with weighted average
      const overallInfluence = Math.round(
        hierarchicalInfluence * 0.3 +
        socialInfluence * 0.25 +
        technicalInfluence * 0.2 +
        politicalInfluence * 0.25
      );

      // Calculate decision weight (0-1 scale)
      const decisionWeight = this.calculateDecisionWeight(
        overallInfluence,
        stakeholder.decision_authority as boolean | undefined,
        stakeholder.budget_authority as boolean | undefined
      );

      // Network metrics
      const networkMetrics = await this.calculateNetworkMetrics(stakeholder);

      // Behavioral indicators
      const behavioralIndicators = this.analyzeBehavioralIndicators(stakeholder);

      // Prepare influence scores
      const influenceScores: Partial<InfluenceScores> = {
        stakeholder_id: request.stakeholder_id,
        org_id: stakeholder.org_id as string,
        hierarchical_influence: hierarchicalInfluence,
        social_influence: socialInfluence,
        technical_influence: technicalInfluence,
        political_influence: politicalInfluence,
        overall_influence: overallInfluence,
        decision_weight: decisionWeight,
        network_centrality: networkMetrics.centrality,
        connection_count: networkMetrics.connectionCount,
        influence_reach: networkMetrics.reach,
        opinion_leader: behavioralIndicators.opinionLeader,
        early_adopter: behavioralIndicators.earlyAdopter,
        change_agent: behavioralIndicators.changeAgent,
        calculation_method: 'multi_dimensional_v1',
        confidence_score: this.calculateConfidenceScore(stakeholder),
        last_calculated: new Date().toISOString()
      };

      // Save or update influence scores
      let savedScores: InfluenceScores;
      if (existing) {
        const { data, error: updateError } = await supabase
          .from('influence_scores')
          .update(influenceScores)
          .eq('id', existing.id)
          .select()
          .single() as { data: InfluenceScores | null, error: Error | null };

        if (updateError || !data) {
          console.error('Error updating influence scores:', updateError);
          return {
            success: false,
            influence_scores: {} as InfluenceScores
          };
        }
        savedScores = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('influence_scores')
          .insert(influenceScores)
          .select()
          .single() as { data: InfluenceScores | null, error: Error | null };

        if (insertError || !data) {
          console.error('Error inserting influence scores:', insertError);
          return {
            success: false,
            influence_scores: {} as InfluenceScores
          };
        }
        savedScores = data;
      }

      // Update stakeholder influence level
      await supabase
        .from('stakeholders')
        .update({
          influence_level: Math.ceil(overallInfluence / 10),
          updated_at: new Date().toISOString()
        } as StakeholderUpdate)
        .eq('id', request.stakeholder_id);

      // Prepare response
      const response: CalculateInfluenceResponse = {
        success: true,
        influence_scores: savedScores
      };

      // Include network analysis if requested
      if (request.include_network) {
        response.network_analysis = await this.analyzeNetwork(request.stakeholder_id);
      }

      return response;

    } catch (error) {
      console.error('Influence calculation error:', error);
      return {
        success: false,
        influence_scores: {} as InfluenceScores
      };
    }
  }

  /**
   * Calculate hierarchical influence based on position and authority
   */
  private async calculateHierarchicalInfluence(stakeholder: StakeholderWithRelations): Promise<number> {
    let score = 0;

    // Title-based scoring
    const title = (stakeholder.title || '').toLowerCase();
    const executiveTitles = ['ceo', 'cto', 'cfo', 'coo', 'president', 'vp', 'vice president'];
    const directorTitles = ['director', 'head of', 'senior director'];
    const managerTitles = ['manager', 'lead', 'supervisor'];

    if (executiveTitles.some(t => title.includes(t))) {
      score = 90;
    } else if (directorTitles.some(t => title.includes(t))) {
      score = 70;
    } else if (managerTitles.some(t => title.includes(t))) {
      score = 50;
    } else if (title.includes('senior') || title.includes('principal')) {
      score = 40;
    } else {
      score = 20;
    }

    // Authority modifiers
    if (stakeholder.decision_authority as boolean) score += 10;
    if (stakeholder.budget_authority as boolean) score += 10;

    // Department influence
    const department = (stakeholder.department || '').toLowerCase();
    const keyDepartments = ['executive', 'leadership', 'strategy', 'finance'];
    if (keyDepartments.some(d => department.includes(d))) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate social influence based on relationships and network
   */
  private async calculateSocialInfluence(stakeholder: StakeholderWithRelations): Promise<number> {
    const relationships = stakeholder.stakeholder_relationships || [];
    const engagements = stakeholder.stakeholder_engagement || [];

    let score = 20; // Base score

    // Connection quantity
    const connectionCount = relationships.length;
    if (connectionCount > 20) {
      score += 30;
    } else if (connectionCount > 10) {
      score += 20;
    } else if (connectionCount > 5) {
      score += 10;
    }

    // Connection quality (based on relationship types)
    const strongRelationships = relationships.filter((r: StakeholderRelationship) =>
      ((r.strength || 0) as number) >= 7 || ['mentor', 'sponsor', 'ally'].includes((r.relationship_type || '') as string)
    );
    score += Math.min(20, strongRelationships.length * 5);

    // Engagement frequency and reach
    const uniqueParticipants = new Set();
    engagements.forEach((e: { participants?: Array<{ id: string }> }) => {
      if (e.participants) {
        e.participants.forEach((p: { id: string }) => uniqueParticipants.add(p.id));
      }
    });
    score += Math.min(20, uniqueParticipants.size * 2);

    // Referral and advocacy behaviors
    if (stakeholder.champion_tracking?.[0]) {
      const tracking = stakeholder.champion_tracking[0] as { referrals_made?: number; internal_advocates?: number };
      score += Math.min(10, (tracking.referrals_made || 0) * 5);
      score += Math.min(10, (tracking.internal_advocates || 0) * 3);
    }

    return Math.min(100, score);
  }

  /**
   * Calculate technical influence based on expertise and domain knowledge
   */
  private async calculateTechnicalInfluence(stakeholder: StakeholderWithRelations): Promise<number> {
    let score = 30; // Base score

    const title = (stakeholder.title || '').toLowerCase();
    const department = (stakeholder.department || '').toLowerCase();

    // Technical titles
    const technicalTitles = [
      'architect', 'engineer', 'technical', 'developer',
      'scientist', 'analyst', 'specialist', 'expert'
    ];

    if (technicalTitles.some(t => title.includes(t))) {
      score += 30;

      if (title.includes('senior') || title.includes('principal') || title.includes('chief')) {
        score += 20;
      } else if (title.includes('lead') || title.includes('head')) {
        score += 15;
      }
    }

    // Technical departments
    const technicalDepartments = [
      'technology', 'engineering', 'it', 'development',
      'architecture', 'innovation', 'r&d', 'research'
    ];

    if (technicalDepartments.some(d => department.includes(d))) {
      score += 20;
    }

    // End user role indicates hands-on technical involvement
    if ((stakeholder.role_type as string) === 'end_user') {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate political influence based on organizational dynamics
   */
  private async calculatePoliticalInfluence(stakeholder: StakeholderWithRelations): Promise<number> {
    let score = 20; // Base score

    // Role-based political influence
    const roleInfluence: Record<string, number> = {
      'decision_maker': 40,
      'influencer': 35,
      'gatekeeper': 30,
      'champion': 25,
      'detractor': 20,
      'neutral': 10,
      'end_user': 5
    };

    score += roleInfluence[(stakeholder.role_type as string)] || 10;

    // Relationship strength as political capital
    const relationships = stakeholder.stakeholder_relationships || [];
    const strongAlliances = relationships.filter((r: StakeholderRelationship) =>
      ['ally', 'sponsor', 'mentor'].includes((r.relationship_type || '') as string) && ((r.strength || 0) as number) >= 7
    );
    score += Math.min(20, strongAlliances.length * 10);

    // Gatekeeper role has additional political influence
    if ((stakeholder.role_type as string) === 'gatekeeper') {
      score += 15;
    }

    // Champion status indicates political capital
    if ((stakeholder.champion_status as string) === 'active' || (stakeholder.champion_status as string) === 'super') {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate decision weight based on overall influence and authority
   */
  private calculateDecisionWeight(
    overallInfluence: number,
    decisionAuthority?: boolean,
    budgetAuthority?: boolean
  ): number {
    let weight = overallInfluence / 100;

    // Authority multipliers
    if (decisionAuthority) weight *= 1.3;
    if (budgetAuthority) weight *= 1.2;

    return Math.min(1, weight);
  }

  /**
   * Calculate network metrics
   */
  private async calculateNetworkMetrics(stakeholder: StakeholderWithRelations): Promise<{
    centrality: number;
    connectionCount: number;
    reach: string;
  }> {
    const relationships = stakeholder.stakeholder_relationships || [];
    const connectionCount = relationships.length;

    // Calculate network centrality (simplified)
    let centrality = 0;
    if (connectionCount > 0) {
      const avgStrength = relationships.reduce((sum: number, r: StakeholderRelationship) =>
        sum + (r.strength || 0), 0) / connectionCount;
      centrality = (connectionCount / 50) * (avgStrength / 10);
      centrality = Math.min(1, centrality);
    }

    // Determine influence reach
    let reach: string;
    if (connectionCount > 20) {
      reach = 'company_wide';
    } else if (connectionCount > 15) {
      reach = 'division';
    } else if (connectionCount > 10) {
      reach = 'department';
    } else if (connectionCount > 5) {
      reach = 'team';
    } else {
      reach = 'individual';
    }

    return {
      centrality: Math.round(centrality * 100) / 100,
      connectionCount,
      reach
    };
  }

  /**
   * Analyze behavioral indicators
   */
  private analyzeBehavioralIndicators(stakeholder: StakeholderWithRelations): {
    opinionLeader: boolean;
    earlyAdopter: boolean;
    changeAgent: boolean;
  } {
    const engagements = stakeholder.stakeholder_engagement || [];
    const relationships = stakeholder.stakeholder_relationships || [];

    // Opinion leader: high social influence and active engagement
    const opinionLeader =
      relationships.length > 10 &&
      engagements.length > 5 &&
      ((stakeholder.influence_level || 0) as number) >= 6;

    // Early adopter: positive engagement and champion potential
    const earlyAdopter =
      (stakeholder.champion_status as string) === 'active' ||
      (stakeholder.champion_status as string) === 'developing' ||
      (engagements.filter((e: { outcome?: string }) => (e.outcome as string) === 'positive').length > 3);

    // Change agent: combination of influence and positive action
    const changeAgent =
      (stakeholder.role_type as string) === 'champion' ||
      (stakeholder.role_type as string) === 'influencer' ||
      (((stakeholder.influence_level || 0) as number) >= 7 && (stakeholder.decision_authority as boolean));

    return {
      opinionLeader,
      earlyAdopter,
      changeAgent
    };
  }

  /**
   * Calculate confidence score for the influence calculation
   */
  private calculateConfidenceScore(stakeholder: StakeholderWithRelations): number {
    let dataPoints = 0;
    const maxPoints = 10;

    // Check data completeness
    if (stakeholder.title) dataPoints++;
    if (stakeholder.department) dataPoints++;
    if (stakeholder.role_type) dataPoints++;
    if (stakeholder.influence_level) dataPoints++;
    if (stakeholder.engagement_score) dataPoints++;
    if (stakeholder.stakeholder_relationships?.length > 0) dataPoints += 2;
    if (stakeholder.stakeholder_engagement?.length > 0) dataPoints += 2;
    if (stakeholder.champion_tracking?.length > 0) dataPoints++;

    return dataPoints / maxPoints;
  }

  /**
   * Analyze stakeholder network
   */
  private async analyzeNetwork(stakeholder_id: string): Promise<{
    connections: StakeholderRelationship[];
    centrality_score: number;
    influence_map: Record<string, number>;
  }> {
    try {
      const supabase = await this.getSupabase();

      // Get all relationships
      const { data: relationships } = await supabase
        .from('stakeholder_relationships')
        .select(`
          *,
          related_stakeholder:stakeholders!stakeholder_relationships_related_stakeholder_id_fkey(
            id,
            name,
            influence_level
          )
        `)
        .eq('stakeholder_id', stakeholder_id) as { data: (StakeholderRelationship & { related_stakeholder?: Stakeholder })[] | null };

      const connections = relationships || [];

      // Calculate centrality score (simplified PageRank-like approach)
      const centralityScore = connections.length > 0
        ? Math.min(1, connections.length / 20)
        : 0;

      // Create influence map
      const influenceMap: Record<string, number> = {};
      connections.forEach((conn: StakeholderRelationship & { related_stakeholder?: Stakeholder }) => {
        if (conn.related_stakeholder) {
          const influence = ((conn.related_stakeholder.influence_level || 0) as number) * 10;
          const strength = (conn.strength || 5) as number;
          influenceMap[(conn.related_stakeholder.id as string)] = (influence * strength) / 100;
        }
      });

      return {
        connections: connections as StakeholderRelationship[],
        centrality_score: centralityScore,
        influence_map: influenceMap
      };

    } catch (error) {
      console.error('Network analysis error:', error);
      return {
        connections: [],
        centrality_score: 0,
        influence_map: {}
      };
    }
  }

  /**
   * Identify influence clusters
   */
  async identifyInfluenceClusters(
    company_id?: string,
    org_id?: string
  ): Promise<Array<{
    cluster_name: string;
    members: Stakeholder[];
    total_influence: number;
    key_connector?: Stakeholder;
  }>> {
    try {
      const supabase = await this.getSupabase();

      // Build query
      let query = supabase
        .from('stakeholders')
        .select(`
          *,
          influence_scores!left(*),
          stakeholder_relationships!stakeholder_id(*)
        `);

      if (company_id) {
        query = query.eq('company_id', company_id);
      }

      if (org_id) {
        query = query.eq('org_id', org_id);
      }

      const { data: stakeholders } = await query as { data: StakeholderWithRelations[] | null };

      const stakeholdersList = stakeholders || [];

      if (stakeholdersList.length === 0) {
        return [];
      }

      // Group by department as a simple clustering approach
      const clusters = new Map<string, StakeholderWithRelations[]>();

      stakeholdersList.forEach((stakeholder: StakeholderWithRelations) => {
        const dept = (stakeholder.department as string) || 'Unknown';
        if (!clusters.has(dept)) {
          clusters.set(dept, []);
        }
        clusters.get(dept)!.push(stakeholder);
      });

      // Analyze each cluster
      const analyzedClusters = Array.from(clusters.entries()).map(([dept, members]) => {
        // Calculate total influence
        const totalInfluence = members.reduce((sum, member) => {
          const influenceScore = member.influence_scores?.[0] as { overall_influence?: number } | undefined;
          const influence = influenceScore?.overall_influence || 0;
          return sum + influence;
        }, 0);

        // Find key connector (highest influence + most connections)
        const keyConnector = members.reduce((key: StakeholderWithRelations | null, member) => {
          const memberInfluence = member.influence_scores?.[0] as { overall_influence?: number } | undefined;
          const memberScore =
            (memberInfluence?.overall_influence || 0) +
            (member.stakeholder_relationships?.length || 0) * 5;

          const keyInfluence = key?.influence_scores?.[0] as { overall_influence?: number } | undefined;
          const keyScore = key
            ? (keyInfluence?.overall_influence || 0) +
              (key.stakeholder_relationships?.length || 0) * 5
            : 0;

          return memberScore > keyScore ? member : key;
        }, null);

        return {
          cluster_name: dept,
          members: members as Stakeholder[],
          total_influence: totalInfluence,
          key_connector: keyConnector as Stakeholder | undefined
        };
      });

      // Sort by total influence
      analyzedClusters.sort((a, b) => (b.total_influence as number) - (a.total_influence as number));

      return analyzedClusters;

    } catch (error) {
      console.error('Influence cluster identification error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const influenceScorer = new InfluenceScorer();