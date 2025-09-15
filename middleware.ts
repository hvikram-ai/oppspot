import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match only specific paths that need auth:
     * - Dashboard routes
     * - Protected pages
     * Exclude:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     * - static assets
     */
    '/(dashboard|profile|settings|search|map|companies|updates|lists|analytics)/:path*',
    '/(auth)/:path*',
  ],
}