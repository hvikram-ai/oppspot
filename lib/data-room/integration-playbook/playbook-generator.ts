/**
 * Integration Playbook Generator
 * Main orchestrator for AI-powered 100-day M&A integration plan generation
 */

import { LLMManager } from '@/lib/ai/llm-manager';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import { TechStackRepository } from '@/lib/data-room/repository/tech-stack-repository';
import { getTemplateByDealType } from './template-library';
import type {
  PlaybookGenerationContext,
  PlaybookGenerationResult,
  IntegrationPhase,
  IntegrationWorkstream,
  IntegrationActivity,
  IntegrationSynergy,
  IntegrationRisk,
  IntegrationKPI,
  CreatePlaybookRequest,
  GeneratePlaybookRequest,
} from '@/lib/data-room/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export class PlaybookGenerator {
  private llmManager: LLMManager;
  private repository: PlaybookRepository;
  private techStackRepo: TechStackRepository;

  constructor(supabase: SupabaseClient) {
    this.llmManager = new LLMManager();
    this.repository = new PlaybookRepository(supabase);
    this.techStackRepo = new TechStackRepository(supabase);
  }

  /**
   * Generate complete integration playbook
   */
  async generatePlaybook(
    playbookRequest: CreatePlaybookRequest,
    generateRequest: GeneratePlaybookRequest,
    userId: string
  ): Promise<PlaybookGenerationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Create playbook record
      const playbook = await this.repository.createPlaybook(playbookRequest, userId);

      // Update status to generating
      await this.repository.updateGenerationStatus(playbook.id, 'generating');

      // Step 2: Collect context
      const context = await this.collectContext(
        playbook.data_room_id,
        playbook.deal_type,
        generateRequest
      );

      // Step 3: Get template
      const template = getTemplateByDealType(playbook.deal_type);

      // Step 4: Generate components (parallel where possible)
      const [activities, synergies, risks] = await Promise.all([
        this.generateActivities(context, template),
        this.generateSynergies(context, template),
        this.generateRisks(context, template),
      ]);

      // Step 5: Create phases from template
      const phases = await this.repository.createPhases(
        template.phases.map((p, idx) => ({
          ...p,
          playbook_id: playbook.id,
          phase_name: p.phase_name!,
          phase_type: p.phase_type!,
          phase_order: idx + 1,
        }))
      );

      // Step 6: Create workstreams from template
      const workstreams = await this.repository.createWorkstreams(
        template.workstreams.map((w) => ({
          ...w,
          playbook_id: playbook.id,
          workstream_name: w.workstream_name!,
        }))
      );

      // Step 7: Map activities to phases/workstreams and create
      const mappedActivities = this.mapActivitiesToPhasesAndWorkstreams(
        activities,
        phases,
        workstreams,
        playbook.id
      );
      const createdActivities = await this.repository.createActivities(mappedActivities);

      // Step 8: Create Day 1 checklist
      const day1Checklist = await this.repository.createDay1ChecklistItems(
        template.day1_checklist.map((item) => ({
          ...item,
          playbook_id: playbook.id,
          checklist_item: item.checklist_item!,
          category: item.category!,
          is_critical: item.is_critical!,
          responsible_party: item.responsible_party!,
          status: 'pending',
        }))
      );

      // Step 9: Create synergies
      const createdSynergies = await this.repository.createSynergies(
        synergies.map((s) => ({ ...s, playbook_id: playbook.id }))
      );

      // Step 10: Create risks
      const createdRisks = await this.repository.createRisks(
        risks.map((r) => ({ ...r, playbook_id: playbook.id }))
      );

      // Step 11: Create KPIs
      const kpis = await this.repository.createKPIs(
        template.typical_kpis.map((kpi) => ({
          ...kpi,
          playbook_id: playbook.id,
          kpi_name: kpi.kpi_name!,
          kpi_category: kpi.kpi_category!,
        }))
      );

      // Step 12: Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(context, createdActivities.length);

      // Step 13: Update playbook with metadata
      const generationTime = Date.now() - startTime;
      await this.repository.updatePlaybookMetadata(playbook.id, {
        ai_model: 'anthropic/claude-3.5-sonnet',
        generation_time_ms: generationTime,
        confidence_score: confidenceScore,
      });

      // Step 14: Mark as completed
      await this.repository.updateGenerationStatus(playbook.id, 'completed');

      return {
        playbook,
        phases,
        workstreams,
        activities: createdActivities,
        day1_checklist: day1Checklist,
        synergies: createdSynergies,
        risks: createdRisks,
        kpis,
        generation_time_ms: generationTime,
        confidence_score: confidenceScore,
      };
    } catch (error) {
      console.error('Playbook generation error:', error);
      throw error;
    }
  }

  /**
   * Collect context from existing data
   */
  private async collectContext(
    dataRoomId: string,
    dealType: string,
    request: GeneratePlaybookRequest
  ): Promise<PlaybookGenerationContext> {
    const context: PlaybookGenerationContext = {
      data_room_id: dataRoomId,
      deal_info: {
        deal_type: dealType as any,
      },
    };

    // Collect tech stack findings if requested
    if (request.use_tech_stack_analysis) {
      try {
        const analyses = await this.techStackRepo.listAnalyses(dataRoomId);
        if (analyses.length > 0) {
          const latestAnalysis = analyses[0];
          const technologies = await this.techStackRepo.getTechnologies(latestAnalysis.id);
          const findings = await this.techStackRepo.getFindings(latestAnalysis.id);

          context.tech_stack_findings = {
            technologies,
            integration_complexity: latestAnalysis.integration_complexity,
            risks: findings,
          };
        }
      } catch (error) {
        console.error('Failed to collect tech stack context:', error);
      }
    }

    // Add user inputs
    if (request.custom_objectives) {
      context.user_inputs = {
        objectives: request.custom_objectives,
      };
    }

    return context;
  }

  /**
   * Generate activities using AI
   */
  private async generateActivities(
    context: PlaybookGenerationContext,
    template: any
  ): Promise<Omit<IntegrationActivity, 'id' | 'created_at' | 'updated_at'>[]> {
    const prompt = this.buildActivitiesPrompt(context, template);

    try {
      const response = await this.llmManager.generateText({
        messages: [{ role: 'user', content: prompt }],
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 4000,
        temperature: 0.3,
      });

      const parsed = JSON.parse(response.text);
      return parsed.activities || [];
    } catch (error) {
      console.error('Activity generation failed, using template fallback:', error);
      return this.generateTemplateActivities(template);
    }
  }

  /**
   * Build AI prompt for activity generation
   */
  private buildActivitiesPrompt(context: PlaybookGenerationContext, template: any): string {
    const techStackContext = context.tech_stack_findings
      ? `Tech Stack Analysis: ${context.tech_stack_findings.technologies.length} technologies found, integration complexity: ${context.tech_stack_findings.integration_complexity}`
      : '';

    return `Generate specific integration activities for a ${context.deal_info.deal_type} in the technology sector.

${techStackContext}

Generate 40-50 specific activities across these workstreams:
${template.workstreams.map((w: any) => `- ${w.workstream_name}`).join('\n')}

For each activity, provide:
- activity_name: Specific, actionable name
- description: 1-2 sentence description
- category: 'planning', 'execution', 'monitoring', 'communication', or 'approval'
- priority: 'critical', 'high', 'medium', or 'low'
- duration_days: Estimated days to complete
- deliverables: Array of specific deliverables
- responsible_party: 'buyer', 'seller', or 'joint'

Return ONLY valid JSON in this format:
{
  "activities": [
    {
      "activity_name": "Conduct IT infrastructure assessment",
      "description": "Assess target company IT infrastructure for integration planning",
      "category": "planning",
      "priority": "critical",
      "duration_days": 7,
      "deliverables": ["IT infrastructure report", "Integration recommendations"],
      "responsible_party": "buyer",
      "critical_path": false,
      "completion_percentage": 0,
      "status": "not_started"
    }
  ]
}`;
  }

  /**
   * Generate template-based activities (fallback)
   */
  private generateTemplateActivities(template: any): Omit<IntegrationActivity, 'id' | 'created_at' | 'updated_at'>[] {
    // Generate basic activities from template
    const activities: any[] = [];

    template.workstreams.forEach((ws: any) => {
      ws.key_deliverables?.forEach((deliverable: string, idx: number) => {
        activities.push({
          activity_name: deliverable,
          description: `Complete ${deliverable} for ${ws.workstream_name}`,
          category: 'execution',
          priority: 'medium',
          duration_days: 14,
          deliverables: [deliverable],
          responsible_party: 'buyer',
          critical_path: false,
          completion_percentage: 0,
          status: 'not_started',
        });
      });
    });

    return activities;
  }

  /**
   * Generate synergies
   */
  private async generateSynergies(
    context: PlaybookGenerationContext,
    template: any
  ): Promise<Omit<IntegrationSynergy, 'id' | 'created_at' | 'updated_at'>[]> {
    // Use template synergies with AI enhancement
    return template.typical_synergies.map((s: any) => ({
      ...s,
      year_1_target: this.estimateSynergyValue(s, context, 1),
      year_2_target: this.estimateSynergyValue(s, context, 2),
      year_3_target: this.estimateSynergyValue(s, context, 3),
      total_target: this.estimateSynergyValue(s, context, 1) +
        this.estimateSynergyValue(s, context, 2) +
        this.estimateSynergyValue(s, context, 3),
    }));
  }

  /**
   * Estimate synergy value (placeholder logic)
   */
  private estimateSynergyValue(synergy: any, context: PlaybookGenerationContext, year: number): number {
    // Simple estimation based on synergy type and year
    const baseValue = synergy.synergy_type === 'cost' ? 500000 : 1000000;
    const multiplier = year === 1 ? 0.3 : year === 2 ? 0.5 : 1.0;
    return baseValue * multiplier;
  }

  /**
   * Generate risks
   */
  private async generateRisks(
    context: PlaybookGenerationContext,
    template: any
  ): Promise<Omit<IntegrationRisk, 'id' | 'created_at' | 'updated_at' | 'risk_score'>[]> {
    const risks = [...template.typical_risks];

    // Add tech-specific risks if tech stack analysis exists
    if (context.tech_stack_findings) {
      const techRisks = context.tech_stack_findings.risks
        .filter((f: any) => f.finding_type === 'red_flag' || f.finding_type === 'risk')
        .map((finding: any) => ({
          risk_name: finding.title,
          risk_description: finding.description,
          risk_category: 'systems',
          impact: finding.severity === 'critical' ? 'critical' : 'high',
          probability: 'medium',
          status: 'open',
        }));

      risks.push(...techRisks.slice(0, 5));
    }

    return risks;
  }

  /**
   * Map activities to phases and workstreams
   */
  private mapActivitiesToPhasesAndWorkstreams(
    activities: any[],
    phases: IntegrationPhase[],
    workstreams: IntegrationWorkstream[],
    playbookId: string
  ): Omit<IntegrationActivity, 'id' | 'created_at' | 'updated_at'>[] {
    return activities.map((activity, idx) => {
      // Distribute activities across phases (roughly equal)
      const phaseIndex = Math.floor((idx / activities.length) * phases.length);
      const phase = phases[phaseIndex];

      // Assign to workstream based on activity name (simple heuristic)
      const workstream = this.matchWorkstream(activity.activity_name, workstreams);

      return {
        ...activity,
        playbook_id: playbookId,
        phase_id: phase?.id,
        workstream_id: workstream?.id,
      };
    });
  }

  /**
   * Match activity to workstream (simple keyword matching)
   */
  private matchWorkstream(activityName: string, workstreams: IntegrationWorkstream[]): IntegrationWorkstream | undefined {
    const name = activityName.toLowerCase();

    if (name.includes('it') || name.includes('system') || name.includes('tech')) {
      return workstreams.find((w) => w.workstream_name.includes('IT'));
    }
    if (name.includes('hr') || name.includes('employee') || name.includes('org')) {
      return workstreams.find((w) => w.workstream_name.includes('HR'));
    }
    if (name.includes('finance') || name.includes('accounting')) {
      return workstreams.find((w) => w.workstream_name.includes('Finance'));
    }
    if (name.includes('operation') || name.includes('product')) {
      return workstreams.find((w) => w.workstream_name.includes('Operations'));
    }
    if (name.includes('sales') || name.includes('customer') || name.includes('commercial')) {
      return workstreams.find((w) => w.workstream_name.includes('Commercial'));
    }

    // Default to first workstream
    return workstreams[0];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(context: PlaybookGenerationContext, activityCount: number): number {
    let score = 50; // Base score

    // Increase if tech stack analysis exists
    if (context.tech_stack_findings) {
      score += 20;
    }

    // Increase if deal hypotheses exist
    if (context.deal_hypotheses) {
      score += 15;
    }

    // Increase based on activity count
    if (activityCount >= 40) {
      score += 15;
    }

    return Math.min(score, 100);
  }
}
