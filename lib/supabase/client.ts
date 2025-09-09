import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

  // Do not throw here to avoid crashing the entire page; callers should validate before use
  if (!url || !/^https?:\/\//.test(url) || !anon) {
    // Provide a clear console message for environments missing public config
    console.error('[Supabase] Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient<Database>(url || 'http://invalid.local', anon || 'missing-key')
}
