/**
 * Insight Generator Service
 * AI-powered analysis of stream progress with actionable recommendations
 */

import { createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/openrouter'
import { Stream, StreamInsight, InsightType, InsightSeverity, GoalStatus } from '@/types/streams'
import type { Row } from '@/lib/supabase/helpers'

export interface StreamAnalysis {
  stream: Stream
  progress: {
    completed: number
    total: number
    percentage: number
    quality_score: number
    items_by_stage: Record<string, number>
  }
  agentPerformance: Array<{
    agent_name: string
    agent_type: string
    total_executions: number
    success_rate: number
    avg_quality_score: number
  }>
  timeline: {
    days_elapsed: number
    days_remaining: number | null
    completion_rate_per_day: number
  }
}

export interface GeneratedInsight {
  insight_type: InsightType
  title: string
  description: string
  severity: InsightSeverity
  is_actionable: boolean
  data: Record<string, any>
}

export class InsightGenerator {
  /**
   * Analyze stream and generate AI-powered insights
   */
  static async generateInsights(
    streamId: string,
    executionId?: string
  ): Promise<GeneratedInsight[]> {
    const supabase = await createClient()
    const insights: GeneratedInsight[] = []

    // 1. Fetch stream analysis data
    const analysis = await this.analyzeStream(streamId)

    // 2. Generate insights based on different aspects
    insights.push(...await this.analyzeProgress(analysis))
    insights.push(...await this.analyzeQuality(analysis))
    insights.push(...await this.analyzeRisks(analysis))
    insights.push(...await this.analyzeOptimizations(analysis))

    // 3. Save insights to database
    for (const insight of insights) {
      await this.saveInsight(streamId, insight, executionId)
    }

    return insights
  }

  /**
   * Analyze stream data and compile metrics
   */
  private static async analyzeStream(streamId: string): Promise<StreamAnalysis> {
    const supabase = await createClient()

    // Fetch stream
    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single() as { data: (Row<'streams'> & {
        target_metrics?: { companies_to_find?: number }
        goal_deadline?: string
      }) | null; error: any }

    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`)
    }

    // Fetch items for progress calculation
    const { data: items = [] } = await supabase
      .from('stream_items')
      .select('id, status, stage_id, metadata')
      .eq('stream_id', streamId) as { data: (Row<'stream_items'> & { status?: string })[] | null; error: any }

    // Calculate progress
    const total = stream.target_metrics?.companies_to_find || items.length
    const completed = items.filter(item => item.status === 'completed').length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    // Calculate items by stage
    const items_by_stage: Record<string, number> = {}
    items.forEach(item => {
      if (item.stage_id) {
        items_by_stage[item.stage_id] = (items_by_stage[item.stage_id] || 0) + 1
      }
    })

    // Calculate quality score
    let totalQualityScore = 0
    let qualityCount = 0
    items.forEach(item => {
      if (item.metadata && typeof item.metadata === 'object') {
        const metadata = item.metadata as Record<string, any>
        if (typeof metadata.quality_score === 'number') {
          totalQualityScore += metadata.quality_score
          qualityCount++
        }
      }
    })
    const quality_score = qualityCount > 0 ? totalQualityScore / qualityCount : 0

    // Fetch agent performance
    const { data: agentAssignments = [] } = await supabase
      .from('stream_agent_assignments')
      .select(`
        *,
        agent:agent_id(id, name, agent_type) as { data: Row<'stream_agent_assignments'>[] | null; error: any }
      `)
      .eq('stream_id', streamId)

    const agentPerformance = agentAssignments
      .filter((a: any) => a.agent)
      .map((a: any) => ({
        agent_name: a.agent.name || 'Unknown',
        agent_type: a.agent.agent_type || 'unknown',
        total_executions: a.total_executions || 0,
        success_rate: a.total_executions > 0
          ? Math.round((a.successful_executions / a.total_executions) * 100)
          : 0,
        avg_quality_score: quality_score // Simplified - could track per agent
      }))

    // Calculate timeline
    const createdAt = new Date(stream.created_at)
    const now = new Date()
    const days_elapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    let days_remaining = null
    if (stream.goal_deadline) {
      const deadline = new Date(stream.goal_deadline)
      days_remaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    const completion_rate_per_day = days_elapsed > 0 ? completed / days_elapsed : 0

    return {
      stream: stream as Stream,
      progress: {
        completed,
        total,
        percentage,
        quality_score,
        items_by_stage
      },
      agentPerformance,
      timeline: {
        days_elapsed,
        days_remaining,
        completion_rate_per_day
      }
    }
  }

  /**
   * Analyze progress and generate insights
   */
  private static async analyzeProgress(analysis: StreamAnalysis): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = []
    const { progress, timeline, stream } = analysis

    // Progress milestone insights
    if (progress.percentage === 25) {
      insights.push({
        insight_type: 'milestone_achieved',
        title: '25% Milestone Reached! 🎉',
        description: `You've completed ${progress.completed} of ${progress.total} items. Great start on your goal!`,
        severity: 'success',
        is_actionable: false,
        data: { milestone: 25, completed: progress.completed, total: progress.total }
      })
    } else if (progress.percentage === 50) {
      insights.push({
        insight_type: 'milestone_achieved',
        title: 'Halfway There! 🚀',
        description: `You've reached 50% completion with ${progress.completed} items. Keep up the momentum!`,
        severity: 'success',
        is_actionable: false,
        data: { milestone: 50, completed: progress.completed, total: progress.total }
      })
    } else if (progress.percentage === 75) {
      insights.push({
        insight_type: 'milestone_achieved',
        title: '75% Complete - Almost There! ⭐',
        description: `Just ${progress.total - progress.completed} more items to reach your goal!`,
        severity: 'success',
        is_actionable: false,
        data: { milestone: 75, completed: progress.completed, remaining: progress.total - progress.completed }
      })
    } else if (progress.percentage >= 100) {
      insights.push({
        insight_type: 'milestone_achieved',
        title: 'Goal Completed! 🎯',
        description: `Congratulations! You've successfully found ${progress.completed} companies matching your criteria.`,
        severity: 'success',
        is_actionable: false,
        data: { milestone: 100, completed: progress.completed }
      })
    }

    // Progress rate insights
    if (timeline.days_elapsed >= 3 && progress.percentage > 0) {
      const ratePerDay = timeline.completion_rate_per_day.toFixed(1)

      if (timeline.days_remaining) {
        const projectedCompletion = progress.completed + (timeline.completion_rate_per_day * timeline.days_remaining)
        const projectedPercentage = (projectedCompletion / progress.total) * 100

        if (projectedPercentage >= 100) {
          insights.push({
            insight_type: 'progress_update',
            title: 'On Track to Meet Goal ✅',
            description: `At current pace (${ratePerDay} items/day), you'll reach your goal ${Math.floor((projectedPercentage - 100) / 100 * timeline.days_remaining)} days early.`,
            severity: 'success',
            is_actionable: false,
            data: {
              completion_rate: timeline.completion_rate_per_day,
              projected_completion: projectedCompletion,
              days_ahead: Math.floor((projectedPercentage - 100) / 100 * timeline.days_remaining)
            }
          })
        } else if (projectedPercentage < 80) {
          insights.push({
            insight_type: 'recommendation',
            title: 'Acceleration Needed',
            description: `Current pace may not meet deadline. Consider adding more agents or adjusting search criteria to increase discovery rate.`,
            severity: 'warning',
            is_actionable: true,
            data: {
              completion_rate: timeline.completion_rate_per_day,
              projected_completion: projectedCompletion,
              shortfall: progress.total - projectedCompletion
            }
          })
        }
      }
    }

    return insights
  }

  /**
   * Analyze quality and generate insights
   */
  private static async analyzeQuality(analysis: StreamAnalysis): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = []
    const { progress, stream } = analysis

    const targetQuality = stream.target_metrics?.min_quality_score || 3.0

    if (progress.quality_score >= targetQuality + 1) {
      insights.push({
        insight_type: 'quality_assessment',
        title: 'Excellent Quality Results! ⭐',
        description: `Average quality score of ${progress.quality_score.toFixed(1)}/5 exceeds your target of ${targetQuality}/5. Your agents are finding great matches!`,
        severity: 'success',
        is_actionable: false,
        data: {
          avg_quality: progress.quality_score,
          target_quality: targetQuality,
          exceeds_by: progress.quality_score - targetQuality
        }
      })
    } else if (progress.quality_score < targetQuality - 0.5 && progress.completed >= 10) {
      insights.push({
        insight_type: 'recommendation',
        title: 'Quality Below Target',
        description: `Average quality score (${progress.quality_score.toFixed(1)}/5) is below target (${targetQuality}/5). Consider refining your search criteria or adding scoring/enrichment agents.`,
        severity: 'warning',
        is_actionable: true,
        data: {
          avg_quality: progress.quality_score,
          target_quality: targetQuality,
          quality_gap: targetQuality - progress.quality_score
        }
      })
    }

    // Quality trend analysis (requires historical data - simplified version)
    if (progress.completed >= 20) {
      insights.push({
        insight_type: 'quality_assessment',
        title: 'Quality Stabilizing',
        description: `With ${progress.completed} items analyzed, your quality score has stabilized at ${progress.quality_score.toFixed(1)}/5.`,
        severity: 'info',
        is_actionable: false,
        data: {
          items_analyzed: progress.completed,
          quality_score: progress.quality_score
        }
      })
    }

    return insights
  }

  /**
   * Analyze risks and generate alerts
   */
  private static async analyzeRisks(analysis: StreamAnalysis): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = []
    const { progress, timeline, stream } = analysis

    // Deadline risk
    if (timeline.days_remaining && timeline.days_remaining > 0) {
      const requiredDailyRate = (progress.total - progress.completed) / timeline.days_remaining

      if (timeline.completion_rate_per_day > 0 && timeline.completion_rate_per_day < requiredDailyRate * 0.7) {
        insights.push({
          insight_type: 'risk_alert',
          title: 'Goal At Risk ⚠️',
          description: `Only ${timeline.days_remaining} days remaining. Need ${requiredDailyRate.toFixed(1)} items/day, but current rate is ${timeline.completion_rate_per_day.toFixed(1)}/day.`,
          severity: 'critical',
          is_actionable: true,
          data: {
            days_remaining: timeline.days_remaining,
            required_rate: requiredDailyRate,
            current_rate: timeline.completion_rate_per_day,
            items_remaining: progress.total - progress.completed
          }
        })
      } else if (timeline.days_remaining <= 7 && progress.percentage < 50) {
        insights.push({
          insight_type: 'risk_alert',
          title: 'Deadline Approaching',
          description: `Only ${timeline.days_remaining} days left with ${progress.percentage}% completion. Consider extending deadline or adjusting target.`,
          severity: 'warning',
          is_actionable: true,
          data: {
            days_remaining: timeline.days_remaining,
            percentage: progress.percentage
          }
        })
      }
    }

    // Agent performance risk
    const failingAgents = analysis.agentPerformance.filter(a => a.success_rate < 50 && a.total_executions >= 3)
    if (failingAgents.length > 0) {
      insights.push({
        insight_type: 'risk_alert',
        title: 'Agent Performance Issues',
        description: `${failingAgents.map(a => a.agent_name).join(', ')} showing low success rate. Check configuration or review errors.`,
        severity: 'warning',
        is_actionable: true,
        data: {
          failing_agents: failingAgents.map(a => ({ name: a.agent_name, success_rate: a.success_rate }))
        }
      })
    }

    return insights
  }

  /**
   * Analyze optimizations and generate suggestions
   */
  private static async analyzeOptimizations(analysis: StreamAnalysis): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = []
    const { progress, agentPerformance, stream } = analysis

    // Suggest adding agents if none are configured
    if (agentPerformance.length === 0 && progress.completed < 10) {
      insights.push({
        insight_type: 'recommendation',
        title: 'Add AI Agents for Automation',
        description: 'No agents configured. Add OpportunityBot to automatically discover companies matching your criteria.',
        severity: 'info',
        is_actionable: true,
        data: {
          suggested_agents: ['OpportunityBot', 'ScoringAgent']
        }
      })
    }

    // Suggest enrichment if quality is good but basic
    if (progress.quality_score >= 3.5 && progress.completed >= 15) {
      const hasEnrichmentAgent = agentPerformance.some(a => a.agent_type === 'enrichment_agent')
      if (!hasEnrichmentAgent) {
        insights.push({
          insight_type: 'optimization_suggestion',
          title: 'Enhance Data Quality',
          description: 'Your results are good! Add an Enrichment Agent to gather more detailed company information.',
          severity: 'info',
          is_actionable: true,
          data: {
            current_quality: progress.quality_score,
            suggested_agent: 'EnrichmentAgent'
          }
        })
      }
    }

    // Stage optimization
    const stageKeys = Object.keys(progress.items_by_stage)
    if (stageKeys.length > 0) {
      const maxStageCount = Math.max(...Object.values(progress.items_by_stage))
      const maxStage = stageKeys.find(key => progress.items_by_stage[key] === maxStageCount)

      if (maxStage && maxStageCount > progress.completed * 0.7) {
        const stageName = stream.stages.find(s => s.id === maxStage)?.name || maxStage
        insights.push({
          insight_type: 'optimization_suggestion',
          title: 'Workflow Bottleneck Detected',
          description: `${maxStageCount} items in "${stageName}" stage. Consider moving items forward or adding automation.`,
          severity: 'info',
          is_actionable: true,
          data: {
            stage_name: stageName,
            item_count: maxStageCount,
            percentage: Math.round((maxStageCount / progress.completed) * 100)
          }
        })
      }
    }

    return insights
  }

  /**
   * Save insight to database
   */
  private static async saveInsight(
    streamId: string,
    insight: GeneratedInsight,
    executionId?: string
  ): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('stream_insights')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        stream_id: streamId,
        insight_type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        is_actionable: insight.is_actionable,
        data: insight.data,
        generated_by: 'system',
        agent_execution_id: executionId || null
      })
      .select('id')
      .single() as { data: { id: string } | null; error: any }

    if (error) {
      console.error('[InsightGenerator] Error saving insight:', error)
      throw error
    }

    return data!.id
  }

  /**
   * Generate AI-enhanced insight using OpenRouter
   * (Optional enhancement - uses AI to refine insights)
   */
  static async generateAIInsight(
    streamId: string,
    analysisData: StreamAnalysis
  ): Promise<string> {
    const ai = getAIClient()

    const prompt = `Analyze this business intelligence stream and provide a strategic insight:

Stream Goal: ${analysisData.stream.name}
Progress: ${analysisData.progress.percentage}% (${analysisData.progress.completed}/${analysisData.progress.total} items)
Quality Score: ${analysisData.progress.quality_score.toFixed(1)}/5
Days Elapsed: ${analysisData.timeline.days_elapsed}
Days Remaining: ${analysisData.timeline.days_remaining || 'No deadline'}
Completion Rate: ${analysisData.timeline.completion_rate_per_day.toFixed(1)} items/day

Agent Performance:
${analysisData.agentPerformance.map(a =>
  `- ${a.agent_name}: ${a.total_executions} runs, ${a.success_rate}% success`
).join('\n')}

Provide a strategic insight or recommendation in 1-2 sentences that would help the user achieve their goal more effectively.`

    const response = await ai.fastComplete(prompt, {
      max_tokens: 150,
      temperature: 0.7
    })

    return response.trim()
  }
}
