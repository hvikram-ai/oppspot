import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'org_id'>
type Business = Pick<Database['public']['Tables']['businesses']['Row'], 'id' | 'name' | 'description' | 'company_number'>
type Stream = Pick<Database['public']['Tables']['streams']['Row'], 'id' | 'name' | 'description' | 'stream_type'>
type Scan = Pick<Database['public']['Tables']['acquisition_scans']['Row'], 'id' | 'name' | 'description' | 'status'>
type List = Pick<Database['public']['Tables']['lists']['Row'], 'id' | 'name' | 'description'>

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single<Profile>()

    const orgId = profile?.org_id

    const searchPattern = `%${query.toLowerCase()}%`
    const results: Array<{
      id: string
      type: 'company' | 'stream' | 'scan' | 'list'
      title: string
      subtitle?: string
      href: string
    }> = []

    // Search Companies (businesses)
    const { data: companies } = await supabase
      .from('businesses')
      .select('id, name, description, company_number')
      .or(`name.ilike.${searchPattern},description.ilike.${searchPattern},company_number.ilike.${searchPattern}`)
      .limit(5)
      .returns<Business[]>()

    if (companies) {
      companies.forEach(company => {
        results.push({
          id: company.id,
          type: 'company',
          title: company.name,
          subtitle: company.company_number ? `Company #${company.company_number}` :
                   (company.description ? company.description.slice(0, 60) + '...' : undefined),
          href: `/business/${company.id}`,
        })
      })
    }

    // Search Streams (if user has org)
    if (orgId) {
      const { data: streams } = await supabase
        .from('streams')
        .select('id, name, description, stream_type')
        .eq('org_id', orgId)
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .eq('status', 'active')
        .limit(5)
        .returns<Stream[]>()

      if (streams) {
        streams.forEach(stream => {
          results.push({
            id: stream.id,
            type: 'stream',
            title: stream.name,
            subtitle: `${stream.stream_type} ${stream.description ? '• ' + stream.description.slice(0, 50) : ''}`,
            href: `/streams/${stream.id}`,
          })
        })
      }
    }

    // Search Opportunity Scans
    if (orgId) {
      const { data: scans } = await supabase
        .from('acquisition_scans')
        .select('id, name, description, status')
        .eq('org_id', orgId)
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(5)
        .returns<Scan[]>()

      if (scans) {
        scans.forEach(scan => {
          results.push({
            id: scan.id,
            type: 'scan',
            title: scan.name,
            subtitle: `Status: ${scan.status}`,
            href: `/opp-scan/${scan.id}`,
          })
        })
      }
    }

    // Search Lists
    if (orgId) {
      const { data: lists } = await supabase
        .from('lists')
        .select('id, name, description')
        .eq('org_id', orgId)
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(5)
        .returns<List[]>()

      if (lists) {
        lists.forEach(list => {
          results.push({
            id: list.id,
            type: 'list',
            title: list.name,
            subtitle: list.description || undefined,
            href: `/lists?id=${list.id}`,
          })
        })
      }
    }

    // Sort by relevance (companies first, then by name)
    const sortedResults = results.sort((a, b) => {
      const typeOrder = { company: 0, stream: 1, scan: 2, list: 3 }
      const typeDiff = typeOrder[a.type] - typeOrder[b.type]
      if (typeDiff !== 0) return typeDiff
      return a.title.localeCompare(b.title)
    })

    return NextResponse.json({ results: sortedResults.slice(0, 10) })
  } catch (error) {
    console.error('Command search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
