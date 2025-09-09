import { NextRequest, NextResponse } from 'next/server'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple AI responses without external dependencies for now
const getAIResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase()
  
  // Greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm your OppSpot AI assistant. I can help you with business intelligence, M&A analysis, and navigating the platform. What would you like to know?"
  }
  
  // Help requests
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return "I can help you with:\n\n• **Finding and analyzing companies** - Search our database of UK & Ireland businesses\n• **Similarity analysis** - Find companies similar to your target using AI\n• **M&A opportunities** - Discover potential acquisition targets with OppScan\n• **Platform navigation** - Guide you through OppSpot's features\n• **Business intelligence** - Answer questions about markets and companies\n\nWhat would you like to explore?"
  }
  
  // Feature explanations
  if (lowerMessage.includes('similarity') || lowerMessage.includes('similar')) {
    return "The **Similarity Analysis** feature uses AI to find companies similar to your target based on multiple dimensions:\n\n• Financial metrics\n• Strategic positioning\n• Operational characteristics\n• Market factors\n• Risk profiles\n\nYou can access it from the main dashboard or any company profile page. Would you like me to explain how to use it?"
  }
  
  if (lowerMessage.includes('opp scan') || lowerMessage.includes('oppscan') || lowerMessage.includes('scan')) {
    return "**OppScan** is our comprehensive M&A opportunity scanner that:\n\n• Searches across multiple data sources\n• Identifies potential acquisition targets\n• Analyzes companies based on your criteria\n• Provides detailed intelligence reports\n• Tracks market opportunities in real-time\n\nYou can start a scan from the dashboard. What type of companies are you looking for?"
  }
  
  if (lowerMessage.includes('dashboard')) {
    return "The **Dashboard** is your central hub for:\n\n• Recent searches and saved companies\n• Active OppScans and alerts\n• Similar company analyses\n• Market insights and trends\n• Quick access to all features\n\nYou can customize it to show the information most relevant to you."
  }
  
  // Company search
  if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('looking for')) {
    return "I can help you find companies! You can:\n\n• Use the search bar to find specific companies by name\n• Run an OppScan to discover companies matching your criteria\n• Use Similarity Analysis to find companies like one you know\n\nWhat type of company are you looking for? You can describe the industry, size, location, or other characteristics."
  }
  
  // Data questions
  if (lowerMessage.includes('data') || lowerMessage.includes('database') || lowerMessage.includes('coverage')) {
    return "OppSpot covers **millions of companies** across the UK and Ireland with:\n\n• Company details and contact information\n• Financial data and estimates\n• Industry classifications\n• Ownership structures\n• Market intelligence\n• Real-time updates\n\nOur data comes from official registries, web sources, and AI-powered analysis."
  }
  
  // Pricing/account
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('premium')) {
    return "OppSpot offers different account tiers:\n\n• **Free tier** - Basic search and limited results\n• **Premium** - Full access to all features and data\n• **Enterprise** - Custom solutions for teams\n\nPremium accounts get unlimited searches, detailed reports, API access, and priority support. Would you like to know more about upgrading?"
  }
  
  // Default response
  return "I'm here to help you navigate OppSpot and find business opportunities. You can ask me about:\n\n• Finding specific companies\n• Using our analysis tools\n• Understanding features\n• M&A opportunities\n• Business intelligence\n\nWhat would you like to know?"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, session_id, context } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Generate session ID if not provided
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get AI response
    const aiResponse = getAIResponse(message)
    
    // Check if streaming is requested
    const stream = request.headers.get('accept') === 'text/event-stream'
    
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Send the response in chunks to simulate streaming
          const words = aiResponse.split(' ')
          let index = 0
          
          const interval = setInterval(() => {
            if (index < words.length) {
              const chunk = words[index] + ' '
              const data = `data: ${JSON.stringify({
                type: 'text',
                content: chunk,
                timestamp: new Date()
              })}\n\n`
              controller.enqueue(encoder.encode(data))
              index++
            } else {
              // Send final message
              const data = `data: ${JSON.stringify({
                type: 'done',
                content: aiResponse,
                confidence: 0.85
              })}\n\n`
              controller.enqueue(encoder.encode(data))
              clearInterval(interval)
              controller.close()
            }
          }, 50) // Send a word every 50ms
        }
      })
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Regular JSON response
      return NextResponse.json({
        session_id: sessionId,
        message: {
          role: 'assistant',
          content: aiResponse,
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('[AI Chat API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, return empty history
    return NextResponse.json({ 
      sessions: [],
      messages: [] 
    })
  } catch (error) {
    console.error('[AI Chat API] Error fetching history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}