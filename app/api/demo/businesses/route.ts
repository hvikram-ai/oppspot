import { NextRequest, NextResponse } from 'next/server'
import { demoBusinesses, demoMetrics } from '@/lib/demo/demo-data'

// GET: Fetch demo businesses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Filter businesses
    let filteredBusinesses = [...demoBusinesses]
    
    if (category) {
      filteredBusinesses = filteredBusinesses.filter(b => 
        b.category.toLowerCase() === category.toLowerCase()
      )
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredBusinesses = filteredBusinesses.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.description.toLowerCase().includes(searchLower) ||
        b.category.toLowerCase().includes(searchLower) ||
        b.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedBusinesses = filteredBusinesses.slice(startIndex, endIndex)
    
    return NextResponse.json({
      businesses: paginatedBusinesses,
      total: filteredBusinesses.length,
      page,
      limit,
      hasMore: endIndex < filteredBusinesses.length,
      metrics: demoMetrics
    })
  } catch (error) {
    console.error('Error fetching demo businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch demo data' },
      { status: 500 }
    )
  }
}