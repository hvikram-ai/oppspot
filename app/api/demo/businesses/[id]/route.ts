import { NextRequest, NextResponse } from 'next/server'
import { demoBusinesses } from '@/lib/demo/demo-data'

// GET: Fetch single demo business
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const business = demoBusinesses.find(b => b.id === params.id)
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    
    // Add some additional demo data for detail view
    const enrichedBusiness = {
      ...business,
      updates: [
        {
          id: 'update-1',
          title: 'Expanded Service Offerings',
          content: 'We have recently expanded our services to include AI consulting and machine learning solutions.',
          published_at: '2024-08-15T10:00:00Z'
        },
        {
          id: 'update-2',
          title: 'New Partnership Announcement',
          content: 'Excited to announce our strategic partnership with leading cloud providers.',
          published_at: '2024-08-01T14:00:00Z'
        }
      ],
      competitors: [
        {
          id: 'comp-1',
          name: 'Competitor A',
          rating: 4.5,
          review_count: 156
        },
        {
          id: 'comp-2',
          name: 'Competitor B',
          rating: 4.3,
          review_count: 98
        }
      ],
      social_presence: {
        linkedin: 'https://linkedin.com/company/demo',
        twitter: 'https://twitter.com/demo',
        facebook: 'https://facebook.com/demo',
        instagram: 'https://instagram.com/demo',
        social_score: 85
      },
      opening_hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 5:00 PM',
        saturday: 'Closed',
        sunday: 'Closed'
      }
    }
    
    return NextResponse.json({
      business: enrichedBusiness
    })
  } catch (error) {
    console.error('Error fetching demo business:', error)
    return NextResponse.json(
      { error: 'Failed to fetch demo business' },
      { status: 500 }
    )
  }
}