import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match paths that need auth:
     * - Dashboard routes
     * - Protected pages
     * - API routes that need authentication
     * Exclude:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - static assets
     */
    '/(dashboard|profile|settings|search|map|companies|updates|lists|analytics|data-rooms)/:path*',
    '/(auth)/:path*',
    '/api/companies/:path*',
    '/api/search/:path*',
    '/api/similar-companies/:path*',
    '/api/data-rooms/:path*',
    '/api/data-room/:path*',
  ],
}