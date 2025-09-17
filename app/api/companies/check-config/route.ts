import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check auth status
    let authStatus = 'not_authenticated'
    let userId = null
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user) {
        authStatus = 'authenticated'
        userId = user.id
      } else if (error) {
        authStatus = `error: ${error.message}`
      }
    } catch (e) {
      authStatus = `exception: ${e instanceof Error ? e.message : 'unknown'}`
    }

    // Check environment variables
    const config = {
      auth: {
        status: authStatus,
        userId,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
      },
      supabase: {
        url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon_key_configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      companies_house: {
        api_key_configured: !!process.env.COMPANIES_HOUSE_API_KEY,
        api_key_length: process.env.COMPANIES_HOUSE_API_KEY?.length || 0,
        api_url_configured: !!process.env.COMPANIES_HOUSE_API_URL,
        cache_ttl: process.env.COMPANIES_HOUSE_CACHE_TTL || 'not set',
      },
      other_apis: {
        openrouter_configured: !!process.env.OPENROUTER_API_KEY,
        resend_configured: !!process.env.RESEND_API_KEY,
        google_maps_configured: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        google_places_configured: !!process.env.GOOGLE_PLACES_API_KEY,
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration check complete',
      config,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Config check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}