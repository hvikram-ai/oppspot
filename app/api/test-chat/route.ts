import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body
    
    // Simple fallback response without any dependencies
    const responses: Record<string, string> = {
      'hello': "Hello! I'm your OppSpot AI assistant. How can I help you today?",
      'help': "I can help you with:\n• Finding companies\n• Similarity analysis\n• M&A opportunities\n• Platform navigation\n\nWhat would you like to know?",
      'default': "I'm here to help you with OppSpot. What would you like to know?"
    }
    
    const lowerMessage = (message || '').toLowerCase()
    let response = responses.default
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = responses.hello
    } else if (lowerMessage.includes('help')) {
      response = responses.help
    }
    
    return NextResponse.json({
      session_id: `test_${Date.now()}`,
      message: {
        role: 'assistant',
        content: response,
        confidence: 0.8
      }
    })
  } catch (error) {
    console.error('[Test Chat API] Error:', error)
    return NextResponse.json(
      { error: 'Test chat error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}