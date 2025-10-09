import { createClient } from '@/lib/supabase/server';
import type { Row } from '@/lib/supabase/helpers'
import {
  JobPostingSignal,
  RemoteOption,
  GrowthIndicator,
  SignalStrength,
  Skill,
  Technology,
  Certification,
  DepartmentCount,
  SalaryRange,
  TechStack,
  Integration,
  Infrastructure,
  SolutionCategory,
  PainPoint,
  ImpactAssessment,
  RecommendedAction
} from '../types/buying-signals';

// Job posting data interface
export interface JobPostingData {
  job_id?: string
  title: string
  description: string
  location?: string
  posted_date?: Date
  source: string
  url?: string
  source_reliability?: 'verified' | 'high' | 'medium' | 'low'
}

// Volume metrics interface
export interface VolumeMetrics {
  total_open_positions: number
  department_distribution: DepartmentCount[]
  posting_velocity: number
  growth_rate: number
  comparative_analysis: {
    industry_average: number
    percentile: number
  }
}

// Growth analysis interface
export interface GrowthAnalysis {
  growth_indicator: GrowthIndicator
  department_expansion: boolean
  new_initiative_likelihood: number
  technology_adoption: Technology[]
  strategic_direction: string[]
}

// Technology signals interface
export interface TechnologySignals {
  tech_stack: TechStack
  new_technologies: Technology[]
  migration_signals: Technology[]
  integration_needs: Integration[]
  infrastructure_changes: Infrastructure[]
}

// Buying indicators interface
export interface BuyingIndicators {
  budget_allocation_likely: boolean
  procurement_timeline?: {
    start: Date
    end: Date
  }
  solution_categories: SolutionCategory[]
  pain_points: PainPoint[]
  decision_makers_hiring: boolean
}

// Hiring trends interface
export interface HiringTrends {
  total_postings: number
  department_growth: { [key: string]: number }
  technology_trends: { [key: string]: number }
  hiring_velocity: number
  expansion_signal: boolean
}

export class JobPostingAnalyzer {
  private static instance: JobPostingAnalyzer;

  // Technology keywords to detect
  private readonly technologyKeywords = {
    cloud: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'docker', 'serverless'],
    data: ['data', 'analytics', 'bi', 'machine learning', 'ai', 'bigquery', 'snowflake'],
    devops: ['devops', 'ci/cd', 'jenkins', 'gitlab', 'terraform', 'ansible'],
    security: ['security', 'compliance', 'soc2', 'iso27001', 'encryption', 'vulnerability'],
    crm: ['salesforce', 'hubspot', 'crm', 'customer relationship'],
    erp: ['sap', 'oracle', 'erp', 'netsuite', 'enterprise resource'],
    collaboration: ['slack', 'teams', 'zoom', 'collaboration', 'communication'],
    marketing: ['marketing automation', 'martech', 'seo', 'sem', 'analytics']
  };

  private constructor() {}

  static getInstance(): JobPostingAnalyzer {
    if (!this.instance) {
      this.instance = new JobPostingAnalyzer();
    }
    return this.instance;
  }

  async analyzeJobPosting(
    companyId: string,
    jobData: JobPostingData
  ): Promise<JobPostingSignal | null> {
    const supabase = await createClient();

    try {
      // Check for duplicate job posting
      const isDuplicate = await this.checkDuplicateJobPosting(companyId, jobData);
      if (isDuplicate) {
        console.log('Duplicate job posting signal detected, skipping');
        return null;
      }

      // Get company context
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single() as { data: Row<'businesses'> | null; error: any };

      if (!company) {
        throw new Error('Company not found');
      }

      // Extract technologies and skills
      const technologies = this.extractTechnologies(jobData.description);
      const skills = this.extractSkills(jobData.description);
      const certifications = this.extractCertifications(jobData.description);

      // Analyze job posting volume and trends
      const volumeMetrics = await this.calculateVolumeMetrics(companyId);

      // Calculate signal strength and buying probability
      const signalStrength = this.calculateSignalStrength(jobData, volumeMetrics);
      const buyingProbability = this.calculateBuyingProbability(jobData, technologies, volumeMetrics);

      // Analyze growth and expansion signals
      const analysis = this.analyzeGrowthSignals(jobData, volumeMetrics, technologies);

      // Identify technology signals
      const technologySignals = this.identifyTechnologySignals(technologies, jobData);

      // Determine buying indicators
      const buyingIndicators = this.determineBuyingIndicators(jobData, technologies, analysis);

      // Create the job posting signal
      const jobSignal: Partial<JobPostingSignal> = {
        company_id: companyId,
        signal_type: 'job_posting',
        signal_category: 'growth',
        signal_strength: signalStrength,
        confidence_score: this.calculateConfidenceScore(jobData),
        buying_probability: buyingProbability,
        signal_date: jobData.posted_date || new Date(),

        posting_data: {
          job_id: jobData.job_id,
          title: jobData.title,
          department: this.extractDepartment(jobData.title, jobData.description),
          level: this.extractLevel(jobData.title),
          location: jobData.location,
          remote_options: this.extractRemoteOptions(jobData) as RemoteOption,
          posted_date: jobData.posted_date || new Date(),
          source: jobData.source,
          url: jobData.url,
          salary_range: this.extractSalaryRange(jobData.description),
          required_skills: skills.required,
          preferred_skills: skills.preferred,
          technologies_mentioned: technologies,
          certifications: certifications,
          experience_years: this.extractExperienceYears(jobData.description)
        },

        analysis,
        volume_metrics: volumeMetrics,
        technology_signals: technologySignals,
        buying_indicators: buyingIndicators,

        impact_assessment: this.createImpactAssessment(jobData, analysis, buyingIndicators),
        recommended_actions: this.generateRecommendedActions(jobData, technologies, buyingIndicators),
        engagement_window: this.calculateEngagementWindow(jobData),

        source: jobData.source,
        source_url: jobData.url,
        source_reliability: jobData.source_reliability || 'medium',
        status: 'detected'
      };

      // Store the signal in database
      const { data: signal, error } = await supabase
        .from('buying_signals')
        // @ts-ignore - Supabase type inference issue
        .insert({
          ...jobSignal,
          signal_data: jobSignal.posting_data,
          detected_at: new Date()
        })
        .select()
        .single() as { data: (Record<string, unknown> & { id: string }) | null; error: any };

      if (error) throw error;

      // @ts-ignore - Supabase type inference issue
      // Store job posting specific details
      await supabase.from('job_posting_signals').insert({
        signal_id: signal!.id,
        company_id: companyId,
        job_title: jobData.title,
        department: jobSignal.posting_data?.department,
        level: jobSignal.posting_data?.level,
        location: jobData.location,
        remote_options: jobSignal.posting_data?.remote_options,
        posted_date: jobData.posted_date,
        job_url: jobData.url,
        salary_range: jobSignal.posting_data?.salary_range,
        required_skills: skills.required.map(s => s.name),
        preferred_skills: skills.preferred.map(s => s.name),
        technologies_mentioned: technologies.map(t => t.name),
        certifications: certifications.map(c => c.name),
        experience_years: jobSignal.posting_data?.experience_years,
        total_open_positions: volumeMetrics?.total_open_positions,
        department_distribution: volumeMetrics?.department_distribution,
        posting_velocity: volumeMetrics?.posting_velocity,
        growth_rate: volumeMetrics?.growth_rate,
        new_technologies: technologySignals?.new_technologies?.map(t => t.name),
        deprecated_technologies: (technologySignals as TechnologySignals & { deprecated_technologies?: Technology[] })?.deprecated_technologies?.map(t => t.name),
        technology_stack: (technologySignals as TechnologySignals & { technology_stack?: unknown })?.technology_stack,
        integration_needs: technologySignals?.integration_needs?.map(i => i.name),
        budget_allocation_likely: buyingIndicators.budget_allocation_likely,
        procurement_timeline: buyingIndicators.procurement_timeline,
        solution_categories: buyingIndicators.solution_categories?.map(s => s.name),
        pain_points: buyingIndicators.pain_points?.map(p => p.description),
        decision_makers_hiring: buyingIndicators.decision_makers_hiring
      });

      return signal as JobPostingSignal;

    } catch (error) {
      console.error('Error analyzing job posting:', error);
      return null;
    }
  }

  private extractTechnologies(description: string): Technology[] {
    const technologies: Technology[] = [];
    const desc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(this.technologyKeywords)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          technologies.push({
            name: keyword,
            category: category
          });
        }
      }
    }

    // Remove duplicates
    return technologies.filter((tech, index, self) =>
      index === self.findIndex(t => t.name === tech.name)
    );
  }

  private extractSkills(description: string): { required: Skill[], preferred: Skill[] } {
    const required: Skill[] = [];
    const preferred: Skill[] = [];

    // Simple pattern matching for requirements
    const requiredPattern = /required|must have|essential|mandatory/i;
    const preferredPattern = /preferred|nice to have|bonus|desired/i;

    const lines = description.split('\n');
    let isRequired = true;

    for (const line of lines) {
      if (requiredPattern.test(line)) {
        isRequired = true;
      } else if (preferredPattern.test(line)) {
        isRequired = false;
      }

      // Extract skills from bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const skill = line.replace(/^[•\-\*]\s*/, '').trim();
        if (skill.length > 0 && skill.length < 100) {
          const skillObj: Skill = {
            name: skill,
            category: this.categorizeSkill(skill)
          };

          if (isRequired) {
            required.push(skillObj);
          } else {
            preferred.push(skillObj);
          }
        }
      }
    }

    return { required: required.slice(0, 10), preferred: preferred.slice(0, 10) };
  }

  private categorizeSkill(skill: string): string {
    const s = skill.toLowerCase();
    if (s.includes('programming') || s.includes('coding') || s.includes('development')) {
      return 'technical';
    } else if (s.includes('management') || s.includes('leadership')) {
      return 'management';
    } else if (s.includes('communication') || s.includes('presentation')) {
      return 'soft';
    } else {
      return 'general';
    }
  }

  private extractCertifications(description: string): Certification[] {
    const certifications: Certification[] = [];
    const certPatterns = [
      /AWS\s+Certified/gi,
      /Azure\s+Certified/gi,
      /Google\s+Cloud\s+Certified/gi,
      /PMP/g,
      /CISSP/g,
      /CCNA/g,
      /CCNP/g,
      /Scrum\s+Master/gi,
      /Six\s+Sigma/gi,
      /ITIL/g
    ];

    for (const pattern of certPatterns) {
      const matches = description.match(pattern);
      if (matches) {
        for (const match of matches) {
          certifications.push({
            name: match,
            required: description.toLowerCase().includes('required') &&
                     description.indexOf(match) < description.indexOf('preferred')
          });
        }
      }
    }

    return certifications;
  }

  private extractDepartment(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();

    if (text.includes('engineering') || text.includes('development') || text.includes('software')) {
      return 'Engineering';
    } else if (text.includes('sales')) {
      return 'Sales';
    } else if (text.includes('marketing')) {
      return 'Marketing';
    } else if (text.includes('product')) {
      return 'Product';
    } else if (text.includes('data') || text.includes('analytics')) {
      return 'Data';
    } else if (text.includes('operations') || text.includes('ops')) {
      return 'Operations';
    } else if (text.includes('finance')) {
      return 'Finance';
    } else if (text.includes('hr') || text.includes('human resources')) {
      return 'HR';
    } else if (text.includes('customer') || text.includes('support')) {
      return 'Customer Success';
    } else {
      return 'General';
    }
  }

  private extractLevel(title: string): string {
    const t = title.toLowerCase();

    if (t.includes('senior') || t.includes('sr.') || t.includes('lead') || t.includes('principal')) {
      return 'Senior';
    } else if (t.includes('junior') || t.includes('jr.') || t.includes('entry')) {
      return 'Junior';
    } else if (t.includes('manager') || t.includes('director') || t.includes('head')) {
      return 'Management';
    } else if (t.includes('intern')) {
      return 'Intern';
    } else {
      return 'Mid';
    }
  }

  private extractRemoteOptions(jobData: JobPostingData): RemoteOption {
    const text = (jobData.title + ' ' + jobData.description + ' ' + (jobData.location || '')).toLowerCase();

    if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) {
      if (text.includes('hybrid')) {
        return 'hybrid';
      }
      return 'remote';
    } else if (text.includes('hybrid')) {
      return 'hybrid';
    } else {
      return 'onsite';
    }
  }

  private extractSalaryRange(description: string): SalaryRange | undefined {
    // Look for salary patterns
    const salaryPattern = /\$?(\d{2,3}),?(\d{3})\s*[-–]\s*\$?(\d{2,3}),?(\d{3})/;
    const match = description.match(salaryPattern);

    if (match) {
      const min = parseInt(match[1] + match[2]);
      const max = parseInt(match[3] + match[4]);
      return {
        min,
        max,
        currency: 'USD'
      };
    }

    return undefined;
  }

  private extractExperienceYears(description: string): number {
    const patterns = [
      /(\d+)\+?\s*years?\s*(of\s*)?experience/i,
      /(\d+)\s*-\s*\d+\s*years/i,
      /minimum\s*(\d+)\s*years/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return 0;
  }

  private async calculateVolumeMetrics(companyId: string) {
    const supabase = await createClient();

    // Get job postings from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const { data: recentPostings } = await supabase
      .from('job_posting_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('posted_date', ninetyDaysAgo.toISOString()) as { data: (Row<'job_posting_signals'> & { department?: string; posted_date?: string })[] | null; error: any };

    const totalOpen = recentPostings?.length || 0;

    // Calculate department distribution
    const deptCounts: { [key: string]: number } = {};
    recentPostings?.forEach(posting => {
      const dept = posting.department || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const departmentDistribution: DepartmentCount[] = Object.entries(deptCounts).map(([dept, count]) => ({
      department: dept,
      count,
      percentage: (count / totalOpen) * 100
    }));

    // Calculate posting velocity (posts per month)
    const postingVelocity = totalOpen / 3; // Over 3 months

    // Calculate growth rate
    // @ts-ignore - Supabase type inference issue
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCount = recentPostings?.filter(p =>
      new Date(p.posted_date) >= thirtyDaysAgo
    ).length || 0;

    const previousCount = totalOpen - recentCount;
    const growthRate = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;

    return {
      total_open_positions: totalOpen,
      department_distribution: departmentDistribution,
      posting_velocity: postingVelocity,
      growth_rate: growthRate,
      comparative_analysis: {
        industry_average: 10, // Placeholder
        percentile: 75 // Placeholder
      }
    };
  }

  private calculateSignalStrength(jobData: JobPostingData, volumeMetrics: VolumeMetrics): SignalStrength {
    const totalPositions = volumeMetrics?.total_open_positions || 0;
    const growthRate = volumeMetrics?.growth_rate || 0;

    if (totalPositions > 20 || growthRate > 50) {
      return 'very_strong';
    } else if (totalPositions > 10 || growthRate > 25) {
      return 'strong';
    } else if (totalPositions > 5 || growthRate > 10) {
      return 'moderate';
    } else {
      return 'weak';
    }
  }

  private calculateBuyingProbability(jobData: JobPostingData, technologies: Technology[], volumeMetrics: VolumeMetrics): number {
    let probability = 30; // Base probability

    // Increase based on volume
    const totalPositions = volumeMetrics?.total_open_positions || 0;
    if (totalPositions > 20) probability += 25;
    else if (totalPositions > 10) probability += 20;
    else if (totalPositions > 5) probability += 15;

    // Increase based on technology mentions
    if (technologies.length > 10) probability += 20;
    else if (technologies.length > 5) probability += 15;
    else if (technologies.length > 2) probability += 10;

    // Increase for specific departments
    const dept = this.extractDepartment(jobData.title, jobData.description);
    if (dept === 'Engineering' || dept === 'Data') probability += 15;
    else if (dept === 'Sales' || dept === 'Marketing') probability += 10;

    // Growth rate impact
    const growthRate = volumeMetrics?.growth_rate || 0;
    if (growthRate > 50) probability += 15;
    else if (growthRate > 25) probability += 10;

    return Math.min(100, probability);
  }

  private analyzeGrowthSignals(jobData: JobPostingData, volumeMetrics: VolumeMetrics, technologies: Technology[]): GrowthAnalysis {
    const growthRate = volumeMetrics?.growth_rate || 0;
    const totalPositions = volumeMetrics?.total_open_positions || 0;

    let growthIndicator: GrowthIndicator = 'minimal';
    if (growthRate > 50 || totalPositions > 20) {
      growthIndicator = 'rapid';
    } else if (growthRate > 25 || totalPositions > 10) {
      growthIndicator = 'steady';
    } else if (growthRate > 10 || totalPositions > 5) {
      growthIndicator = 'moderate';
    }

    return {
      growth_indicator: growthIndicator,
      department_expansion: totalPositions > 5,
      new_initiative_likelihood: technologies.length > 5 ? 80 : 50,
      technology_adoption: technologies.slice(0, 5),
      strategic_direction: this.inferStrategicDirection(jobData, technologies)
    };
  }

  private inferStrategicDirection(jobData: JobPostingData, technologies: Technology[]): string[] {
    const directions: string[] = [];
    const techCategories = new Set(technologies.map(t => t.category));

    if (techCategories.has('cloud')) {
      directions.push('Cloud transformation');
    }
    if (techCategories.has('data')) {
      directions.push('Data-driven decision making');
    }
    if (techCategories.has('security')) {
      directions.push('Security enhancement');
    }
    if (techCategories.has('devops')) {
      directions.push('DevOps adoption');
    }

    return directions;
  }

  private identifyTechnologySignals(technologies: Technology[], jobData: JobPostingData): TechnologySignals {
    // Group technologies by category
    const techStack: TechStack = {
      frontend: technologies.filter(t => ['react', 'angular', 'vue'].includes(t.name)),
      backend: technologies.filter(t => ['node', 'python', 'java', 'go'].includes(t.name)),
      database: technologies.filter(t => ['postgres', 'mysql', 'mongodb', 'redis'].includes(t.name)),
      infrastructure: technologies.filter(t => t.category === 'cloud' || t.category === 'devops'),
      tools: technologies.filter(t => t.category === 'collaboration' || t.category === 'marketing')
    };

    // Identify new technologies (simplified - would normally compare to historical data)
    const newTechnologies = technologies.filter(t =>
      ['kubernetes', 'terraform', 'snowflake', 'databricks'].includes(t.name)
    );

    // Identify integration needs
    const integrationNeeds: Integration[] = [];
    if (technologies.some(t => t.category === 'crm')) {
      integrationNeeds.push({ name: 'CRM Integration', type: 'data', complexity: 'medium' });
    }
    if (technologies.some(t => t.category === 'erp')) {
      integrationNeeds.push({ name: 'ERP Integration', type: 'system', complexity: 'high' });
    }

    return {
      new_technologies: newTechnologies,
      deprecated_technologies: [],
      technology_stack: techStack,
      integration_needs: integrationNeeds,
      infrastructure_changes: []
    };
  }

  private determineBuyingIndicators(jobData: JobPostingData, technologies: Technology[], analysis: GrowthAnalysis): BuyingIndicators {
    const dept = this.extractDepartment(jobData.title, jobData.description);
    const level = this.extractLevel(jobData.title);

    const indicators: BuyingIndicators = {
      budget_allocation_likely: false,
      procurement_timeline: undefined,
      solution_categories: [] as SolutionCategory[],
      pain_points: [] as PainPoint[],
      decision_makers_hiring: false
    };

    // Budget allocation likelihood
    if (analysis.growth_indicator === 'rapid' || analysis.growth_indicator === 'steady') {
      indicators.budget_allocation_likely = true;
    }

    // Procurement timeline
    if (indicators.budget_allocation_likely) {
      indicators.procurement_timeline = {
        start: new Date(),
        end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months
      };
    }

    // Solution categories based on technologies
    if (technologies.some(t => t.category === 'cloud')) {
      indicators.solution_categories.push({
        name: 'Cloud Infrastructure',
        priority: 'high'
      });
    }
    if (technologies.some(t => t.category === 'data')) {
      indicators.solution_categories.push({
        name: 'Data & Analytics',
        priority: 'high'
      });
    }
    if (technologies.some(t => t.category === 'security')) {
      indicators.solution_categories.push({
        name: 'Security Solutions',
        priority: 'medium'
      });
    }

    // Pain points based on job description patterns
    if (jobData.description?.toLowerCase().includes('scale')) {
      indicators.pain_points.push({
        description: 'Scaling challenges',
        severity: 'high',
        impact_area: 'Infrastructure'
      });
    }
    if (jobData.description?.toLowerCase().includes('automat')) {
      indicators.pain_points.push({
        description: 'Manual processes',
        severity: 'medium',
        impact_area: 'Operations'
      });
    }

    // Decision makers hiring
    if (level === 'Management' && (dept === 'Engineering' || dept === 'Product')) {
      indicators.decision_makers_hiring = true;
    }

    return indicators;
  }

  private calculateConfidenceScore(jobData: JobPostingData): number {
    let confidence = 50; // Base confidence

    // Increase based on data completeness
    if (jobData.title) confidence += 10;
    if (jobData.description?.length > 200) confidence += 10;
    if (jobData.posted_date) confidence += 10;
    if (jobData.url) confidence += 10;
    if (jobData.source_reliability === 'high') confidence += 10;

    return Math.min(100, confidence);
  }

  private createImpactAssessment(jobData: JobPostingData, analysis: GrowthAnalysis, buyingIndicators: BuyingIndicators): ImpactAssessment {
    return {
      revenue_impact: buyingIndicators.budget_allocation_likely ? 500000 : 100000,
      urgency_level: analysis.growth_indicator === 'rapid' ? 8 : 5,
      decision_timeline: '3-6 months',
      budget_implications: buyingIndicators.budget_allocation_likely ?
        'Active budget allocation likely' : 'Budget planning phase',
      strategic_alignment: 75
    };
  }

  private generateRecommendedActions(jobData: JobPostingData, technologies: Technology[], buyingIndicators: BuyingIndicators): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (buyingIndicators.budget_allocation_likely) {
      actions.push({
        action: 'Reach out with relevant solution offerings',
        priority: 'high',
        timeline: '1-2 weeks',
        resources_needed: ['Solution brief', 'ROI calculator']
      });
    }

    if (technologies.length > 5) {
      actions.push({
        action: 'Send technology integration guide',
        priority: 'medium',
        timeline: '2-3 weeks',
        resources_needed: ['Integration documentation', 'Technical whitepaper']
      });
    }

    if (buyingIndicators.decision_makers_hiring) {
      actions.push({
        action: 'Connect with new decision makers once hired',
        priority: 'medium',
        timeline: '4-8 weeks',
        resources_needed: ['Executive brief', 'Industry report']
      });
    }

    return actions;
  }

  private calculateEngagementWindow(jobData: JobPostingData) {
    const postedDate = new Date(jobData.posted_date || Date.now());

    return {
      optimal_start: new Date(postedDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      optimal_end: new Date(postedDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      reason: 'Allow time for hiring and onboarding before engagement'
    };
  }

  private async checkDuplicateJobPosting(companyId: string, jobData: JobPostingData): Promise<boolean> {
    const supabase = await createClient();

    // Check for similar job postings in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from('job_posting_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('job_title', jobData.title)
      .gte('created_at', sevenDaysAgo.toISOString() as { data: Row<'job_posting_signals'>[] | null; error: any });

    return existing && existing.length > 0;
  }

  // Analyze hiring trends over time
  async detectHiringTrends(companyId: string): Promise<HiringTrends | null> {
    const supabase = await createClient();

    const { data: postings } = await supabase
      .from('job_posting_signals')
      .select('*')
      .eq('company_id', companyId)
      .order('posted_date', { ascending: false })
      .limit(100) as { data: Row<'job_posting_signals'>[] | null; error: any };

    if (!postings || postings.length === 0) {
      return null;
    }

    // Analyze trends
    const departmentGrowth: { [key: string]: number } = {};
    const technologyTrends: { [key: string]: number } = {};

    postings.forEach(posting => {
      // Department trends
      const dept = posting.department || 'Unknown';
      departmentGrowth[dept] = (departmentGrowth[dept] || 0) + 1;

      // Technology trends
      posting.technologies_mentioned?.forEach((tech: string) => {
        technologyTrends[tech] = (technologyTrends[tech] || 0) + 1;
      });
    });

    return {
      total_postings: postings.length,
      department_growth: departmentGrowth,
      technology_trends: technologyTrends,
      hiring_velocity: postings.length / 3, // Per month over 3 months
      expansion_signal: postings.length > 10
    };
  }
}

export default JobPostingAnalyzer.getInstance();