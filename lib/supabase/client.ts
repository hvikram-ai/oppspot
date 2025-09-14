import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Hardcode the values directly to ensure they work
  const url = 'https://fuqdbewftdthbjfcecrz.supabase.co'
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'

  // Log for debugging
  console.log('[Supabase] Creating client with hardcoded values')
  console.log('[Supabase] URL:', url.substring(0, 30) + '...')
  console.log('[Supabase] Key:', anonKey.substring(0, 30) + '...')

  try {
    return createBrowserClient<Database>(url, anonKey)
  } catch (error: any) {
    console.error('[Supabase] Failed to create client:', error)
    throw error
  }
}
