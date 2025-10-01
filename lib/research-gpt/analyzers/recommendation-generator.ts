/**
 * Recommendation Generator for ResearchGPT™
 *
 * Uses OpenRouter GPT-4 to generate personalized outreach recommendations:
 * - Analyzes buying signals, decision makers, and financial health
 * - Generates tailored outreach strategy
 * - Suggests talking points and value propositions
 * - Identifies optimal timing for engagement
 * - Provides email templates and conversation starters
 *
 * AI Model: GPT-4 via OpenRouter (best reasoning for strategic recommendations)
 */

import type {
  RecommendedApproach,
  ConfidenceLevel,
  CompanySnapshot,
} from '@/types/research-gpt';
import type { AnalyzedSignals } from './signals-analyzer';
import type { AnalyzedDecisionMakers } from './decision-maker-analyzer';
import type { AnalyzedRevenueSignals } from './revenue-analyzer';

// ============================================================================
// TYPES
// ============================================================================

interface RecommendationInput {
  snapshot: CompanySnapshot;
  signals: AnalyzedSignals;
  decision_makers: AnalyzedDecisionMakers;
  revenue_signals: AnalyzedRevenueSignals;
  user_context?: string; // Optional context about user's business
  focus_areas?: string[]; // Optional focus areas
}

// ============================================================================
// RECOMMENDATION GENERATOR
// ============================================================================

export class RecommendationGenerator {
  private apiKey: string;
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'openai/gpt-4-turbo'; // Best for strategic reasoning

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';

    if (!this.apiKey) {
      console.warn('OpenRouter API key not configured');
    }
  }

  /**
   * Generate personalized outreach recommendations using AI
   */
  async generate(input: RecommendationInput): Promise<{
    recommendations: RecommendedApproach;
    confidence: ConfidenceLevel;
  }> {
    const startTime = Date.now();

    try {
      console.log(`[RecommendationGenerator] Generating AI recommendations for ${input.snapshot.company_name}...`);

      // Build context for AI
      const context = this.buildContext(input);

      // Generate recommendations via GPT-4
      const aiResponse = await this.callOpenRouter(context, input);

      // Parse and structure recommendations
      const recommendations = this.parseRecommendations(aiResponse, input);

      // Calculate confidence
      const confidence = this.calculateConfidence(recommendations, input);

      const duration = Date.now() - startTime;
      console.log(`[RecommendationGenerator] Completed in ${duration}ms with ${confidence} confidence`);

      return {
        recommendations,
        confidence,
      };
    } catch (error) {
      console.error('[RecommendationGenerator] Error:', error);

      // Fallback to rule-based recommendations if AI fails
      return this.generateFallbackRecommendations(input);
    }
  }

  // ============================================================================
  // CONTEXT BUILDING
  // ============================================================================

  /**
   * Build rich context for AI recommendation generation
   */
  private buildContext(input: RecommendationInput): string {
    const parts: string[] = [];

    // Company overview
    parts.push('## Company Overview');
    parts.push(`Company: ${input.snapshot.company_name}`);
    if (input.snapshot.industry) parts.push(`Industry: ${input.snapshot.industry}`);
    if (input.snapshot.employee_count) parts.push(`Employees: ~${input.snapshot.employee_count}`);
    if (input.snapshot.description) parts.push(`Description: ${input.snapshot.description}`);

    // Buying signals
    parts.push('\n## Buying Signals');
    const topSignals = input.signals.all_signals.slice(0, 5);
    if (topSignals.length > 0) {
      for (const signal of topSignals) {
        parts.push(`- ${signal.title} (${signal.category}, ${signal.urgency || 'medium'} urgency)`);
      }
    } else {
      parts.push('- No significant buying signals detected');
    }

    // Decision makers
    parts.push('\n## Key Decision Makers');
    const topDMs = input.decision_makers.all_decision_makers.slice(0, 3);
    if (topDMs.length > 0) {
      for (const dm of topDMs) {
        const contact = dm.business_email ? ' (contactable)' : '';
        parts.push(`- ${dm.name}, ${dm.job_title}${contact}`);
      }
    } else {
      parts.push('- No decision makers identified');
    }

    // Financial health
    parts.push('\n## Financial Health');
    const financial = input.revenue_signals.financial_summary;
    parts.push(`- Health Score: ${(financial.health_score * 100).toFixed(0)}%`);
    parts.push(`- Growth: ${financial.growth_indicator}`);
    parts.push(`- Budget Availability: ${financial.budget_availability}`);
    parts.push(`- Risk Level: ${financial.risk_level}`);

    // User context (if provided)
    if (input.user_context) {
      parts.push('\n## Your Business Context');
      parts.push(input.user_context);
    }

    return parts.join('\n');
  }

  // ============================================================================
  // AI GENERATION
  // ============================================================================

  /**
   * Call OpenRouter API for AI-generated recommendations
   */
  private async callOpenRouter(context: string, input: RecommendationInput): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const systemPrompt = `You are an expert B2B sales strategist helping sales teams identify the best approach to engage with potential customers.

Analyze the provided company research and generate a comprehensive outreach strategy with:
1. Overall Strategy: What's the best approach based on their current situation?
2. Timing: When should they reach out and why?
3. Talking Points: 3-5 specific points to mention in conversations
4. Value Proposition: How to position your solution
5. Recommended Approach: Email, LinkedIn, phone, or multi-channel?
6. Next Steps: Concrete action items

Be specific, actionable, and data-driven. Reference the signals and decision makers provided.`;

    const userPrompt = `${context}

Based on this research, provide a detailed outreach strategy in the following JSON format:

{
  "strategy": "2-3 sentence overall strategy",
  "timing": "When to reach out and why",
  "talking_points": ["point 1", "point 2", "point 3"],
  "value_proposition": "How to position the solution",
  "recommended_channels": ["channel1", "channel2"],
  "urgency_level": "high|medium|low",
  "success_probability": 0.0-1.0,
  "next_steps": ["step 1", "step 2", "step 3"]
}`;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oppspot.ai',
        'X-Title': 'ResearchGPT',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // ============================================================================
  // RESPONSE PARSING
  // ============================================================================

  /**
   * Parse AI response into structured recommendations
   */
  private parseRecommendations(aiResponse: string, input: RecommendationInput): RecommendedApproach {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          strategy: parsed.strategy || this.generateDefaultStrategy(input),
          timing: parsed.timing || this.generateDefaultTiming(input),
          talking_points: Array.isArray(parsed.talking_points)
            ? parsed.talking_points.slice(0, 5)
            : this.generateDefaultTalkingPoints(input),
          value_proposition: parsed.value_proposition || this.generateDefaultValueProp(input),
          recommended_channels: Array.isArray(parsed.recommended_channels)
            ? parsed.recommended_channels
            : ['email', 'linkedin'],
          urgency_level: parsed.urgency_level || this.calculateUrgency(input),
          success_probability: parsed.success_probability || this.calculateSuccessProbability(input),
          key_contacts: this.identifyKeyContacts(input),
          objections_to_address: this.identifyObjections(input),
          next_steps: Array.isArray(parsed.next_steps)
            ? parsed.next_steps
            : this.generateNextSteps(input),
          generated_at: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('[RecommendationGenerator] Failed to parse AI response, using fallback');
    }

    // Fallback to rule-based recommendations
    return this.generateFallbackRecommendations(input).recommendations;
  }

  // ============================================================================
  // FALLBACK RECOMMENDATIONS (Rule-based)
  // ============================================================================

  /**
   * Generate fallback recommendations if AI fails
   */
  private generateFallbackRecommendations(input: RecommendationInput): {
    recommendations: RecommendedApproach;
    confidence: ConfidenceLevel;
  } {
    return {
      recommendations: {
        strategy: this.generateDefaultStrategy(input),
        timing: this.generateDefaultTiming(input),
        talking_points: this.generateDefaultTalkingPoints(input),
        value_proposition: this.generateDefaultValueProp(input),
        recommended_channels: this.determineChannels(input),
        urgency_level: this.calculateUrgency(input),
        success_probability: this.calculateSuccessProbability(input),
        key_contacts: this.identifyKeyContacts(input),
        objections_to_address: this.identifyObjections(input),
        next_steps: this.generateNextSteps(input),
        generated_at: new Date().toISOString(),
      },
      confidence: 'medium',
    };
  }

  private generateDefaultStrategy(input: RecommendationInput): string {
    const { signals, revenue_signals } = input;

    if (signals.summary.urgency_score >= 0.7) {
      return `High-priority opportunity. Multiple strong buying signals indicate active interest. Reach out immediately with a personalized approach focusing on their current initiatives.`;
    }

    if (revenue_signals.financial_summary.budget_availability === 'high') {
      return `Well-funded company with available budget. Position solution as growth enabler. Multi-touch campaign with focus on ROI and strategic value.`;
    }

    return `Moderate-priority opportunity. Build relationship through value-first approach. Focus on education and thought leadership before direct pitch.`;
  }

  private generateDefaultTiming(input: RecommendationInput): string {
    const urgency = this.calculateUrgency(input);

    if (urgency === 'high') {
      return 'Reach out within 24-48 hours. Recent signals indicate immediate opportunity.';
    }

    if (urgency === 'medium') {
      return 'Reach out within 1-2 weeks. Allow time for personalized research and preparation.';
    }

    return 'Reach out when you have clear value to offer. Build relationship over time.';
  }

  private generateDefaultTalkingPoints(input: RecommendationInput): string[] {
    const points: string[] = [];

    // Add talking points based on signals
    const topSignals = input.signals.all_signals.slice(0, 3);
    for (const signal of topSignals) {
      if (signal.signal_type === 'funding') {
        points.push(`Congratulations on your recent funding round - how are you planning to deploy the capital?`);
      } else if (signal.signal_type === 'hiring') {
        points.push(`I noticed you're expanding your team. How are you scaling operations?`);
      } else if (signal.signal_type === 'leadership_change') {
        points.push(`Welcome to your new role! What are your priorities for the first 90 days?`);
      } else if (signal.signal_type === 'product_launch') {
        points.push(`Congratulations on the product launch. What feedback are you hearing from customers?`);
      }
    }

    // Add industry-specific points
    if (input.snapshot.industry) {
      points.push(`I've been following trends in ${input.snapshot.industry}. What challenges are you facing?`);
    }

    // Default fallback
    if (points.length === 0) {
      points.push(`I'd love to learn more about your current priorities and challenges.`);
    }

    return points.slice(0, 5);
  }

  private generateDefaultValueProp(input: RecommendationInput): string {
    if (input.user_context) {
      return `Position your solution as directly addressing their current initiatives mentioned in recent signals.`;
    }

    return `Focus on ROI, efficiency gains, and alignment with their growth trajectory.`;
  }

  private determineChannels(input: RecommendationInput): string[] {
    const channels: string[] = [];

    // Check if we have contact info
    const hasEmail = input.decision_makers.all_decision_makers.some((dm) => dm.business_email);
    const hasLinkedIn = input.decision_makers.all_decision_makers.some((dm) => dm.linkedin_url);

    if (hasEmail) channels.push('email');
    if (hasLinkedIn) channels.push('linkedin');

    // High urgency = multi-channel
    if (this.calculateUrgency(input) === 'high' && channels.length > 1) {
      channels.push('phone');
    }

    return channels.length > 0 ? channels : ['linkedin', 'email'];
  }

  private calculateUrgency(input: RecommendationInput): 'high' | 'medium' | 'low' {
    const urgencyScore = input.signals.summary.urgency_score;

    if (urgencyScore >= 0.7) return 'high';
    if (urgencyScore >= 0.4) return 'medium';
    return 'low';
  }

  private calculateSuccessProbability(input: RecommendationInput): number {
    let score = 0.5; // Base 50%

    // Boost for strong signals
    if (input.signals.summary.urgency_score >= 0.7) score += 0.2;

    // Boost for contact availability
    if (input.decision_makers.summary.with_contact_info > 0) score += 0.1;

    // Boost for budget availability
    if (input.revenue_signals.financial_summary.budget_availability === 'high') score += 0.15;

    // Reduce for risk
    if (input.revenue_signals.financial_summary.risk_level === 'high') score -= 0.2;

    return Math.max(0.1, Math.min(0.95, score));
  }

  private identifyKeyContacts(input: RecommendationInput): string[] {
    const contacts = input.decision_makers.all_decision_makers
      .filter((dm) => dm.priority_level === 'p0' || dm.priority_level === 'p1')
      .slice(0, 3)
      .map((dm) => `${dm.name} (${dm.job_title})`);

    return contacts.length > 0 ? contacts : ['No specific contacts identified'];
  }

  private identifyObjections(input: RecommendationInput): string[] {
    const objections: string[] = [];

    if (input.revenue_signals.financial_summary.budget_availability === 'low') {
      objections.push('Budget constraints - emphasize ROI and quick payback');
    }

    if (input.revenue_signals.financial_summary.risk_level === 'high') {
      objections.push('Financial risk - focus on low-risk, high-value quick wins');
    }

    if (input.signals.all_signals.length === 0) {
      objections.push('No clear pain points - focus on discovery and education');
    }

    return objections.length > 0 ? objections : ['No major objections anticipated'];
  }

  private generateNextSteps(input: RecommendationInput): string[] {
    const steps: string[] = [];

    const topContacts = input.decision_makers.all_decision_makers.slice(0, 2);

    if (topContacts.length > 0 && topContacts[0].business_email) {
      steps.push(`Send personalized email to ${topContacts[0].name} referencing recent signals`);
    } else if (topContacts.length > 0 && topContacts[0].linkedin_url) {
      steps.push(`Connect with ${topContacts[0].name} on LinkedIn with personalized message`);
    } else {
      steps.push('Research decision makers on LinkedIn to find contact information');
    }

    if (input.signals.all_signals.length > 0) {
      steps.push('Reference specific recent activity in your outreach');
    }

    steps.push('Follow up after 3-5 business days if no response');
    steps.push('Track engagement and adjust messaging based on response');

    return steps;
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  private calculateConfidence(
    recommendations: RecommendedApproach,
    input: RecommendationInput
  ): ConfidenceLevel {
    let score = 0;
    let maxScore = 10;

    // Data quality
    if (input.signals.all_signals.length >= 5) score += 2;
    if (input.decision_makers.all_decision_makers.length >= 3) score += 2;
    if (input.revenue_signals.all_signals.length >= 2) score += 1;

    // Contact availability
    if (input.decision_makers.summary.with_contact_info >= 2) score += 2;
    else if (input.decision_makers.summary.with_contact_info >= 1) score += 1;

    // Signal quality
    if (input.signals.summary.urgency_score >= 0.7) score += 1;
    if (input.signals.summary.recency_score >= 0.7) score += 1;

    // Financial clarity
    if (input.revenue_signals.financial_summary.budget_availability !== 'unknown') score += 1;

    const percentage = score / maxScore;

    if (percentage >= 0.7) return 'high';
    if (percentage >= 0.4) return 'medium';
    return 'low';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: RecommendationGenerator | null = null;

export function getRecommendationGenerator(): RecommendationGenerator {
  if (!instance) {
    instance = new RecommendationGenerator();
  }
  return instance;
}

export default RecommendationGenerator;
