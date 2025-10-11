import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TemplateRecommender } from '@/lib/templates/template-recommender'
import type { Row } from '@/lib/supabase/helpers'

/**
 * GET /api/goal-templates/recommend
 * Get personalized template recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') || '5')
    const type = searchParams.get('type') // 'personalized', 'trending', 'top', 'beginner'

    let recommendations

    if (type === 'trending') {
      recommendations = await TemplateRecommender.getTrendingTemplates(limit)
      return NextResponse.json({
        recommendations: recommendations.map(t => ({ template: t, score: 0, reasons: ['Trending'] })),
        type: 'trending'
      })
    }

    if (type === 'top') {
      recommendations = await TemplateRecommender.getTopPerformingTemplates(limit)
      return NextResponse.json({
        recommendations: recommendations.map(t => ({ template: t, score: 0, reasons: ['Top performing'] })),
        type: 'top'
      })
    }

    if (type === 'beginner') {
      recommendations = await TemplateRecommender.getBeginnerTemplates()
      return NextResponse.json({
        recommendations: recommendations.map(t => ({ template: t, score: 0, reasons: ['Beginner friendly'] })),
        type: 'beginner'
      })
    }

    // Personalized recommendations (default)
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('industry, company_size')
      .eq('id', user.id)
      .single()

    // Get user's template history
    const history = await TemplateRecommender.getUserTemplateHistory(user.id)

    // Build recommendation context
    const context = {
      userId: user.id,
      industry: profile?.industry || undefined,
      teamSize: profile?.company_size || undefined,
      previousStreamTypes: history.templatesUsed
    }

    recommendations = await TemplateRecommender.getRecommendations(context, limit)

    return NextResponse.json({
      recommendations,
      type: 'personalized',
      context: {
        industry: context.industry,
        templatesUsed: history.templatesUsed.length,
        successRate: Math.round(history.successRate * 100)
      }
    })

  } catch (error) {
    console.error('Error getting recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
