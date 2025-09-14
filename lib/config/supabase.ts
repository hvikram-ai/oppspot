// Supabase configuration with hardcoded values
// These are public anon keys, safe to expose in client-side code

export const supabaseConfig = {
  url: 'https://fuqdbewftdthbjfcecrz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'
}

// Use environment variables if available, otherwise use hardcoded values
export function getSupabaseConfig() {
  const url = typeof window !== 'undefined' 
    ? (window as any).__NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url
    : process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url
    
  const anonKey = typeof window !== 'undefined'
    ? (window as any).__NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseConfig.anonKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseConfig.anonKey
    
  return { url, anonKey }
}