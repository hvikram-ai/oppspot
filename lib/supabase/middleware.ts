import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip middleware for static assets only
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Use hardcoded values as fallback
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fuqdbewftdthbjfcecrz.supabase.co'
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'
    
    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Add timeout for auth check to prevent middleware timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth check timeout')), 3000)
    )
    
    // Race between auth check and timeout
    await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise
    ]).catch(() => {
      // If timeout or error, just continue without auth refresh
      console.warn('Middleware auth check skipped due to timeout')
    })

  } catch (error) {
    // Log error but don't block the request
    console.error('Middleware error:', error)
  }

  return supabaseResponse
}