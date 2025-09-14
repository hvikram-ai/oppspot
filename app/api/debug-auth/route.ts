import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Debug environment variables
  const debug = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
    keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30),
  }

  // Test direct auth
  try {
    const response = await fetch('https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@oppspot.com',
        password: 'Demo123456!'
      })
    })

    const data = await response.json()
    debug.authTest = response.ok ? 'Success' : 'Failed'
    debug.authResponse = response.ok ? 'User authenticated' : data.msg || data.error || 'Unknown error'
  } catch (error: any) {
    debug.authTest = 'Error'
    debug.authError = error.message
  }

  return NextResponse.json({ debug })
}