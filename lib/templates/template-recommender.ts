/**
 * Template Recommendation Engine
 * AI-powered template suggestions based on user profile and context
 */

import { ExtendedGoalTemplate, ALL_TEMPLATES } from './template-library'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export interface RecommendationContext {
  userId: string
  orgId?: string
  industry?: string
  previousStreamTypes?: string[]
  teamSize?: number
  goals?: string[]
}

export interface TemplateRecommendation {
  template: ExtendedGoalTemplate
  score: number
  reasons: string[]
}

export class TemplateRecommender {
  /**
   * Get personalized template recommendations
   */
  static async getRecommendations(
    context: RecommendationContext,
    limit: number = 5
  ): Promise<TemplateRecommendation[]> {
    const recommendations: TemplateRecommendation[] = []

    for (const template of ALL_TEMPLATES) {
      const { score, reasons } = await this.scoreTemplate(template, context)
      recommendations.push({ template, score, reasons })
    }

    // Sort by score (highest first) and return top N
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Score a template based on user context
   */
  private static async scoreTemplate(
    template: ExtendedGoalTemplate,
    context: RecommendationContext
  ): Promise<{ score: number; reasons: string[] }> {
    let score = 0
    const reasons: string[] = []

    // 1. Industry match (high weight)
    if (context.industry && template.industries) {
      if (template.industries.includes(context.industry)) {
        score += 30
        reasons.push(`Perfect fit for ${context.industry} industry`)
      } else if (template.industries.includes('All')) {
        score += 10
        reasons.push('Suitable for all industries')
      }
    }

    // 2. Difficulty level based on team size
    if (context.teamSize) {
      if (template.difficulty_level === 'beginner' && context.teamSize < 10) {
        score += 15
        reasons.push('Beginner-friendly template ideal for small teams')
      } else if (template.difficulty_level === 'intermediate' && context.teamSize >= 10 && context.teamSize < 50) {
        score += 15
        reasons.push('Intermediate complexity matches your team size')
      } else if (template.difficulty_level === 'advanced' && context.teamSize >= 50) {
        score += 15
        reasons.push('Advanced template suitable for enterprise teams')
      }
    }

    // 3. Previous stream types (learn from history)
    if (context.previousStreamTypes && context.previousStreamTypes.length > 0) {
      const hasUsedCategory = context.previousStreamTypes.includes(template.category)
      if (hasUsedCategory) {
        score += 10
        reasons.push('Similar to your previous successful streams')
      }
    }

    // 4. Popularity (use_count)
    if (template.use_count > 50) {
      score += 20
      reasons.push('Highly popular template used by many teams')
    } else if (template.use_count > 20) {
      score += 10
      reasons.push('Proven template with good adoption')
    }

    // 5. Success rate
    if (template.avg_success_rate !== null) {
      if (template.avg_success_rate >= 0.8) {
        score += 20
        reasons.push(`${Math.round(template.avg_success_rate * 100)}% success rate`)
      } else if (template.avg_success_rate >= 0.6) {
        score += 10
      }
    }

    // 6. Timeline (prefer realistic timelines)
    if (template.typical_timeline_days) {
      if (template.typical_timeline_days <= 21) {
        score += 10
        reasons.push('Quick to complete (under 3 weeks)')
      } else if (template.typical_timeline_days <= 45) {
        score += 5
        reasons.push('Reasonable timeline (4-6 weeks)')
      }
    }

    // 7. Goal alignment
    if (context.goals && context.goals.length > 0) {
      const goalKeywords = context.goals.join(' ').toLowerCase()
      const templateText = `${template.name} ${template.description}`.toLowerCase()

      if (goalKeywords.split(' ').some(word => templateText.includes(word))) {
        score += 15
        reasons.push('Aligns with your stated goals')
      }
    }

    // 8. Suggested agents availability (prefer templates with clear workflows)
    if (template.suggested_agents.length >= 2) {
      score += 10
      reasons.push('Complete AI workflow included')
    }

    // Ensure we have at least one reason
    if (reasons.length === 0) {
      reasons.push('General purpose template')
    }

    return { score, reasons }
  }

  /**
   * Get trending templates
   */
  static async getTrendingTemplates(limit: number = 5): Promise<ExtendedGoalTemplate[]> {
    return ALL_TEMPLATES
      .filter(t => t.use_count > 0)
      .sort((a, b) => {
        // Sort by recent usage (use_count) and success rate
        const scoreA = (a.use_count || 0) * (a.avg_success_rate || 0.5)
        const scoreB = (b.use_count || 0) * (b.avg_success_rate || 0.5)
        return scoreB - scoreA
      })
      .slice(0, limit)
  }

  /**
   * Get templates by success rate
   */
  static async getTopPerformingTemplates(limit: number = 5): Promise<ExtendedGoalTemplate[]> {
    return ALL_TEMPLATES
      .filter(t => t.avg_success_rate !== null && t.avg_success_rate > 0)
      .sort((a, b) => (b.avg_success_rate || 0) - (a.avg_success_rate || 0))
      .slice(0, limit)
  }

  /**
   * Get beginner-friendly templates
   */
  static async getBeginnerTemplates(): Promise<ExtendedGoalTemplate[]> {
    return ALL_TEMPLATES.filter(t => t.difficulty_level === 'beginner')
  }

  /**
   * Get templates for specific use case
   */
  static async getTemplatesForUseCase(useCase: string): Promise<ExtendedGoalTemplate[]> {
    const lowerUseCase = useCase.toLowerCase()

    return ALL_TEMPLATES.filter(t => {
      const searchText = `${t.name} ${t.description} ${t.category}`.toLowerCase()
      return searchText.includes(lowerUseCase)
    })
  }

  /**
   * Get user's template usage history
   */
  static async getUserTemplateHistory(userId: string): Promise<{
    templatesUsed: string[]
    favoriteCategory: string | null
    successRate: number
  }> {
    const supabase = await createClient()

    // Get user's streams with templates
    const { data: streams } = await supabase
      .from('streams')
      .select('goal_template_id, goal_status')
      .eq('created_by', userId)
      .not('goal_template_id', 'is', null) as { data: Array<{ goal_template_id?: string | null; goal_status?: string | null }> | null; error: any }

    if (!streams || streams.length === 0) {
      return {
        templatesUsed: [],
        favoriteCategory: null,
        successRate: 0
      }
    }

    const templatesUsed = streams.map(s => s.goal_template_id).filter(Boolean) as string[]
    const completedStreams = streams.filter(s => s.goal_status === 'completed').length
    const successRate = streams.length > 0 ? completedStreams / streams.length : 0

    // Find favorite category
    const templateCategories = templatesUsed.map(tid => {
      const template = ALL_TEMPLATES.find(t => t.id === tid)
      return template?.category
    }).filter(Boolean) as string[]

    const categoryCount = templateCategories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const favoriteCategory = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null

    return {
      templatesUsed,
      favoriteCategory,
      successRate
    }
  }

  /**
   * Get similar templates
   */
  static async getSimilarTemplates(
    templateId: string,
    limit: number = 3
  ): Promise<ExtendedGoalTemplate[]> {
    const sourceTemplate = ALL_TEMPLATES.find(t => t.id === templateId)
    if (!sourceTemplate) return []

    // Find templates with same category or overlapping industries
    const similar = ALL_TEMPLATES.filter(t => {
      if (t.id === templateId) return false

      const sameCategory = t.category === sourceTemplate.category
      const overlappingIndustries = t.industries?.some(i =>
        sourceTemplate.industries?.includes(i)
      )
      const sameDifficulty = t.difficulty_level === sourceTemplate.difficulty_level

      return sameCategory || overlappingIndustries || sameDifficulty
    })

    // Score by similarity
    const scored = similar.map(t => {
      let score = 0
      if (t.category === sourceTemplate.category) score += 30
      if (t.difficulty_level === sourceTemplate.difficulty_level) score += 20
      if (t.industries?.some(i => sourceTemplate.industries?.includes(i))) score += 25
      if (Math.abs((t.typical_timeline_days || 0) - (sourceTemplate.typical_timeline_days || 0)) < 7) score += 15

      return { template: t, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.template)
  }
}
