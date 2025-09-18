import { createClient } from '@/lib/supabase/server';
import type {
  MEDDICQualification,
  CalculateMEDDICRequest,
  KPI,
  SuccessCriteria,
  ROIModel,
  Requirement,
  DecisionStage,
  Stakeholder,
  DetailedPainPoint,
  ChampionProfile
} from '../types/qualification';

export class MEDDICFramework {
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
   * Calculate MEDDIC qualification score for a lead
   */
  async calculateMEDDIC(request: CalculateMEDDICRequest): Promise<MEDDICQualification | null> {
    try {
      const supabase = await this.getSupabase();

      // Get existing qualification or create new
      let qualification: MEDDICQualification;

      const { data: existing } = await supabase
        .from('meddic_qualifications')
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
      qualification.metrics.score = this.calculateMetricsScore(qualification.metrics);
      qualification.economic_buyer.score = this.calculateEconomicBuyerScore(qualification.economic_buyer);
      qualification.decision_criteria.score = this.calculateDecisionCriteriaScore(qualification.decision_criteria);
      qualification.decision_process.score = this.calculateDecisionProcessScore(qualification.decision_process);
      qualification.identify_pain.score = this.calculateIdentifyPainScore(qualification.identify_pain);
      qualification.champion.score = this.calculateChampionScore(qualification.champion);

      // Calculate overall score and confidence
      qualification.overall_score = this.calculateOverallScore(qualification);
      qualification.qualification_confidence = this.calculateConfidence(qualification);
      qualification.forecast_category = this.determineForecastCategory(qualification);

      // Save to database
      const saved = await this.saveQualification(qualification);

      return saved;

    } catch (error) {
      console.error('MEDDIC calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate Metrics score (0-100)
   */
  private calculateMetricsScore(metrics: MEDDICQualification['metrics']): number {
    let score = 0;

    // KPIs identified (30 points)
    const kpiCount = metrics.kpis_identified.length;
    score += Math.min(30, kpiCount * 10);

    // KPIs with targets (15 points)
    const kpisWithTargets = metrics.kpis_identified.filter(kpi =>
      kpi.target_value !== undefined && kpi.current_value !== undefined
    ).length;
    score += Math.min(15, kpisWithTargets * 5);

    // Success criteria defined (20 points)
    const criteriaCount = metrics.success_criteria.length;
    score += Math.min(20, criteriaCount * 5);

    // Measurable criteria (10 points)
    const measurableCriteria = metrics.success_criteria.filter(c => c.measurable).length;
    score += Math.min(10, measurableCriteria * 5);

    // ROI calculation (15 points)
    if (metrics.roi_calculation) {
      const roi = metrics.roi_calculation;
      if (roi.expected_return && roi.investment) {
        score += 10;
        // Bonus for high confidence
        if (roi.confidence_level >= 0.7) score += 5;
      }
    }

    // Value quantification (10 points)
    if (metrics.value_quantification) {
      if (metrics.value_quantification > 1000000) score += 10;
      else if (metrics.value_quantification > 500000) score += 8;
      else if (metrics.value_quantification > 100000) score += 6;
      else if (metrics.value_quantification > 50000) score += 4;
      else if (metrics.value_quantification > 0) score += 2;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate Economic Buyer score (0-100)
   */
  private calculateEconomicBuyerScore(economicBuyer: MEDDICQualification['economic_buyer']): number {
    let score = 0;

    // Economic buyer identified (35 points)
    if (economicBuyer.identified) {
      score += 35;
    }

    // Contact information available (10 points)
    if (economicBuyer.contact_info) {
      if (economicBuyer.contact_info.email) score += 5;
      if (economicBuyer.contact_info.phone) score += 3;
      if (economicBuyer.contact_info.linkedin) score += 2;
    }

    // Engagement level (25 points)
    score += Math.min(25, (economicBuyer.engagement_level / 100) * 25);

    // Buying power confirmed (20 points)
    if (economicBuyer.buying_power_confirmed) {
      score += 20;
    }

    // Budget authority documented (10 points)
    if (economicBuyer.budget_authority) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate Decision Criteria score (0-100)
   */
  private calculateDecisionCriteriaScore(decisionCriteria: MEDDICQualification['decision_criteria']): number {
    let score = 0;

    // Technical requirements identified (25 points)
    const techReqCount = decisionCriteria.technical_requirements.length;
    score += Math.min(25, techReqCount * 5);

    // Technical requirements satisfied (15 points)
    const techSatisfied = decisionCriteria.technical_requirements.filter(r => r.satisfied).length;
    const techSatisfactionRate = techReqCount > 0 ? techSatisfied / techReqCount : 0;
    score += Math.round(techSatisfactionRate * 15);

    // Business requirements identified (25 points)
    const bizReqCount = decisionCriteria.business_requirements.length;
    score += Math.min(25, bizReqCount * 5);

    // Business requirements satisfied (15 points)
    const bizSatisfied = decisionCriteria.business_requirements.filter(r => r.satisfied).length;
    const bizSatisfactionRate = bizReqCount > 0 ? bizSatisfied / bizReqCount : 0;
    score += Math.round(bizSatisfactionRate * 15);

    // Vendor preferences (10 points)
    if (decisionCriteria.vendor_preferences && decisionCriteria.vendor_preferences.length > 0) {
      const ourPreference = decisionCriteria.vendor_preferences.find(v =>
        v.vendor.toLowerCase().includes('oppspot') || v.vendor.toLowerCase().includes('our')
      );
      if (ourPreference) {
        score += Math.min(10, ourPreference.preference_level);
      }
    }

    // Evaluation matrix (10 points)
    if (decisionCriteria.evaluation_matrix) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate Decision Process score (0-100)
   */
  private calculateDecisionProcessScore(decisionProcess: MEDDICQualification['decision_process']): number {
    let score = 0;

    // Decision stages defined (20 points)
    const stagesCount = decisionProcess.stages.length;
    score += Math.min(20, stagesCount * 5);

    // Progress through stages (25 points)
    if (stagesCount > 0) {
      const completedStages = decisionProcess.stages.filter(s => s.status === 'completed').length;
      const progressRate = completedStages / stagesCount;
      score += Math.round(progressRate * 25);

      // Current stage advancement (10 points)
      const currentStageIndex = decisionProcess.stages.findIndex(s =>
        s.name === decisionProcess.current_stage
      );
      if (currentStageIndex > 0) {
        const advancementRate = currentStageIndex / (stagesCount - 1);
        score += Math.round(advancementRate * 10);
      }
    }

    // Stakeholders mapped (20 points)
    const stakeholderCount = decisionProcess.stakeholders.length;
    score += Math.min(20, stakeholderCount * 4);

    // High-influence stakeholders engaged (15 points)
    const highInfluenceEngaged = decisionProcess.stakeholders.filter(s =>
      s.influence_level >= 7 && s.engagement_level >= 5
    ).length;
    score += Math.min(15, highInfluenceEngaged * 5);

    // Approval process defined (5 points)
    if (decisionProcess.approval_process) {
      score += 5;
    }

    // Timeline established (5 points)
    if (decisionProcess.timeline) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate Identify Pain score (0-100)
   */
  private calculateIdentifyPainScore(identifyPain: MEDDICQualification['identify_pain']): number {
    let score = 0;

    // Pain points identified (30 points)
    const painCount = identifyPain.pain_points.length;
    score += Math.min(30, painCount * 10);

    // Pain severity (15 points)
    if (painCount > 0) {
      const criticalPains = identifyPain.pain_points.filter(p => p.severity === 'critical').length;
      const highPains = identifyPain.pain_points.filter(p => p.severity === 'high').length;
      score += Math.min(15, criticalPains * 10 + highPains * 5);
    }

    // Business impact quantified (20 points)
    if (identifyPain.business_impact) {
      const impact = identifyPain.business_impact;
      if (impact.revenue_impact || impact.cost_impact) {
        score += 15;
      }
      if (impact.efficiency_impact) {
        score += 5;
      }
    }

    // Cost of inaction calculated (15 points)
    if (identifyPain.cost_of_inaction) {
      if (identifyPain.cost_of_inaction > 1000000) score += 15;
      else if (identifyPain.cost_of_inaction > 500000) score += 12;
      else if (identifyPain.cost_of_inaction > 100000) score += 9;
      else if (identifyPain.cost_of_inaction > 50000) score += 6;
      else if (identifyPain.cost_of_inaction > 0) score += 3;
    }

    // Urgency level (20 points)
    score += Math.min(20, (identifyPain.urgency_level / 10) * 20);

    return Math.min(100, score);
  }

  /**
   * Calculate Champion score (0-100)
   */
  private calculateChampionScore(champion: MEDDICQualification['champion']): number {
    let score = 0;

    // Champion identified (30 points)
    if (champion.identified) {
      score += 30;
    }

    // Champion profile completeness (15 points)
    if (champion.champion_profile) {
      const profile = champion.champion_profile;
      if (profile.name) score += 5;
      if (profile.title) score += 5;
      if (profile.department) score += 5;
    }

    // Influence level (20 points)
    score += Math.min(20, (champion.influence_level / 10) * 20);

    // Internal selling ability (20 points)
    score += Math.min(20, (champion.internal_selling_ability / 10) * 20);

    // Relationship strength (15 points)
    score += Math.min(15, (champion.relationship_strength / 10) * 15);

    return Math.min(100, score);
  }

  /**
   * Calculate overall MEDDIC score
   */
  private calculateOverallScore(qualification: MEDDICQualification): number {
    // Weighted average of MEDDIC components
    const weights = {
      metrics: 0.15,
      economic_buyer: 0.20,
      decision_criteria: 0.15,
      decision_process: 0.15,
      identify_pain: 0.20,
      champion: 0.15
    };

    const score =
      qualification.metrics.score * weights.metrics +
      qualification.economic_buyer.score * weights.economic_buyer +
      qualification.decision_criteria.score * weights.decision_criteria +
      qualification.decision_process.score * weights.decision_process +
      qualification.identify_pain.score * weights.identify_pain +
      qualification.champion.score * weights.champion;

    return Math.round(score);
  }

  /**
   * Calculate qualification confidence
   */
  private calculateConfidence(qualification: MEDDICQualification): number {
    let confidence = 0;
    let factors = 0;

    // Economic buyer engagement
    if (qualification.economic_buyer.identified && qualification.economic_buyer.engagement_level > 50) {
      confidence += 0.25;
      factors++;
    }

    // Champion strength
    if (qualification.champion.identified && qualification.champion.influence_level > 7) {
      confidence += 0.20;
      factors++;
    }

    // Metrics clarity
    if (qualification.metrics.kpis_identified.length >= 3 && qualification.metrics.roi_calculation) {
      confidence += 0.15;
      factors++;
    }

    // Decision process clarity
    if (qualification.decision_process.stages.length > 0 && qualification.decision_process.timeline) {
      confidence += 0.15;
      factors++;
    }

    // Pain severity
    const criticalPains = qualification.identify_pain.pain_points.filter(p => p.severity === 'critical').length;
    if (criticalPains > 0 && qualification.identify_pain.cost_of_inaction) {
      confidence += 0.15;
      factors++;
    }

    // Requirements satisfaction
    const allReqs = [
      ...qualification.decision_criteria.technical_requirements,
      ...qualification.decision_criteria.business_requirements
    ];
    const satisfiedReqs = allReqs.filter(r => r.satisfied).length;
    if (allReqs.length > 0 && satisfiedReqs / allReqs.length >= 0.8) {
      confidence += 0.10;
      factors++;
    }

    // Normalize confidence based on factors present
    if (factors > 0) {
      confidence = confidence / (factors * 0.166); // Normalize to 0-1
    }

    return Math.min(1, confidence);
  }

  /**
   * Determine forecast category based on score and confidence
   */
  private determineForecastCategory(qualification: MEDDICQualification): MEDDICQualification['forecast_category'] {
    const score = qualification.overall_score;
    const confidence = qualification.qualification_confidence;

    if (score >= 80 && confidence >= 0.8) {
      return 'commit';
    } else if (score >= 60 && confidence >= 0.6) {
      return 'best_case';
    } else if (score >= 40) {
      return 'pipeline';
    } else {
      return 'omitted';
    }
  }

  /**
   * Auto-populate MEDDIC data from various sources
   */
  private async autoPopulateData(qualification: MEDDICQualification): Promise<MEDDICQualification> {
    const supabase = await this.getSupabase();

    try {
      // Get company data
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', qualification.company_id)
        .single();

      if (company) {
        // Estimate value quantification based on company size
        if (!qualification.metrics.value_quantification && company.annual_revenue) {
          // Typical deal size is 1-5% of annual revenue for B2B SaaS
          qualification.metrics.value_quantification = company.annual_revenue * 0.02;
        }
      }

      // Get stakeholder data for champion and economic buyer
      const { data: stakeholders } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('company_id', qualification.company_id);

      if (stakeholders && stakeholders.length > 0) {
        // Identify potential champion
        const champion = stakeholders.find(s =>
          s.champion_status === 'active' || s.champion_status === 'super'
        );

        if (champion && !qualification.champion.identified) {
          qualification.champion.identified = true;
          qualification.champion.champion_profile = {
            name: champion.name,
            title: champion.title || '',
            department: champion.department || '',
            influence_score: champion.influence_level || 5
          };
          qualification.champion.influence_level = champion.influence_level || 5;
          qualification.champion.relationship_strength = (champion.engagement_score || 50) / 10;
        }

        // Identify potential economic buyer
        const economicBuyer = stakeholders.find(s =>
          s.budget_authority === true ||
          (s.title && s.title.toLowerCase().includes('cfo')) ||
          (s.title && s.title.toLowerCase().includes('finance'))
        );

        if (economicBuyer && !qualification.economic_buyer.identified) {
          qualification.economic_buyer.identified = true;
          qualification.economic_buyer.contact_info = {
            email: economicBuyer.email,
            phone: economicBuyer.phone
          };
          qualification.economic_buyer.engagement_level = economicBuyer.engagement_score || 0;
        }

        // Map stakeholders for decision process
        qualification.decision_process.stakeholders = stakeholders.map(s => ({
          name: s.name,
          role: s.role_type || 'influencer',
          influence_level: s.influence_level || 5,
          engagement_level: (s.engagement_score || 0) / 10
        }));
      }

      // Get engagement data to infer decision stage
      const { data: engagements } = await supabase
        .from('engagement_events')
        .select('*')
        .eq('lead_id', qualification.lead_id)
        .order('event_date', { ascending: false });

      if (engagements && engagements.length > 0) {
        // Infer decision stages based on engagement
        const stages: DecisionStage[] = [];

        if (engagements.some(e => e.event_type === 'initial_contact')) {
          stages.push({
            name: 'Initial Contact',
            status: 'completed'
          });
        }

        if (engagements.some(e => e.event_type === 'discovery_call')) {
          stages.push({
            name: 'Discovery',
            status: 'completed'
          });
        }

        if (engagements.some(e => e.event_type === 'demo_scheduled')) {
          stages.push({
            name: 'Solution Evaluation',
            status: engagements.some(e => e.event_type === 'demo_completed') ? 'completed' : 'in_progress'
          });
        }

        if (engagements.some(e => e.event_type === 'proposal_sent')) {
          stages.push({
            name: 'Proposal Review',
            status: 'in_progress'
          });
        }

        stages.push({
          name: 'Negotiation',
          status: 'not_started'
        });

        stages.push({
          name: 'Decision',
          status: 'not_started'
        });

        if (stages.length > 0) {
          qualification.decision_process.stages = stages;
          const currentStage = stages.find(s => s.status === 'in_progress') || stages[stages.length - 1];
          qualification.decision_process.current_stage = currentStage.name;
        }
      }

    } catch (error) {
      console.error('Error auto-populating MEDDIC data:', error);
    }

    return qualification;
  }

  /**
   * Save qualification to database
   */
  private async saveQualification(qualification: MEDDICQualification): Promise<MEDDICQualification | null> {
    try {
      const supabase = await this.getSupabase();

      const dbData = this.mapToDatabase(qualification);

      const { data, error } = await supabase
        .from('meddic_qualifications')
        .upsert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error saving MEDDIC qualification:', error);
        return null;
      }

      // Log activity
      await supabase
        .from('qualification_activities')
        .insert({
          lead_id: qualification.lead_id,
          company_id: qualification.company_id,
          activity_type: 'meddic_calculated',
          activity_description: `MEDDIC score calculated: ${qualification.overall_score}`,
          activity_data: {
            scores: {
              metrics: qualification.metrics.score,
              economic_buyer: qualification.economic_buyer.score,
              decision_criteria: qualification.decision_criteria.score,
              decision_process: qualification.decision_process.score,
              identify_pain: qualification.identify_pain.score,
              champion: qualification.champion.score
            },
            confidence: qualification.qualification_confidence,
            forecast: qualification.forecast_category
          },
          score_impact: qualification.overall_score,
          framework_affected: 'MEDDIC'
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
  private mapToDatabase(qualification: MEDDICQualification): any {
    return {
      lead_id: qualification.lead_id,
      company_id: qualification.company_id,
      metrics_score: qualification.metrics.score,
      economic_buyer_score: qualification.economic_buyer.score,
      decision_criteria_score: qualification.decision_criteria.score,
      decision_process_score: qualification.decision_process.score,
      identify_pain_score: qualification.identify_pain.score,
      champion_score: qualification.champion.score,
      overall_score: qualification.overall_score,
      qualification_confidence: qualification.qualification_confidence,
      forecast_category: qualification.forecast_category,
      metrics_details: qualification.metrics,
      economic_buyer_details: qualification.economic_buyer,
      decision_criteria_details: qualification.decision_criteria,
      decision_process_details: qualification.decision_process,
      identify_pain_details: qualification.identify_pain,
      champion_details: qualification.champion,
      calculated_at: new Date().toISOString(),
      notes: qualification.notes
    };
  }

  /**
   * Map from database format to qualification
   */
  private mapFromDatabase(data: any): MEDDICQualification {
    return {
      id: data.id,
      lead_id: data.lead_id,
      company_id: data.company_id,
      metrics: data.metrics_details || this.createEmptyMetrics(),
      economic_buyer: data.economic_buyer_details || this.createEmptyEconomicBuyer(),
      decision_criteria: data.decision_criteria_details || this.createEmptyDecisionCriteria(),
      decision_process: data.decision_process_details || this.createEmptyDecisionProcess(),
      identify_pain: data.identify_pain_details || this.createEmptyIdentifyPain(),
      champion: data.champion_details || this.createEmptyChampion(),
      overall_score: data.overall_score || 0,
      qualification_confidence: data.qualification_confidence || 0,
      forecast_category: data.forecast_category || 'omitted',
      calculated_at: data.calculated_at,
      calculated_by: data.calculated_by,
      notes: data.notes
    };
  }

  /**
   * Create empty qualification structure
   */
  private createEmptyQualification(lead_id: string, company_id: string): MEDDICQualification {
    return {
      lead_id,
      company_id,
      metrics: this.createEmptyMetrics(),
      economic_buyer: this.createEmptyEconomicBuyer(),
      decision_criteria: this.createEmptyDecisionCriteria(),
      decision_process: this.createEmptyDecisionProcess(),
      identify_pain: this.createEmptyIdentifyPain(),
      champion: this.createEmptyChampion(),
      overall_score: 0,
      qualification_confidence: 0,
      forecast_category: 'omitted'
    };
  }

  private createEmptyMetrics(): MEDDICQualification['metrics'] {
    return {
      score: 0,
      kpis_identified: [],
      success_criteria: []
    };
  }

  private createEmptyEconomicBuyer(): MEDDICQualification['economic_buyer'] {
    return {
      score: 0,
      identified: false,
      engagement_level: 0,
      buying_power_confirmed: false
    };
  }

  private createEmptyDecisionCriteria(): MEDDICQualification['decision_criteria'] {
    return {
      score: 0,
      technical_requirements: [],
      business_requirements: []
    };
  }

  private createEmptyDecisionProcess(): MEDDICQualification['decision_process'] {
    return {
      score: 0,
      stages: [],
      current_stage: '',
      stakeholders: []
    };
  }

  private createEmptyIdentifyPain(): MEDDICQualification['identify_pain'] {
    return {
      score: 0,
      pain_points: [],
      urgency_level: 0
    };
  }

  private createEmptyChampion(): MEDDICQualification['champion'] {
    return {
      score: 0,
      identified: false,
      influence_level: 0,
      internal_selling_ability: 0,
      relationship_strength: 0
    };
  }
}

// Export singleton instance
export const meddicFramework = new MEDDICFramework();