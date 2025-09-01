import { NextRequest, NextResponse } from 'next/server'
import { 
  demoTrends, 
  demoOpportunities, 
  generateDemoAnalytics 
} from '@/lib/demo/demo-data'

// GET: Fetch demo analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'
    const days = parseInt(searchParams.get('days') || '30')
    
    const analyticsData = generateDemoAnalytics(days)
    
    const response: any = {
      success: true,
      timestamp: new Date().toISOString()
    }
    
    switch (type) {
      case 'trends':
        response.data = {
          ...demoTrends,
          historicalData: analyticsData
        }
        break
        
      case 'opportunities':
        response.data = demoOpportunities
        break
        
      case 'metrics':
        response.data = {
          current: analyticsData[analyticsData.length - 1],
          historical: analyticsData,
          summary: {
            avgGrowth: analyticsData.reduce((acc, d) => acc + d.growth, 0) / analyticsData.length,
            totalLeads: analyticsData.reduce((acc, d) => acc + d.newLeads, 0),
            totalConversions: analyticsData.reduce((acc, d) => acc + d.conversions, 0),
            conversionRate: (
              analyticsData.reduce((acc, d) => acc + d.conversions, 0) /
              analyticsData.reduce((acc, d) => acc + d.newLeads, 0) * 100
            ).toFixed(2)
          }
        }
        break
        
      case 'forecast':
        // Generate simple forecast
        const lastValue = analyticsData[analyticsData.length - 1]
        response.data = {
          forecast_date: new Date().toISOString(),
          predictions: {
            '7d': {
              businesses: Math.round(lastValue.businesses * 1.02),
              growth: lastValue.growth + 1.5,
              confidence: 0.85
            },
            '30d': {
              businesses: Math.round(lastValue.businesses * 1.08),
              growth: lastValue.growth + 3.2,
              confidence: 0.72
            },
            '90d': {
              businesses: Math.round(lastValue.businesses * 1.25),
              growth: lastValue.growth + 5.8,
              confidence: 0.61
            }
          }
        }
        break
        
      default:
        response.data = {
          trends: demoTrends,
          opportunities: demoOpportunities,
          metrics: analyticsData[analyticsData.length - 1],
          historical: analyticsData
        }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching demo analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch demo analytics' },
      { status: 500 }
    )
  }
}