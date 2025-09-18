import { createClient } from '@/lib/supabase/server';
import {
  TechnologyAdoptionSignal,
  Technology,
  AdoptionType,
  AdoptionStage,
  DetectionMethod,
  DeploymentScope,
  ComplexityLevel,
  SignalStrength,
  ImpactAssessment,
  RecommendedAction
} from '../types/buying-signals';

export class TechnologyAdoptionDetector {
  private static instance: TechnologyAdoptionDetector;

  // Technology categories and their typical replacements
  private readonly technologyReplacements: { [key: string]: string[] } = {
    'jenkins': ['github actions', 'gitlab ci', 'circleci', 'azure devops'],
    'mysql': ['postgresql', 'mongodb', 'dynamodb', 'aurora'],
    'on-premise': ['aws', 'azure', 'gcp', 'hybrid cloud'],
    'monolith': ['microservices', 'kubernetes', 'docker', 'serverless'],
    'excel': ['tableau', 'power bi', 'looker', 'datadog'],
    'email': ['slack', 'teams', 'discord', 'zoom'],
    'svn': ['git', 'github', 'gitlab', 'bitbucket'],
    'waterfall': ['agile', 'scrum', 'kanban', 'devops']
  };

  // Technology stacks and common integrations
  private readonly technologyStacks: { [key: string]: string[] } = {
    'aws': ['ec2', 's3', 'rds', 'lambda', 'cloudfront', 'dynamodb'],
    'azure': ['virtual machines', 'blob storage', 'cosmos db', 'functions', 'app service'],
    'gcp': ['compute engine', 'cloud storage', 'bigquery', 'cloud functions', 'app engine'],
    'kubernetes': ['docker', 'helm', 'istio', 'prometheus', 'grafana'],
    'data_stack': ['snowflake', 'databricks', 'airflow', 'dbt', 'tableau'],
    'modern_frontend': ['react', 'typescript', 'webpack', 'jest', 'storybook'],
    'microservices': ['docker', 'kubernetes', 'api gateway', 'service mesh', 'kafka']
  };

  private constructor() {}

  static getInstance(): TechnologyAdoptionDetector {
    if (!this.instance) {
      this.instance = new TechnologyAdoptionDetector();
    }
    return this.instance;
  }

  async detectTechnologyAdoption(
    companyId: string,
    adoptionData: any
  ): Promise<TechnologyAdoptionSignal | null> {
    const supabase = await createClient();

    try {
      // Check for duplicate signals
      const isDuplicate = await this.checkDuplicateTechnologySignal(companyId, adoptionData);
      if (isDuplicate) {
        console.log('Duplicate technology adoption signal detected, skipping');
        return null;
      }

      // Get company context
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single();

      if (!company) {
        throw new Error('Company not found');
      }

      // Determine adoption type and stage
      const adoptionType = this.determineAdoptionType(adoptionData);
      const adoptionStage = this.determineAdoptionStage(adoptionData);

      // Calculate signal strength and buying probability
      const signalStrength = this.calculateSignalStrength(adoptionData, adoptionType, adoptionStage);
      const buyingProbability = this.calculateBuyingProbability(
        adoptionData,
        adoptionType,
        adoptionStage,
        company
      );

      // Analyze impact
      const impact = this.analyzeImpact(adoptionData, adoptionType, company);

      // Identify opportunities
      const opportunity = this.identifyOpportunities(adoptionData, adoptionType, impact);

      // Create the technology adoption signal
      const technologySignal: Partial<TechnologyAdoptionSignal> = {
        company_id: companyId,
        signal_type: 'technology_adoption',
        signal_category: 'technology',
        signal_strength: signalStrength,
        confidence_score: this.calculateConfidenceScore(adoptionData),
        buying_probability: buyingProbability,
        signal_date: adoptionData.detection_date || new Date(),

        technology_data: {
          technology_name: adoptionData.technology_name,
          technology_category: this.categorizeTechnology(adoptionData.technology_name),
          vendor: adoptionData.vendor,
          adoption_type: adoptionType,
          adoption_stage: adoptionStage,
          detection_method: adoptionData.detection_method as DetectionMethod,
          detection_confidence: adoptionData.detection_confidence || 70
        },

        impact,
        opportunity,

        impact_assessment: this.createImpactAssessment(adoptionData, adoptionType, impact),
        recommended_actions: this.generateRecommendedActions(
          adoptionData,
          adoptionType,
          adoptionStage,
          opportunity
        ),
        engagement_window: this.calculateEngagementWindow(adoptionType, adoptionStage),

        source: adoptionData.source,
        source_url: adoptionData.source_url,
        source_reliability: adoptionData.source_reliability || 'medium',
        status: 'detected'
      };

      // Store the signal in database
      const { data: signal, error } = await supabase
        .from('buying_signals')
        .insert({
          ...technologySignal,
          signal_data: technologySignal.technology_data,
          detected_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // Store technology-specific details
      await supabase.from('technology_adoption_signals').insert({
        signal_id: signal.id,
        company_id: companyId,
        technology_name: adoptionData.technology_name,
        technology_category: technologySignal.technology_data?.technology_category,
        vendor: adoptionData.vendor,
        adoption_type: adoptionType,
        adoption_stage: adoptionStage,
        detection_method: adoptionData.detection_method,
        detection_confidence: adoptionData.detection_confidence || 70,
        estimated_users: impact.estimated_users,
        deployment_scope: impact.deployment_scope,
        integration_complexity: impact.integration_complexity,
        replaced_technology: impact.replaced_technology,
        complementary_technologies: impact.complementary_technologies,
        integration_requirements: impact.integration_requirements,
        cross_sell_opportunities: opportunity.cross_sell_opportunities,
        competitive_displacement: opportunity.competitive_displacement,
        expansion_potential: opportunity.expansion_potential
      });

      return signal as TechnologyAdoptionSignal;

    } catch (error) {
      console.error('Error detecting technology adoption:', error);
      return null;
    }
  }

  private determineAdoptionType(adoptionData: any): AdoptionType {
    const techName = adoptionData.technology_name?.toLowerCase();
    const context = adoptionData.context?.toLowerCase() || '';

    // Check if it's replacing something
    for (const [old, replacements] of Object.entries(this.technologyReplacements)) {
      if (replacements.includes(techName) && context.includes(old)) {
        return 'replacement';
      }
    }

    // Check for upgrade signals
    if (context.includes('upgrade') || context.includes('migration') ||
        context.includes('moderniz')) {
      return 'upgrade';
    }

    // Check for expansion
    if (context.includes('expand') || context.includes('scale') ||
        context.includes('additional')) {
      return 'expansion';
    }

    // Check for pilot
    if (context.includes('pilot') || context.includes('poc') ||
        context.includes('proof of concept') || context.includes('trial')) {
      return 'pilot';
    }

    // Check for deprecation
    if (context.includes('sunset') || context.includes('deprecat') ||
        context.includes('retiring') || context.includes('phasing out')) {
      return 'deprecation';
    }

    // Default to new implementation
    return 'new_implementation';
  }

  private determineAdoptionStage(adoptionData: any): AdoptionStage {
    const context = adoptionData.context?.toLowerCase() || '';
    const detectionMethod = adoptionData.detection_method;

    // Strong signals of production use
    if (detectionMethod === 'dns_record' || context.includes('production') ||
        context.includes('live') || context.includes('deployed')) {
      return 'production';
    }

    // Rollout signals
    if (context.includes('rolling out') || context.includes('deploying') ||
        context.includes('implementing')) {
      return 'rollout';
    }

    // Implementation signals
    if (context.includes('building') || context.includes('developing') ||
        context.includes('integrating')) {
      return 'implementation';
    }

    // Pilot signals
    if (context.includes('pilot') || context.includes('testing') ||
        context.includes('poc')) {
      return 'pilot';
    }

    // Evaluation signals
    if (context.includes('evaluating') || context.includes('considering') ||
        context.includes('researching')) {
      return 'evaluation';
    }

    // Sunsetting signals
    if (context.includes('sunset') || context.includes('deprecat')) {
      return 'sunsetting';
    }

    return 'evaluation';
  }

  private calculateSignalStrength(
    adoptionData: any,
    adoptionType: AdoptionType,
    adoptionStage: AdoptionStage
  ): SignalStrength {
    // Production deployments are strongest signals
    if (adoptionStage === 'production') {
      if (adoptionType === 'new_implementation' || adoptionType === 'replacement') {
        return 'very_strong';
      }
      return 'strong';
    }

    // Rollout and implementation are strong signals
    if (adoptionStage === 'rollout' || adoptionStage === 'implementation') {
      return 'strong';
    }

    // Pilots are moderate signals
    if (adoptionStage === 'pilot') {
      return 'moderate';
    }

    // Everything else is weak
    return 'weak';
  }

  private calculateBuyingProbability(
    adoptionData: any,
    adoptionType: AdoptionType,
    adoptionStage: AdoptionStage,
    company: any
  ): number {
    let probability = 30; // Base probability

    // Stage impact
    if (adoptionStage === 'production') probability += 10;
    else if (adoptionStage === 'rollout') probability += 25;
    else if (adoptionStage === 'implementation') probability += 30;
    else if (adoptionStage === 'pilot') probability += 20;
    else if (adoptionStage === 'evaluation') probability += 15;

    // Type impact
    if (adoptionType === 'replacement') probability += 20;
    else if (adoptionType === 'new_implementation') probability += 15;
    else if (adoptionType === 'expansion') probability += 15;
    else if (adoptionType === 'upgrade') probability += 10;

    // Technology category impact
    const category = this.categorizeTechnology(adoptionData.technology_name);
    if (category === 'cloud' || category === 'infrastructure') probability += 15;
    else if (category === 'data' || category === 'analytics') probability += 12;
    else if (category === 'security') probability += 10;

    // Company growth impact
    if (company.growth_rate === 'high') probability += 10;

    // Detection confidence impact
    if (adoptionData.detection_confidence > 80) probability += 10;
    else if (adoptionData.detection_confidence > 60) probability += 5;

    return Math.min(100, probability);
  }

  private analyzeImpact(adoptionData: any, adoptionType: AdoptionType, company: any) {
    const techName = adoptionData.technology_name?.toLowerCase();
    const category = this.categorizeTechnology(techName);

    const impact: any = {
      estimated_users: this.estimateUsers(adoptionData, company),
      deployment_scope: this.determineDeploymentScope(adoptionData, company),
      integration_complexity: this.assessIntegrationComplexity(techName, category),
      replaced_technology: this.identifyReplacedTechnology(techName, adoptionData),
      complementary_technologies: this.identifyComplementaryTechnologies(techName),
      integration_requirements: this.identifyIntegrationRequirements(techName, category)
    };

    return impact;
  }

  private estimateUsers(adoptionData: any, company: any): number {
    const scope = adoptionData.deployment_scope;
    const companySize = parseInt(company.employee_count || '100');

    if (scope === 'company_wide') {
      return companySize;
    } else if (scope === 'department') {
      return Math.round(companySize * 0.2);
    } else if (scope === 'team') {
      return Math.round(companySize * 0.05);
    } else {
      return 10; // Pilot users
    }
  }

  private determineDeploymentScope(adoptionData: any, company: any): DeploymentScope {
    const context = adoptionData.context?.toLowerCase() || '';

    if (context.includes('company-wide') || context.includes('enterprise') ||
        context.includes('organization-wide')) {
      return 'company_wide';
    } else if (context.includes('department') || context.includes('division')) {
      return 'department';
    } else if (context.includes('team') || context.includes('group')) {
      return 'team';
    } else {
      return 'pilot';
    }
  }

  private assessIntegrationComplexity(techName: string, category: string): ComplexityLevel {
    // Enterprise systems are typically high complexity
    if (category === 'erp' || category === 'infrastructure' ||
        techName.includes('sap') || techName.includes('oracle')) {
      return 'high';
    }

    // Data and analytics tools are medium complexity
    if (category === 'data' || category === 'analytics' || category === 'security') {
      return 'medium';
    }

    // SaaS and collaboration tools are typically low complexity
    return 'low';
  }

  private identifyReplacedTechnology(techName: string, adoptionData: any): string | undefined {
    const context = adoptionData.context?.toLowerCase() || '';

    // Check replacement mappings
    for (const [old, replacements] of Object.entries(this.technologyReplacements)) {
      if (replacements.includes(techName.toLowerCase()) && context.includes(old)) {
        return old;
      }
    }

    // Look for explicit replacement mentions
    const replacePattern = /replacing\s+(\w+)|migrating\s+from\s+(\w+)|moving\s+from\s+(\w+)/i;
    const match = context.match(replacePattern);
    if (match) {
      return match[1] || match[2] || match[3];
    }

    return undefined;
  }

  private identifyComplementaryTechnologies(techName: string): string[] {
    const tech = techName.toLowerCase();
    const complementary: string[] = [];

    // Find technology stack associations
    for (const [stack, technologies] of Object.entries(this.technologyStacks)) {
      if (technologies.includes(tech)) {
        // Add other technologies from the same stack
        complementary.push(...technologies.filter(t => t !== tech));
        break;
      }
    }

    // Add common complementary technologies
    if (tech.includes('kubernetes')) {
      complementary.push('docker', 'helm', 'prometheus');
    } else if (tech.includes('aws')) {
      complementary.push('terraform', 'cloudformation', 'datadog');
    } else if (tech.includes('salesforce')) {
      complementary.push('mulesoft', 'tableau', 'slack');
    }

    return [...new Set(complementary)].slice(0, 5);
  }

  private identifyIntegrationRequirements(techName: string, category: string): string[] {
    const requirements: string[] = [];

    if (category === 'crm') {
      requirements.push('Customer data migration', 'API integration', 'Email sync');
    } else if (category === 'erp') {
      requirements.push('Financial data integration', 'Inventory sync', 'HR system connection');
    } else if (category === 'cloud') {
      requirements.push('Identity management', 'Network configuration', 'Data migration');
    } else if (category === 'data') {
      requirements.push('Data pipeline setup', 'ETL configuration', 'Dashboard creation');
    } else if (category === 'security') {
      requirements.push('SSO integration', 'Compliance configuration', 'Audit logging');
    }

    return requirements;
  }

  private identifyOpportunities(adoptionData: any, adoptionType: AdoptionType, impact: any) {
    const techName = adoptionData.technology_name?.toLowerCase();
    const category = this.categorizeTechnology(techName);

    const opportunity: any = {
      cross_sell_opportunities: this.identifyCrossSellOpportunities(techName, category, impact),
      competitive_displacement: this.assessCompetitiveDisplacement(adoptionData, adoptionType),
      expansion_potential: this.assessExpansionPotential(adoptionType, impact)
    };

    return opportunity;
  }

  private identifyCrossSellOpportunities(techName: string, category: string, impact: any): string[] {
    const opportunities: string[] = [];

    // Based on technology category
    if (category === 'cloud') {
      opportunities.push('Cloud security', 'Cost optimization', 'Monitoring tools');
    } else if (category === 'data') {
      opportunities.push('Data governance', 'Analytics tools', 'Data quality');
    } else if (category === 'security') {
      opportunities.push('Compliance tools', 'Identity management', 'Threat detection');
    }

    // Based on complementary technologies
    if (impact.complementary_technologies?.includes('kubernetes')) {
      opportunities.push('Container security', 'Service mesh');
    }

    // Based on integration requirements
    if (impact.integration_requirements?.includes('API integration')) {
      opportunities.push('API management', 'Integration platform');
    }

    return opportunities.slice(0, 5);
  }

  private assessCompetitiveDisplacement(adoptionData: any, adoptionType: AdoptionType): boolean {
    // Replacement adoption types often indicate competitive displacement
    if (adoptionType === 'replacement') {
      return true;
    }

    // Check if they're moving away from a competitor
    const context = adoptionData.context?.toLowerCase() || '';
    const competitorKeywords = ['competitor', 'switching from', 'replacing', 'moving from'];

    return competitorKeywords.some(keyword => context.includes(keyword));
  }

  private assessExpansionPotential(adoptionType: AdoptionType, impact: any): ComplexityLevel {
    if (adoptionType === 'pilot' || impact.deployment_scope === 'pilot') {
      return 'high'; // Pilots have high expansion potential
    } else if (impact.deployment_scope === 'team' || impact.deployment_scope === 'department') {
      return 'medium'; // Partial deployments can expand
    } else {
      return 'low'; // Already fully deployed
    }
  }

  private categorizeTechnology(techName: string): string {
    const tech = techName.toLowerCase();

    if (tech.includes('aws') || tech.includes('azure') || tech.includes('gcp') ||
        tech.includes('cloud')) {
      return 'cloud';
    } else if (tech.includes('data') || tech.includes('analytics') || tech.includes('bi')) {
      return 'data';
    } else if (tech.includes('security') || tech.includes('firewall') || tech.includes('antivirus')) {
      return 'security';
    } else if (tech.includes('crm') || tech.includes('salesforce') || tech.includes('hubspot')) {
      return 'crm';
    } else if (tech.includes('erp') || tech.includes('sap') || tech.includes('oracle')) {
      return 'erp';
    } else if (tech.includes('devops') || tech.includes('ci') || tech.includes('cd')) {
      return 'devops';
    } else if (tech.includes('collab') || tech.includes('slack') || tech.includes('teams')) {
      return 'collaboration';
    } else {
      return 'general';
    }
  }

  private calculateConfidenceScore(adoptionData: any): number {
    let confidence = 50; // Base confidence

    // Detection method impacts confidence
    const method = adoptionData.detection_method;
    if (method === 'dns_record' || method === 'website_scan') confidence += 20;
    else if (method === 'press_release' || method === 'case_study') confidence += 15;
    else if (method === 'job_posting') confidence += 10;
    else if (method === 'social_media') confidence += 5;

    // Add detection confidence if provided
    if (adoptionData.detection_confidence) {
      confidence = Math.round((confidence + adoptionData.detection_confidence) / 2);
    }

    // Source reliability
    if (adoptionData.source_reliability === 'verified') confidence += 10;
    else if (adoptionData.source_reliability === 'high') confidence += 5;

    return Math.min(100, confidence);
  }

  private createImpactAssessment(
    adoptionData: any,
    adoptionType: AdoptionType,
    impact: any
  ): ImpactAssessment {
    // Estimate revenue impact based on technology type and scope
    let revenueImpact = 100000; // Base
    if (impact.deployment_scope === 'company_wide') revenueImpact *= 5;
    else if (impact.deployment_scope === 'department') revenueImpact *= 2;

    if (adoptionType === 'replacement' || adoptionType === 'new_implementation') {
      revenueImpact *= 1.5;
    }

    return {
      revenue_impact: revenueImpact,
      urgency_level: adoptionType === 'replacement' ? 8 : 6,
      decision_timeline: adoptionType === 'pilot' ? '1-3 months' : '3-6 months',
      budget_implications: impact.integration_complexity === 'high' ?
        'Significant budget required for implementation and integration' :
        'Moderate budget allocation expected',
      strategic_alignment: 80
    };
  }

  private generateRecommendedActions(
    adoptionData: any,
    adoptionType: AdoptionType,
    adoptionStage: AdoptionStage,
    opportunity: any
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Stage-specific actions
    if (adoptionStage === 'evaluation' || adoptionStage === 'pilot') {
      actions.push({
        action: 'Offer competitive comparison and proof of value',
        priority: 'urgent',
        timeline: '1 week',
        resources_needed: ['Competitive analysis', 'ROI calculator', 'Case studies']
      });
    } else if (adoptionStage === 'implementation' || adoptionStage === 'rollout') {
      actions.push({
        action: 'Provide integration support and best practices',
        priority: 'high',
        timeline: '2 weeks',
        resources_needed: ['Integration guide', 'Technical documentation', 'Support resources']
      });
    }

    // Type-specific actions
    if (adoptionType === 'replacement' && opportunity.competitive_displacement) {
      actions.push({
        action: 'Present migration assistance and switching incentives',
        priority: 'high',
        timeline: '1-2 weeks',
        resources_needed: ['Migration toolkit', 'Switching incentives', 'Comparison guide']
      });
    }

    // Opportunity-based actions
    if (opportunity.cross_sell_opportunities?.length > 0) {
      actions.push({
        action: 'Introduce complementary solutions',
        priority: 'medium',
        timeline: '3-4 weeks',
        resources_needed: ['Product portfolio', 'Integration benefits', 'Bundle pricing']
      });
    }

    if (opportunity.expansion_potential === 'high') {
      actions.push({
        action: 'Develop expansion roadmap and scaling strategy',
        priority: 'medium',
        timeline: '1 month',
        resources_needed: ['Scaling guide', 'Enterprise features', 'Volume pricing']
      });
    }

    return actions;
  }

  private calculateEngagementWindow(adoptionType: AdoptionType, adoptionStage: AdoptionStage) {
    const now = new Date();

    // Evaluation and pilot stages need immediate engagement
    if (adoptionStage === 'evaluation' || adoptionStage === 'pilot') {
      return {
        optimal_start: now,
        optimal_end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        reason: 'Critical decision-making phase'
      };
    }

    // Implementation and rollout benefit from support engagement
    if (adoptionStage === 'implementation' || adoptionStage === 'rollout') {
      return {
        optimal_start: now,
        optimal_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        reason: 'Active implementation support opportunity'
      };
    }

    // Production deployments - engage for expansion/optimization
    if (adoptionStage === 'production') {
      return {
        optimal_start: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days out
        optimal_end: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
        reason: 'Post-deployment optimization and expansion'
      };
    }

    // Default window
    return {
      optimal_start: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
      optimal_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      reason: 'General engagement opportunity'
    };
  }

  private async checkDuplicateTechnologySignal(companyId: string, adoptionData: any): Promise<boolean> {
    const supabase = await createClient();

    // Check for similar technology signals in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from('technology_adoption_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('technology_name', adoptionData.technology_name)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return existing && existing.length > 0;
  }

  // Scan for technology changes via various methods
  async scanForTechnologyChanges(companyId: string): Promise<TechnologyAdoptionSignal[]> {
    const signals: TechnologyAdoptionSignal[] = [];

    // This would integrate with various detection methods:
    // - DNS record scanning
    // - Website technology detection
    // - Job posting analysis
    // - Press release monitoring
    // - Social media tracking

    return signals;
  }

  // Predict technology adoption based on patterns
  async predictTechnologyAdoption(companyId: string): Promise<any> {
    const supabase = await createClient();

    // Get company's current technology profile
    const { data: currentTech } = await supabase
      .from('technology_adoption_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('adoption_stage', 'production');

    // Analyze patterns and predict next adoptions
    const predictions = {
      likely_adoptions: [] as string[],
      replacement_candidates: [] as string[],
      expansion_opportunities: [] as string[],
      timeline: '3-6 months'
    };

    // Simple prediction logic (would be ML model in production)
    if (currentTech?.some(t => t.technology_name?.toLowerCase().includes('kubernetes'))) {
      predictions.likely_adoptions.push('Service mesh', 'GitOps tools');
    }

    if (currentTech?.some(t => t.technology_category === 'cloud')) {
      predictions.expansion_opportunities.push('Multi-cloud', 'Cloud cost optimization');
    }

    return predictions;
  }
}

export default TechnologyAdoptionDetector.getInstance();