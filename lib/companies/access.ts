import { createClient } from '@/lib/supabase/server'

/**
 * Lightweight company access check.
 * Currently verifies the company exists; extend with org/team membership as needed.
 */
export async function userHasCompanyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string
): Promise<boolean> {
  const { data: company, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return false
  }

  // Placeholder for future org-based access checks
  return true
}
