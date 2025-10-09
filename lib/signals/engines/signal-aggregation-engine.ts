import { createClient } from '@/lib/supabase/server';
import {
  BuyingSignal,
  SignalAggregation,
  SignalType,
  SignalStrength,
  EngagementPriority,
  SignalAction,
  ActionType,
  SignalAlertConfig
} from '../types/buying-signals';
import fundingDetector from '../detectors/funding-signal-detector';
import executiveDetector from '../detectors/executive-change-detector';
import jobAnalyzer from '../detectors/job-posting-analyzer';
import technologyDetector from '../detectors/technology-adoption-detector';
import type { Row } from '@/lib/supabase/helpers'

export class SignalAggregationEngine {
  private static instance: SignalAggregationEngine;

  // Weights for different signal types in composite scoring
  private readonly signalWeights: { [key: string]: number } = {
    funding_round: 0.25,
    executive_change: 0.20,
    job_posting: 0.15,
    technology_adoption: 0.20,
    expansion: 0.10,
    merger_acquisition: 0.10
  };

  // Signal decay rates (how quickly signals lose relevance)
  private readonly signalDecayRates: { [key: string]: number } = {
    funding_round: 0.95, // Slow decay - funding impacts last months
    executive_change: 0.90, // Moderate decay
    job_posting: 0.85, // Faster decay - positions get filled
    technology_adoption: 0.92, // Moderate decay
    expansion: 0.93, // Slow decay
    merger_acquisition: 0.95 // Slow decay
  };

  private constructor() {}

  static getInstance(): SignalAggregationEngine {
    if (!this.instance) {
      this.instance = new SignalAggregationEngine();
    }
    return this.instance;
  }

  async aggregateSignals(companyId: string): Promise<SignalAggregation | null> {
    const supabase = await createClient();

    try {
      // Fetch all signals for the company
      const { data: signals, error } = await supabase
        .from('buying_signals')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'detected')
        .order('detected_at', { ascending: false }) as { data: Row<'buying_signals'>[] | null; error: any };

      if (error || !signals || signals.length === 0) {
        console.log('No signals found for company:', companyId);
        return null;
      }

      // Calculate aggregate scores
      const compositeScore = this.calculateCompositeScore(signals);
      const intentScore = this.calculateIntentScore(signals);
      const timingScore = this.calculateTimingScore(signals);
      const fitScore = this.calculateFitScore(signals);

      // Count signals by type and strength
      const signalCounts = this.countSignalsByType(signals);
      const strengthDistribution = this.countSignalsByStrength(signals);

      // Calculate velocity metrics
      const velocityMetrics = this.calculateVelocityMetrics(signals);

      // Determine engagement priority and recommendations
      const engagementPriority = this.determineEngagementPriority(
        compositeScore,
        intentScore,
        timingScore
      );

      const recommendations = this.generateRecommendations(
        signals,
        engagementPriority,
        compositeScore
      );

      // Create aggregation record
      const aggregation: SignalAggregation = {
        id: '', // Will be set by database
        company_id: companyId,
        total_signals: signals.length,
        composite_score: compositeScore,
        intent_score: intentScore,
        timing_score: timingScore,
        fit_score: fitScore,
        signal_counts: signalCounts,
        strength_distribution: strengthDistribution,
        most_recent_signal: signals[0].detected_at,
        signal_velocity: velocityMetrics.velocity,
        signal_acceleration: velocityMetrics.acceleration,
        engagement_priority: engagementPriority,
        recommended_approach: recommendations.approach,
        key_talking_points: recommendations.talking_points,
        optimal_contact_date: recommendations.optimal_contact_date,
        calculated_at: new Date().toISOString(),
        next_review_date: this.calculateNextReviewDate(engagementPriority)
      };

      // Store or update aggregation
      const { data: savedAggregation, error: saveError } = await supabase
        .from('signal_aggregations')
        // @ts-ignore - Supabase type inference issue
        .upsert({
          ...aggregation,
          company_id: companyId
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Trigger alerts if thresholds are met
      await this.checkAndTriggerAlerts(savedAggregation, signals);

      return savedAggregation;

    } catch (error) {
      console.error('Error aggregating signals:', error);
      return null;
    }
  }

  private calculateCompositeScore(signals: BuyingSignal[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = this.signalWeights[signal.signal_type] || 0.1;
      const decay = this.calculateDecay(signal);
      const signalScore = (signal.buying_probability || 0) * decay;

      weightedSum += signalScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private calculateIntentScore(signals: BuyingSignal[]): number {
    // Intent is based on signal strength and type
    let intentSum = 0;
    let signalCount = 0;

    for (const signal of signals) {
      let intentMultiplier = 1;

      // Strong buying intent signals
      if (signal.signal_type === 'funding_round') intentMultiplier = 1.5;
      if (signal.signal_type === 'technology_adoption') intentMultiplier = 1.3;
      if (signal.signal_type === 'executive_change') intentMultiplier = 1.2;

      // Adjust for signal strength
      const strengthMultiplier = this.getStrengthMultiplier(signal.signal_strength);

      intentSum += (signal.buying_probability || 0) * intentMultiplier * strengthMultiplier;
      signalCount++;
    }

    return signalCount > 0 ? Math.round(intentSum / signalCount) : 0;
  }

  private calculateTimingScore(signals: BuyingSignal[]): number {
    // Timing is based on signal recency and urgency
    const now = new Date();
    let timingSum = 0;
    let signalCount = 0;

    for (const signal of signals) {
      const signalDate = new Date(signal.detected_at);
      const daysSince = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);

      // Recent signals have higher timing score
      let timingScore = 100;
      if (daysSince > 7) timingScore = 80;
      if (daysSince > 14) timingScore = 60;
      if (daysSince > 30) timingScore = 40;
      if (daysSince > 60) timingScore = 20;

      // Adjust for engagement window
      if (signal.engagement_window) {
        const windowStart = new Date(signal.engagement_window.optimal_start);
        const windowEnd = new Date(signal.engagement_window.optimal_end);

        if (now >= windowStart && now <= windowEnd) {
          timingScore = Math.min(100, timingScore * 1.5);
        }
      }

      timingSum += timingScore;
      signalCount++;
    }

    return signalCount > 0 ? Math.round(timingSum / signalCount) : 0;
  }

  private calculateFitScore(signals: BuyingSignal[]): number {
    // Fit score based on signal relevance and quality
    let fitSum = 0;
    let signalCount = 0;

    for (const signal of signals) {
      let fitScore = signal.confidence_score || 50;

      // Adjust based on signal category relevance
      if (signal.signal_category === 'technology' || signal.signal_category === 'growth') {
        fitScore *= 1.2;
      }

      // Adjust based on source reliability
      if (signal.source_reliability === 'verified') fitScore *= 1.3;
      else if (signal.source_reliability === 'high') fitScore *= 1.1;

      fitSum += Math.min(100, fitScore);
      signalCount++;
    }

    return signalCount > 0 ? Math.round(fitSum / signalCount) : 0;
  }

  private calculateDecay(signal: BuyingSignal): number {
    const now = new Date();
    const signalDate = new Date(signal.detected_at);
    const daysSince = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);

    const decayRate = this.signalDecayRates[signal.signal_type] || 0.9;
    return Math.pow(decayRate, daysSince / 30); // Decay per month
  }

  private getStrengthMultiplier(strength?: SignalStrength): number {
    switch (strength) {
      case 'very_strong': return 1.5;
      case 'strong': return 1.2;
      case 'moderate': return 1.0;
      case 'weak': return 0.7;
      default: return 1.0;
    }
  }

  private countSignalsByType(signals: BuyingSignal[]) {
    const counts = {
      funding_signals: 0,
      executive_signals: 0,
      job_signals: 0,
      technology_signals: 0,
      other_signals: 0
    };

    for (const signal of signals) {
      switch (signal.signal_type) {
        case 'funding_round':
          counts.funding_signals++;
          break;
        case 'executive_change':
          counts.executive_signals++;
          break;
        case 'job_posting':
          counts.job_signals++;
          break;
        case 'technology_adoption':
          counts.technology_signals++;
          break;
        default:
          counts.other_signals++;
      }
    }

    return counts;
  }

  private countSignalsByStrength(signals: BuyingSignal[]) {
    const counts = {
      very_strong: 0,
      strong: 0,
      moderate: 0,
      weak: 0
    };

    for (const signal of signals) {
      const strength = signal.signal_strength || 'moderate';
      counts[strength]++;
    }

    return counts;
  }

  private calculateVelocityMetrics(signals: BuyingSignal[]) {
    // Sort signals by date
    const sortedSignals = [...signals].sort((a, b) =>
      new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()
    );

    // Calculate signals per month
    if (sortedSignals.length < 2) {
      return { velocity: 0, acceleration: 0 };
    }

    const firstSignal = new Date(sortedSignals[0].detected_at);
    const lastSignal = new Date(sortedSignals[sortedSignals.length - 1].detected_at);
    const monthsSpan = (lastSignal.getTime() - firstSignal.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const velocity = monthsSpan > 0 ? signals.length / monthsSpan : signals.length;

    // Calculate acceleration (change in velocity)
    // Compare first half to second half
    const midpoint = Math.floor(signals.length / 2);
    const firstHalfVelocity = midpoint / (monthsSpan / 2);
    const secondHalfVelocity = (signals.length - midpoint) / (monthsSpan / 2);

    const acceleration = secondHalfVelocity - firstHalfVelocity;

    return {
      velocity: Math.round(velocity * 10) / 10,
      acceleration: Math.round(acceleration * 10) / 10
    };
  }

  private determineEngagementPriority(
    compositeScore: number,
    intentScore: number,
    timingScore: number
  ): EngagementPriority {
    const avgScore = (compositeScore + intentScore + timingScore) / 3;

    if (avgScore >= 80 || (timingScore >= 90 && intentScore >= 70)) {
      return 'immediate';
    } else if (avgScore >= 60 || (compositeScore >= 70 && intentScore >= 60)) {
      return 'high';
    } else if (avgScore >= 40) {
      return 'medium';
    } else if (avgScore >= 20) {
      return 'low';
    } else {
      return 'monitor';
    }
  }

  private generateRecommendations(
    signals: BuyingSignal[],
    priority: EngagementPriority,
    compositeScore: number
  ) {
    const recommendations: any = {
      approach: '',
      talking_points: [] as string[],
      optimal_contact_date: new Date()
    };

    // Determine approach based on priority
    switch (priority) {
      case 'immediate':
        recommendations.approach = 'Direct executive outreach with personalized value proposition';
        recommendations.optimal_contact_date = new Date(); // Today
        break;
      case 'high':
        recommendations.approach = 'Targeted campaign with industry-specific messaging';
        recommendations.optimal_contact_date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        break;
      case 'medium':
        recommendations.approach = 'Nurture sequence with educational content';
        recommendations.optimal_contact_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
        break;
      case 'low':
        recommendations.approach = 'Automated marketing touches';
        recommendations.optimal_contact_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
        break;
      default:
        recommendations.approach = 'Continue monitoring for stronger signals';
        recommendations.optimal_contact_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    // Generate talking points based on signals
    const signalTypes = new Set(signals.map(s => s.signal_type));

    if (signalTypes.has('funding_round')) {
      recommendations.talking_points.push(
        'Congratulations on your recent funding round',
        'How to maximize ROI from new capital',
        'Scaling solutions for rapid growth'
      );
    }

    if (signalTypes.has('executive_change')) {
      recommendations.talking_points.push(
        'Support for new leadership initiatives',
        'Quick wins for new executives',
        'Industry best practices and benchmarks'
      );
    }

    if (signalTypes.has('job_posting')) {
      recommendations.talking_points.push(
        'Solutions to support team expansion',
        'Onboarding and productivity tools',
        'Scaling infrastructure for growth'
      );
    }

    if (signalTypes.has('technology_adoption')) {
      recommendations.talking_points.push(
        'Integration and optimization strategies',
        'Complementary technology solutions',
        'Migration and implementation support'
      );
    }

    return recommendations;
  }

  private calculateNextReviewDate(priority: EngagementPriority): string {
    const now = new Date();
    let daysUntilReview = 30;

    switch (priority) {
      case 'immediate':
        daysUntilReview = 3;
        break;
      case 'high':
        daysUntilReview = 7;
        break;
      case 'medium':
        daysUntilReview = 14;
        break;
      case 'low':
        daysUntilReview = 30;
        break;
      default:
        daysUntilReview = 60;
    }

    return new Date(now.getTime() + daysUntilReview * 24 * 60 * 60 * 1000).toISOString();
  }

  private async checkAndTriggerAlerts(
    aggregation: SignalAggregation,
    signals: BuyingSignal[]
  ) {
    const supabase = await createClient();

    // Get active alert configurations
    const { data: alertConfigs } = await supabase
      .from('signal_alert_configs')
      .select('*')
      .eq('is_active', true) as { data: Row<'signal_alert_configs'>[] | null; error: any };

    if (!alertConfigs || alertConfigs.length === 0) return;

    for (const config of alertConfigs) {
      const shouldTrigger = this.evaluateAlertConditions(config, aggregation, signals);

      if (shouldTrigger) {
        await this.triggerAlert(config, aggregation, signals);
      }
    }
  }

  private evaluateAlertConditions(
    config: SignalAlertConfig,
    aggregation: SignalAggregation,
    signals: BuyingSignal[]
  ): boolean {
    // Check composite score threshold
    if (config.minimum_confidence && aggregation.composite_score < config.minimum_confidence) {
      return false;
    }

    // Check buying probability threshold
    if (config.minimum_buying_probability) {
      const avgProbability = signals.reduce((sum, s) => sum + (s.buying_probability || 0), 0) / signals.length;
      if (avgProbability < config.minimum_buying_probability) {
        return false;
      }
    }

    // Check signal types
    if (config.signal_types && config.signal_types.length > 0) {
      const hasRequiredType = signals.some(s => config.signal_types?.includes(s.signal_type));
      if (!hasRequiredType) return false;
    }

    // Check minimum strength
    if (config.minimum_strength) {
      const hasRequiredStrength = signals.some(s =>
        this.compareStrength(s.signal_strength, config.minimum_strength)
      );
      if (!hasRequiredStrength) return false;
    }

    return true;
  }

  private compareStrength(actual?: SignalStrength, minimum?: SignalStrength): boolean {
    const strengthOrder = ['weak', 'moderate', 'strong', 'very_strong'];
    const actualIndex = strengthOrder.indexOf(actual || 'weak');
    const minimumIndex = strengthOrder.indexOf(minimum || 'weak');
    return actualIndex >= minimumIndex;
  }

  private async triggerAlert(
    config: SignalAlertConfig,
    aggregation: SignalAggregation,
    signals: BuyingSignal[]
  ) {
    const supabase = await createClient();

    // Create alert record
    const alert = {
      config_id: config.id,
      company_id: aggregation.company_id,
      triggered_at: new Date().toISOString(),
      aggregation_data: aggregation,
      signals_data: signals,
      status: 'triggered'
    };
// @ts-ignore - Supabase type inference issue

    await supabase.from('threshold_alerts').insert(alert);

    // Execute alert actions based on channels
    if (config.alert_channels.includes('in_app')) {
      await this.createInAppNotification(config, aggregation);
    }

    if (config.email_enabled) {
      await this.sendEmailAlert(config, aggregation);
    }

    if (config.slack_enabled) {
      await this.sendSlackAlert(config, aggregation);
    }

    if (config.webhook_url) {
      await this.sendWebhookAlert(config, aggregation, signals);
    }
  }

  private async createInAppNotification(config: SignalAlertConfig, aggregation: SignalAggregation) {
    // @ts-ignore - Supabase type inference issue
    const supabase = await createClient();

    await supabase.from('notifications').insert({
      user_id: config.user_id,
      type: 'signal_alert',
      title: `High-priority buying signals detected`,
      message: `Company has ${aggregation.total_signals} signals with ${aggregation.engagement_priority} priority`,
      metadata: {
        company_id: aggregation.company_id,
        composite_score: aggregation.composite_score,
        priority: aggregation.engagement_priority
      }
    });
  }

  private async sendEmailAlert(config: SignalAlertConfig, aggregation: SignalAggregation) {
    // Integration with email service (Resend, SendGrid, etc.)
    console.log('Email alert would be sent for:', aggregation.company_id);
  }

  private async sendSlackAlert(config: SignalAlertConfig, aggregation: SignalAggregation) {
    // Integration with Slack webhook
    console.log('Slack alert would be sent for:', aggregation.company_id);
  }

  private async sendWebhookAlert(
    config: SignalAlertConfig,
    aggregation: SignalAggregation,
    signals: BuyingSignal[]
  ) {
    // Send to custom webhook
    try {
      await fetch(config.webhook_url!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'buying_signals',
          company_id: aggregation.company_id,
          aggregation,
          signals: signals.slice(0, 5) // Send top 5 signals
        })
      });
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  // Create an action for a signal
  async createSignalAction(
    signalId: string,
    actionType: ActionType,
    executedBy?: string
  ): Promise<SignalAction | null> {
    const supabase = await createClient();

    try {
      const action: Partial<SignalAction> = {
        signal_id: signalId,
        action_type: actionType,
        action_status: 'pending',
        executed_by: executedBy,
        created_at: new Date().toISOString()
      };
// @ts-ignore - Supabase type inference issue

      const { data, error } = await supabase
        .from('signal_actions')
        .insert(action)
        .select()
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error('Error creating signal action:', error);
      return null;
    }
  }

  // Monitor all companies for new signals
  async monitorAllCompanies(): Promise<void> {
    const supabase = await createClient();

    try {
      // Get all active companies
      const { data: companies } = await supabase
        .from('businesses')
        .select('id')
        .eq('status', 'active')
        .limit(100) as { data: Row<'businesses'>[] | null; error: any };

      if (!companies) return;

      // Process each company
      for (const company of companies) {
        await this.monitorCompanySignals(company.id);
      }

    } catch (error) {
      console.error('Error monitoring companies:', error);
    }
  }

  private async monitorCompanySignals(companyId: string): Promise<void> {
    // This would be called by a scheduled job to detect new signals

    // Check for funding signals
    await fundingDetector.monitorCompaniesForFunding([companyId]);

    // Check for executive changes
    // await executiveDetector.monitorCompanyExecutives(companyId);

    // Check for job postings
    // await jobAnalyzer.monitorCompanyJobs(companyId);

    // Check for technology changes
    // await technologyDetector.scanForTechnologyChanges(companyId);

    // Aggregate all signals
    await this.aggregateSignals(companyId);
  }
}

export default SignalAggregationEngine.getInstance();