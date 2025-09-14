import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Hardcoded fallback values for production (these are public keys, safe to expose)
  const FALLBACK_URL = 'https://fuqdbewftdthbjfcecrz.supabase.co'
  const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'
  
  // Try to get from environment first, then use fallbacks
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY

  // Log if using fallbacks
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Using fallback configuration. Environment variables not found.')
  }

  // Validate URL format
  if (!/^https?:\/\//.test(url)) {
    console.error('[Supabase] Invalid SUPABASE_URL format:', url)
    throw new Error('Invalid Supabase URL configuration')
  }

  return createBrowserClient<Database>(url, anon)
}
