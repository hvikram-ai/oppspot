import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ALL_TEMPLATES } from '@/lib/templates/template-library'

/**
 * POST /api/goal-templates/seed
 * Seed all templates from template library into database
 * (Development/Admin endpoint)
 */
export async function POST(request: NextRequest) {
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

    // Get admin status from request header or check if user is admin
    const isAdmin = request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY

    if (!isAdmin) {
      // Check if user is admin via database
      const { data: profile, error: _profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: unknown }

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }
    }

    // Seed templates
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ id: string; error: string }>
    }

    for (const template of ALL_TEMPLATES) {
      try {
        // Check if template exists
        const { data: existing, error: _existingError } = await supabase
          .from('goal_templates')
          .select('id')
          .eq('id', template.id)
          .single()

        if (existing) {
          // Update existing template
          const { error } = await supabase
            .from('goal_templates')
            .update({
              name: template.name,
              description: template.description,
              category: template.category,
              icon: template.icon,
              default_criteria: template.default_criteria,
              default_metrics: template.default_metrics,
              default_success_criteria: template.default_success_criteria,
              suggested_agents: template.suggested_agents,
              updated_at: new Date().toISOString()
            })
            .eq('id', template.id)

          if (error) throw error
          results.updated++
        } else {
          // Insert new template
          const { error } = await supabase
            .from('goal_templates')
            .insert({
              id: template.id,
              name: template.name,
              description: template.description,
              category: template.category,
              icon: template.icon,
              default_criteria: template.default_criteria,
              default_metrics: template.default_metrics,
              default_success_criteria: template.default_success_criteria,
              suggested_agents: template.suggested_agents,
              is_public: true,
              created_by: null // System templates
            })

          if (error) throw error
          results.created++
        }
      } catch (error) {
        results.errors.push({
          id: template.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.created + results.updated} templates (${results.created} created, ${results.updated} updated)`,
      results
    })

  } catch (error) {
    console.error('Error seeding templates:', error)
    return NextResponse.json(
      { error: 'Failed to seed templates' },
      { status: 500 }
    )
  }
}
