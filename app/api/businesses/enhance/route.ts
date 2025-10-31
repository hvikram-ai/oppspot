/**
 * Business Enhancement API Route
 *
 * Migrated to use LLMManager for unified multi-provider support.
 * Tracks usage under 'business-enhancement' feature.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserLLMManager } from '@/lib/ai/llm-client-wrapper'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type Business = Database['public']['Tables']['businesses']['Row']

// Helper function to generate business description using LLM Manager
async function generateBusinessDescription(manager: Awaited<ReturnType<typeof getUserLLMManager>>, business: Partial<Business>): Promise<string> {
  const prompt = `Generate a compelling, SEO-friendly description for this UK/Ireland business:

Name: ${business.name}
Industry: ${business.industry || 'Not specified'}
Location: ${business.postcode || business.address_snippet || 'UK/Ireland'}
${business.website ? `Website: ${business.website}` : ''}
${business.category ? `Category: ${business.category}` : ''}

Requirements:
- 100-200 words
- British English
- Professional and engaging
- Focus on what makes the business unique
- Include relevant keywords naturally`

  const response = await manager.chat([
    { role: 'system', content: 'You are a professional business copywriter creating compelling, SEO-friendly descriptions for UK and Ireland businesses.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.7, maxTokens: 300, feature: 'business-enhancement' })

  return response.content?.trim() || ''
}

// Helper function to generate business insights
async function generateBusinessInsights(manager: Awaited<ReturnType<typeof getUserLLMManager>>, business: Partial<Business>) {
  const prompt = `Analyze this UK/Ireland business and provide strategic insights in JSON format:

Name: ${business.name}
Industry: ${business.industry || 'Not specified'}
${business.category ? `Category: ${business.category}` : ''}
${business.description ? `Description: ${business.description}` : ''}

Return JSON with:
{
  "market_position": "brief market position analysis",
  "target_audience": "primary target audience",
  "competitive_advantages": ["advantage 1", "advantage 2"],
  "growth_opportunities": ["opportunity 1", "opportunity 2"],
  "challenges": ["challenge 1", "challenge 2"]
}`

  const response = await manager.chat([
    { role: 'system', content: 'You are a business analyst specializing in UK and Ireland markets. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, maxTokens: 500, feature: 'business-enhancement' })

  try {
    const content = response.content?.replace(/```json\n?|\n?```/g, '').trim() || '{}'
    return JSON.parse(content)
  } catch {
    return {
      market_position: 'Analysis pending',
      target_audience: 'General consumers',
      competitive_advantages: [],
      growth_opportunities: [],
      challenges: []
    }
  }
}

// Helper function to generate SEO keywords
async function generateSEOKeywords(manager: Awaited<ReturnType<typeof getUserLLMManager>>, business: Partial<Business>): Promise<string[]> {
  const prompt = `Generate 10-15 relevant SEO keywords for this business:

Name: ${business.name}
Industry: ${business.industry || 'Not specified'}
${business.category ? `Category: ${business.category}` : ''}
${business.description ? `Description: ${business.description}` : ''}

Return keywords as a simple comma-separated list.`

  const response = await manager.chat([
    { role: 'system', content: 'You are an SEO specialist. Return only keywords as a comma-separated list.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.6, maxTokens: 200, feature: 'business-enhancement' })

  const keywords = response.content?.split(',').map(k => k.trim()).filter(k => k.length > 0) || []
  return keywords.slice(0, 15)
}

// Helper function to generate tagline
async function generateTagline(manager: Awaited<ReturnType<typeof getUserLLMManager>>, business: Partial<Business>): Promise<string> {
  const prompt = `Create a short, memorable tagline (max 10 words) for:

Name: ${business.name}
Industry: ${business.industry || 'Not specified'}
${business.description ? `Description: ${business.description}` : ''}

Return only the tagline, no quotes or explanations.`

  const response = await manager.chat([
    { role: 'system', content: 'You are a creative copywriter specializing in business taglines. Keep it short and impactful.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.8, maxTokens: 50, feature: 'business-enhancement' })

  return response.content?.replace(/["""]/g, '').trim() || ''
}

// Helper function to suggest categories
async function suggestCategories(manager: Awaited<ReturnType<typeof getUserLLMManager>>, business: Partial<Business>): Promise<string[]> {
  const prompt = `Suggest 3-5 relevant business categories for:

Name: ${business.name}
Industry: ${business.industry || 'Not specified'}
${business.description ? `Description: ${business.description}` : ''}

Return categories as a comma-separated list.`

  const response = await manager.chat([
    { role: 'system', content: 'You are a business categorization specialist. Return only categories as a comma-separated list.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, maxTokens: 100, feature: 'business-enhancement' })

  const categories = response.content?.split(',').map(c => c.trim()).filter(c => c.length > 0) || []
  return categories.slice(0, 5)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and has admin rights
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profileData, error: _profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileData as Row<'profiles'> | null

    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, enhancements = ['description'] } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Fetch the business
    const { data: businessData, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (fetchError || !businessData) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const business = businessData as Business

    const manager = await getUserLLMManager(user.id)
    const updates: Partial<Business> = {}
    const results: Record<string, unknown> = {}

    try {
      // Generate requested enhancements
      for (const enhancement of enhancements) {
        try {
          switch (enhancement) {
            case 'description':
              if (!business.description || business.description.length < 50) {
                const description = await generateBusinessDescription(manager, business)
                updates.description = description
                results.description = description
              }
              break

            case 'insights':
              const insights = await generateBusinessInsights(manager, business)
              updates.ai_insights = {
                ...((business.ai_insights as Record<string, unknown>) || {}),
                ...insights,
                generated_at: new Date().toISOString()
              }
              results.insights = insights
              break

            case 'keywords':
              const keywords = await generateSEOKeywords(manager, business)
              updates.metadata = {
                ...((business.metadata as Record<string, unknown>) || {}),
                seo_keywords: keywords
              }
              results.keywords = keywords
              break

            case 'tagline':
              const tagline = await generateTagline(manager, business)
              updates.metadata = {
                ...((business.metadata as Record<string, unknown>) || {}),
                tagline
              }
              results.tagline = tagline
              break

            case 'categories':
              if (!business.categories || business.categories.length === 0) {
                const categories = await suggestCategories(manager, business)
                updates.categories = categories
                results.categories = categories
              }
              break
          }
        } catch (error) {
          console.error(`Failed to generate ${enhancement}:`, error)
          results[enhancement] = { error: `Failed to generate ${enhancement}` }
        }
      }
    } finally {
      await manager.cleanup()
    }

    // Update the business with enhancements
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updates as any)
        .eq('id', businessId)

      if (updateError) {
        console.error('Failed to update business:', updateError)
        return NextResponse.json(
          { error: 'Failed to save enhancements' },
          { status: 500 }
        )
      }
    }

    // Log the enhancement event
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'business_enhanced',
      event_data: {
        business_id: businessId,
        business_name: business.name,
        enhancements,
        results: Object.keys(results)
      }
    } as any)

    return NextResponse.json({
      message: 'Business enhanced successfully',
      business_id: businessId,
      enhancements: results,
      updated_fields: Object.keys(updates)
    })

  } catch (error) {
    console.error('Enhancement error:', error)
    return NextResponse.json(
      { error: 'Enhancement failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Bulk enhance multiple businesses
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and has admin rights
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profileData, error: _profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileData as Row<'profiles'> | null

    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      limit = 10,
      enhancements = ['description'],
      filter = 'missing_description'
    } = body

    // Build query based on filter
    let query = supabase.from('businesses').select('*')

    switch (filter) {
      case 'missing_description':
        query = query.or('description.is.null,description.eq.')
        break
      case 'missing_categories':
        query = query.or('categories.is.null,categories.eq.{}')
        break
      case 'not_verified':
        query = query.eq('verified', false)
        break
      case 'no_insights':
        query = query.is('ai_insights', null)
        break
      default:
        // No specific filter, get any businesses
        break
    }

    // Limit the number of businesses to process
    query = query.limit(limit)

    const { data: businessesData, error: fetchError } = await query

    const businesses = (businessesData || []) as Business[]

    if (fetchError || !businesses || businesses.length === 0) {
      return NextResponse.json({
        message: 'No businesses found to enhance',
        processed: 0
      })
    }

    const typedBusinesses = businesses as Row<'businesses'>[]

    const manager = await getUserLLMManager(user.id)
    const results = []
    let successCount = 0
    let errorCount = 0

    try {
      // Process each business
      for (const business of typedBusinesses) {
        interface BusinessResult {
          id: string
          name: string | null
          enhancements: Record<string, string | string[]>
          status?: string
          error?: string
        }

        const businessResult: BusinessResult = {
          id: business.id,
          name: business.name,
          enhancements: {}
        }

        try {
          const updates: Partial<Business> = {}

          // Generate requested enhancements
          for (const enhancement of enhancements) {
            try {
              switch (enhancement) {
                case 'description':
                  if (!business.description || business.description.length < 50) {
                    const description = await generateBusinessDescription(manager, business)
                    updates.description = description
                    businessResult.enhancements.description = 'Generated'
                  }
                  break

                case 'insights':
                  const insights = await generateBusinessInsights(manager, business)
                  updates.ai_insights = {
                    ...((business.ai_insights as Record<string, unknown>) || {}),
                    ...insights,
                    generated_at: new Date().toISOString()
                  }
                  businessResult.enhancements.insights = 'Generated'
                  break

                case 'categories':
                  if (!business.categories || business.categories.length === 0) {
                    const categories = await suggestCategories(manager, business)
                    updates.categories = categories
                    businessResult.enhancements.categories = categories
                  }
                  break
              }
            } catch (error) {
              console.error(`Failed to generate ${enhancement} for ${business.name}:`, error)
              businessResult.enhancements[enhancement] = 'Failed'
            }
          }

          // Update the business if we have enhancements
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('businesses')
              .update(updates as never)
              .eq('id', business.id)

            if (updateError) {
              throw updateError
            }

            businessResult.status = 'success'
            successCount++
          } else {
            businessResult.status = 'skipped'
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`Failed to enhance business ${business.name}:`, error)
          businessResult.status = 'error'
          businessResult.error = error instanceof Error ? error.message : 'Unknown error'
          errorCount++
        }

        results.push(businessResult)
      }
    } finally {
      await manager.cleanup()
    }

    // Log the bulk enhancement event
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'bulk_business_enhancement',
      event_data: {
        filter,
        enhancements,
        total_processed: businesses.length,
        success_count: successCount,
        error_count: errorCount
      }
    } as any)

    return NextResponse.json({
      message: 'Bulk enhancement completed',
      processed: businesses.length,
      successful: successCount,
      errors: errorCount,
      results
    })

  } catch (error) {
    console.error('Bulk enhancement error:', error)
    return NextResponse.json(
      { error: 'Bulk enhancement failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}