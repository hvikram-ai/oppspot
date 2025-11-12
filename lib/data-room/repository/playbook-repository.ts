/**
 * Integration Playbook Repository
 * Database operations for integration playbooks and related entities
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type {
  IntegrationPlaybook,
  IntegrationPlaybookWithDetails,
  IntegrationPhase,
  IntegrationWorkstream,
  IntegrationActivity,
  IntegrationDay1ChecklistItem,
  IntegrationSynergy,
  IntegrationRisk,
  IntegrationKPI,
  CreatePlaybookRequest,
  UpdateActivityRequest,
  UpdateSynergyRequest,
  UpdateRiskRequest,
  PlaybookStatus,
  PlaybookGenerationStatus,
  ActivityStatus,
} from '@/lib/data-room/types';

export class PlaybookRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  // =====================================================
  // PLAYBOOK CRUD
  // =====================================================

  /**
   * Create a new integration playbook
   */
  async createPlaybook(
    request: CreatePlaybookRequest,
    userId: string
  ): Promise<IntegrationPlaybook> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .insert({
        data_room_id: request.data_room_id,
        created_by: userId,
        playbook_name: request.playbook_name,
        deal_type: request.deal_type,
        deal_rationale: request.deal_rationale,
        integration_objectives: request.integration_objectives,
        target_close_date: request.target_close_date,
        status: 'draft',
        generation_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create playbook: ${error.message}`);
    }

    return data as IntegrationPlaybook;
  }

  /**
   * Get a playbook by ID
   */
  async getPlaybook(playbookId: string): Promise<IntegrationPlaybook> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .select('*')
      .eq('id', playbookId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`Failed to get playbook: ${error.message}`);
    }

    return data as IntegrationPlaybook;
  }

  /**
   * Get playbook with all related data
   */
  async getPlaybookWithDetails(playbookId: string): Promise<IntegrationPlaybookWithDetails> {
    // Get main playbook
    const playbook = await this.getPlaybook(playbookId);

    // Get all related data in parallel
    const [phases, workstreams, activities, day1Checklist, synergies, risks, kpis, creator] =
      await Promise.all([
        this.getPhases(playbookId),
        this.getWorkstreams(playbookId),
        this.getActivities(playbookId),
        this.getDay1Checklist(playbookId),
        this.getSynergies(playbookId),
        this.getRisks(playbookId),
        this.getKPIs(playbookId),
        this.getCreatorInfo(playbook.created_by),
      ]);

    return {
      ...playbook,
      phases,
      workstreams,
      activities,
      day1_checklist: day1Checklist,
      synergies,
      risks,
      kpis,
      creator_name: creator?.name,
      creator_email: creator?.email,
    };
  }

  /**
   * List playbooks for a data room
   */
  async listPlaybooks(dataRoomId: string): Promise<IntegrationPlaybook[]> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .select('*')
      .eq('data_room_id', dataRoomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list playbooks: ${error.message}`);
    }

    return data as IntegrationPlaybook[];
  }

  /**
   * Update playbook status
   */
  async updatePlaybookStatus(
    playbookId: string,
    status: PlaybookStatus
  ): Promise<IntegrationPlaybook> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playbookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update playbook status: ${error.message}`);
    }

    return data as IntegrationPlaybook;
  }

  /**
   * Update generation status
   */
  async updateGenerationStatus(
    playbookId: string,
    generationStatus: PlaybookGenerationStatus,
    errorMessage?: string
  ): Promise<IntegrationPlaybook> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .update({
        generation_status: generationStatus,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playbookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update generation status: ${error.message}`);
    }

    return data as IntegrationPlaybook;
  }

  /**
   * Update playbook metadata after generation
   */
  async updatePlaybookMetadata(
    playbookId: string,
    metadata: {
      ai_model?: string;
      generation_time_ms?: number;
      confidence_score?: number;
    }
  ): Promise<IntegrationPlaybook> {
    const { data, error } = await this.supabase
      .from('integration_playbooks')
      .update({
        ...metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playbookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update playbook metadata: ${error.message}`);
    }

    return data as IntegrationPlaybook;
  }

  /**
   * Soft delete a playbook
   */
  async deletePlaybook(playbookId: string): Promise<void> {
    const { error } = await this.supabase
      .from('integration_playbooks')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', playbookId);

    if (error) {
      throw new Error(`Failed to delete playbook: ${error.message}`);
    }
  }

  // =====================================================
  // PHASES
  // =====================================================

  /**
   * Create phases for a playbook
   */
  async createPhases(
    phases: Omit<IntegrationPhase, 'id' | 'created_at' | 'total_activities' | 'completed_activities' | 'status'>[]
  ): Promise<IntegrationPhase[]> {
    const { data, error } = await this.supabase
      .from('integration_phases')
      .insert(phases)
      .select();

    if (error) {
      throw new Error(`Failed to create phases: ${error.message}`);
    }

    return data as IntegrationPhase[];
  }

  /**
   * Get phases for a playbook
   */
  async getPhases(playbookId: string): Promise<IntegrationPhase[]> {
    const { data, error } = await this.supabase
      .from('integration_phases')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('phase_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get phases: ${error.message}`);
    }

    return data as IntegrationPhase[];
  }

  // =====================================================
  // WORKSTREAMS
  // =====================================================

  /**
   * Create workstreams for a playbook
   */
  async createWorkstreams(
    workstreams: Omit<IntegrationWorkstream, 'id' | 'created_at' | 'total_activities' | 'completed_activities' | 'status'>[]
  ): Promise<IntegrationWorkstream[]> {
    const { data, error } = await this.supabase
      .from('integration_workstreams')
      .insert(workstreams)
      .select();

    if (error) {
      throw new Error(`Failed to create workstreams: ${error.message}`);
    }

    return data as IntegrationWorkstream[];
  }

  /**
   * Get workstreams for a playbook
   */
  async getWorkstreams(playbookId: string): Promise<IntegrationWorkstream[]> {
    const { data, error } = await this.supabase
      .from('integration_workstreams')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('workstream_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to get workstreams: ${error.message}`);
    }

    return data as IntegrationWorkstream[];
  }

  // =====================================================
  // ACTIVITIES
  // =====================================================

  /**
   * Create activities for a playbook
   */
  async createActivities(
    activities: Omit<IntegrationActivity, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<IntegrationActivity[]> {
    const { data, error } = await this.supabase
      .from('integration_activities')
      .insert(activities)
      .select();

    if (error) {
      throw new Error(`Failed to create activities: ${error.message}`);
    }

    return data as IntegrationActivity[];
  }

  /**
   * Get activities for a playbook
   */
  async getActivities(playbookId: string, filters?: {
    phase_id?: string;
    workstream_id?: string;
    status?: ActivityStatus;
  }): Promise<IntegrationActivity[]> {
    let query = this.supabase
      .from('integration_activities')
      .select('*')
      .eq('playbook_id', playbookId);

    if (filters?.phase_id) {
      query = query.eq('phase_id', filters.phase_id);
    }
    if (filters?.workstream_id) {
      query = query.eq('workstream_id', filters.workstream_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('target_start_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get activities: ${error.message}`);
    }

    return data as IntegrationActivity[];
  }

  /**
   * Get a single activity
   */
  async getActivity(activityId: string): Promise<IntegrationActivity> {
    const { data, error } = await this.supabase
      .from('integration_activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (error) {
      throw new Error(`Failed to get activity: ${error.message}`);
    }

    return data as IntegrationActivity;
  }

  /**
   * Update an activity
   */
  async updateActivity(
    activityId: string,
    updates: UpdateActivityRequest
  ): Promise<IntegrationActivity> {
    const { data, error } = await this.supabase
      .from('integration_activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    return data as IntegrationActivity;
  }

  /**
   * Mark activity as complete
   */
  async completeActivity(activityId: string): Promise<IntegrationActivity> {
    return this.updateActivity(activityId, {
      status: 'completed',
      completion_percentage: 100,
      actual_end_date: new Date().toISOString().split('T')[0],
    });
  }

  // =====================================================
  // DAY 1 CHECKLIST
  // =====================================================

  /**
   * Create Day 1 checklist items
   */
  async createDay1ChecklistItems(
    items: Omit<IntegrationDay1ChecklistItem, 'id' | 'created_at'>[]
  ): Promise<IntegrationDay1ChecklistItem[]> {
    const { data, error } = await this.supabase
      .from('integration_day1_checklist')
      .insert(items)
      .select();

    if (error) {
      throw new Error(`Failed to create Day 1 checklist: ${error.message}`);
    }

    return data as IntegrationDay1ChecklistItem[];
  }

  /**
   * Get Day 1 checklist for a playbook
   */
  async getDay1Checklist(playbookId: string): Promise<IntegrationDay1ChecklistItem[]> {
    const { data, error } = await this.supabase
      .from('integration_day1_checklist')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('item_order', { ascending: true, nullsFirst: false })
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to get Day 1 checklist: ${error.message}`);
    }

    return data as IntegrationDay1ChecklistItem[];
  }

  /**
   * Mark checklist item as complete
   */
  async completeChecklistItem(
    itemId: string,
    userId: string
  ): Promise<IntegrationDay1ChecklistItem> {
    const { data, error } = await this.supabase
      .from('integration_day1_checklist')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete checklist item: ${error.message}`);
    }

    return data as IntegrationDay1ChecklistItem;
  }

  // =====================================================
  // SYNERGIES
  // =====================================================

  /**
   * Create synergies for a playbook
   */
  async createSynergies(
    synergies: Omit<IntegrationSynergy, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<IntegrationSynergy[]> {
    const { data, error } = await this.supabase
      .from('integration_synergies')
      .insert(synergies)
      .select();

    if (error) {
      throw new Error(`Failed to create synergies: ${error.message}`);
    }

    return data as IntegrationSynergy[];
  }

  /**
   * Get synergies for a playbook
   */
  async getSynergies(playbookId: string, filters?: {
    synergy_type?: 'cost' | 'revenue';
    status?: string;
  }): Promise<IntegrationSynergy[]> {
    let query = this.supabase
      .from('integration_synergies')
      .select('*')
      .eq('playbook_id', playbookId);

    if (filters?.synergy_type) {
      query = query.eq('synergy_type', filters.synergy_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('total_target', { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get synergies: ${error.message}`);
    }

    return data as IntegrationSynergy[];
  }

  /**
   * Update a synergy
   */
  async updateSynergy(
    synergyId: string,
    updates: UpdateSynergyRequest
  ): Promise<IntegrationSynergy> {
    const { data, error } = await this.supabase
      .from('integration_synergies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', synergyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update synergy: ${error.message}`);
    }

    return data as IntegrationSynergy;
  }

  // =====================================================
  // RISKS
  // =====================================================

  /**
   * Create risks for a playbook
   */
  async createRisks(
    risks: Omit<IntegrationRisk, 'id' | 'created_at' | 'updated_at' | 'risk_score'>[]
  ): Promise<IntegrationRisk[]> {
    const { data, error } = await this.supabase
      .from('integration_risks')
      .insert(risks)
      .select();

    if (error) {
      throw new Error(`Failed to create risks: ${error.message}`);
    }

    return data as IntegrationRisk[];
  }

  /**
   * Get risks for a playbook
   */
  async getRisks(playbookId: string, filters?: {
    status?: string;
    impact?: string;
  }): Promise<IntegrationRisk[]> {
    let query = this.supabase
      .from('integration_risks')
      .select('*')
      .eq('playbook_id', playbookId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.impact) {
      query = query.eq('impact', filters.impact);
    }

    query = query.order('risk_score', { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get risks: ${error.message}`);
    }

    return data as IntegrationRisk[];
  }

  /**
   * Update a risk
   */
  async updateRisk(riskId: string, updates: UpdateRiskRequest): Promise<IntegrationRisk> {
    const { data, error } = await this.supabase
      .from('integration_risks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', riskId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update risk: ${error.message}`);
    }

    return data as IntegrationRisk[];
  }

  // =====================================================
  // KPIs
  // =====================================================

  /**
   * Create KPIs for a playbook
   */
  async createKPIs(
    kpis: Omit<IntegrationKPI, 'id' | 'created_at' | 'updated_at' | 'variance_percentage' | 'status'>[]
  ): Promise<IntegrationKPI[]> {
    const { data, error } = await this.supabase
      .from('integration_kpis')
      .insert(kpis)
      .select();

    if (error) {
      throw new Error(`Failed to create KPIs: ${error.message}`);
    }

    return data as IntegrationKPI[];
  }

  /**
   * Get KPIs for a playbook
   */
  async getKPIs(playbookId: string): Promise<IntegrationKPI[]> {
    const { data, error } = await this.supabase
      .from('integration_kpis')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('kpi_category', { ascending: true });

    if (error) {
      throw new Error(`Failed to get KPIs: ${error.message}`);
    }

    return data as IntegrationKPI[];
  }

  /**
   * Update KPI measurement
   */
  async updateKPI(
    kpiId: string,
    currentValue: number,
    measurementDate?: string
  ): Promise<IntegrationKPI> {
    const { data, error } = await this.supabase
      .from('integration_kpis')
      .update({
        current_value: currentValue,
        last_measured_date: measurementDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', kpiId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update KPI: ${error.message}`);
    }

    return data as IntegrationKPI;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get creator information
   */
  private async getCreatorInfo(userId: string): Promise<{ name: string; email: string } | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      name: data.full_name || 'Unknown',
      email: data.email || '',
    };
  }

  /**
   * Get playbook progress summary
   */
  async getPlaybookProgress(playbookId: string): Promise<{
    total_activities: number;
    completed_activities: number;
    in_progress_activities: number;
    blocked_activities: number;
    completion_percentage: number;
    phases_summary: {
      phase_name: string;
      total: number;
      completed: number;
      percentage: number;
    }[];
  }> {
    const playbook = await this.getPlaybook(playbookId);
    const activities = await this.getActivities(playbookId);
    const phases = await this.getPhases(playbookId);

    const completionPercentage =
      playbook.total_activities > 0
        ? Math.round((playbook.completed_activities / playbook.total_activities) * 100)
        : 0;

    const phasesSummary = phases.map((phase) => {
      const phaseActivities = activities.filter((a) => a.phase_id === phase.id);
      const completed = phaseActivities.filter((a) => a.status === 'completed').length;
      const percentage = phaseActivities.length > 0
        ? Math.round((completed / phaseActivities.length) * 100)
        : 0;

      return {
        phase_name: phase.phase_name,
        total: phaseActivities.length,
        completed,
        percentage,
      };
    });

    return {
      total_activities: playbook.total_activities,
      completed_activities: playbook.completed_activities,
      in_progress_activities: activities.filter((a) => a.status === 'in_progress').length,
      blocked_activities: activities.filter((a) => a.status === 'blocked').length,
      completion_percentage: completionPercentage,
      phases_summary: phasesSummary,
    };
  }

  /**
   * Get synergy realization summary
   */
  async getSynergySummary(playbookId: string): Promise<{
    total_target: number;
    total_actual: number;
    realization_percentage: number;
    cost_synergies: { target: number; actual: number };
    revenue_synergies: { target: number; actual: number };
  }> {
    const synergies = await this.getSynergies(playbookId);

    const costSynergies = synergies.filter((s) => s.synergy_type === 'cost');
    const revenueSynergies = synergies.filter((s) => s.synergy_type === 'revenue');

    const totalTarget = synergies.reduce((sum, s) => sum + (s.total_target || 0), 0);
    const totalActual = synergies.reduce((sum, s) => sum + s.total_actual, 0);
    const realizationPercentage =
      totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

    return {
      total_target: totalTarget,
      total_actual: totalActual,
      realization_percentage: realizationPercentage,
      cost_synergies: {
        target: costSynergies.reduce((sum, s) => sum + (s.total_target || 0), 0),
        actual: costSynergies.reduce((sum, s) => sum + s.total_actual, 0),
      },
      revenue_synergies: {
        target: revenueSynergies.reduce((sum, s) => sum + (s.total_target || 0), 0),
        actual: revenueSynergies.reduce((sum, s) => sum + s.total_actual, 0),
      },
    };
  }

  /**
   * Get risk summary
   */
  async getRiskSummary(playbookId: string): Promise<{
    total_risks: number;
    open_risks: number;
    critical_risks: number;
    high_risks: number;
    by_category: Record<string, number>;
  }> {
    const risks = await this.getRisks(playbookId);

    const openRisks = risks.filter((r) => r.status === 'open');
    const byCategoryMap = risks.reduce(
      (acc, risk) => {
        acc[risk.risk_category] = (acc[risk.risk_category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total_risks: risks.length,
      open_risks: openRisks.length,
      critical_risks: openRisks.filter((r) => r.impact === 'critical').length,
      high_risks: openRisks.filter((r) => r.impact === 'high').length,
      by_category: byCategoryMap,
    };
  }
}
