import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getSupabaseConfig } from '@/lib/config/supabase'

export function createClient() {
  // Get configuration (will use hardcoded values if env vars are missing)
  const { url, anonKey } = getSupabaseConfig()

  // Validate configuration
  if (!url || !anonKey) {
    console.error('[Supabase] Missing configuration')
    throw new Error('Supabase configuration is missing')
  }

  // Validate URL format
  if (!/^https?:\/\//.test(url)) {
    console.error('[Supabase] Invalid URL format:', url)
    throw new Error('Invalid Supabase URL configuration')
  }

  // Log configuration source for debugging
  console.log('[Supabase] Creating client with URL:', url.substring(0, 30) + '...')

  return createBrowserClient<Database>(url, anonKey)
}
