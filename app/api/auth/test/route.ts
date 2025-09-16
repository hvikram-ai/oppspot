import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check environment variables
    const env = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV,
    }

    // Test Supabase connection
    let supabaseStatus = 'Not tested'
    let authStatus = 'Not tested'
    let profilesAccess = 'Not tested'
    
    try {
      const supabase = await createClient()
      
      // Test auth health
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      authStatus = authError ? `Error: ${authError.message}` : (user ? 'Authenticated' : 'Not authenticated')
      
      // Test database access
      const { count, error: dbError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (dbError) {
        profilesAccess = `Error: ${dbError.message}`
      } else {
        profilesAccess = `Accessible (${count} profiles)`
      }
      
      supabaseStatus = 'Connected'
    } catch (err) {
      supabaseStatus = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
    }

    // Test demo account exists
    let demoAccountStatus = 'Not checked'
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, email, org_id')
          .eq('email', 'demo@oppspot.com')
          .single()
        
        if (profile) {
          demoAccountStatus = `Exists (has org: ${profile.org_id ? 'Yes' : 'No'})`
        } else {
          demoAccountStatus = 'Not found'
        }
      } catch {
        demoAccountStatus = 'Check failed'
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env,
      supabase: {
        status: supabaseStatus,
        auth: authStatus,
        profilesTable: profilesAccess,
      },
      demoAccount: demoAccountStatus,
      urls: {
        login: `${env.appUrl}/login`,
        dashboard: `${env.appUrl}/dashboard`,
        api: `${env.appUrl}/api`,
      },
      instructions: {
        login: 'Use demo@oppspot.com / Demo123456!',
        checkEnv: 'Verify NEXT_PUBLIC_APP_URL matches your browser URL',
        vercel: 'Set environment variables in Vercel dashboard',
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}