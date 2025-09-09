import { NextRequest, NextResponse } from 'next/server'
import { SimpleOllamaClient } from '@/lib/ai/simple-ollama'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Ollama client
const ollama = new SimpleOllamaClient()

// System prompt for OppSpot AI
const SYSTEM_PROMPT = `You are OppSpot AI Assistant, a helpful and knowledgeable AI that assists users with business intelligence, M&A analysis, and navigating the OppSpot platform.

OppSpot is a comprehensive business intelligence platform focused on UK & Ireland companies with features including:
- Company search and discovery across 4.5M+ businesses
- Similarity Analysis using AI to find similar companies
- OppScan for M&A opportunity discovery
- Financial data, ownership information, and market intelligence
- API access and integrations

Be helpful, professional, and concise. Provide specific guidance and actionable information. When users ask about features, explain how to use them. When they need data, guide them to the right tools.`

// Enhanced fallback responses for when Ollama is unavailable
const getFallbackResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase().trim()
  
  // Remove common words for better matching
  const keywords = lowerMessage
    .replace(/\b(the|a|an|is|are|what|how|can|you|i|me|my|do|does|tell|about|more|please|thanks|thank)\b/g, '')
    .trim()
  
  // Check for specific questions about LLM/AI
  if (keywords.includes('llm') || keywords.includes('model') || keywords.includes('ai') || lowerMessage.includes('what llm')) {
    return "I'm powered by advanced LLMs including Mistral and LLaMA models through Ollama, providing intelligent, context-aware responses. This enables me to:\n\n• Understand complex business questions\n• Provide detailed analysis\n• Offer personalized guidance\n• Learn from context\n\nI can help you navigate OppSpot's features, find companies, analyze opportunities, and answer your business intelligence questions!"
  }
  
  // Specific greetings
  if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
    return "Hello! I'm your OppSpot AI assistant. I can help you with business intelligence, M&A analysis, and navigating the platform. What would you like to know?"
  }
  
  // Feature-specific responses
  if (keywords.includes('similarity') || keywords.includes('similar')) {
    return "The **Similarity Analysis** feature uses AI to find companies similar to your target based on multiple dimensions:\n\n• **Financial metrics** - Revenue, growth, profitability\n• **Strategic positioning** - Market position, competitive advantages\n• **Operational characteristics** - Business model, operations\n• **Market factors** - Industry trends, market dynamics\n• **Risk profiles** - Business risks, market risks\n\nTo use it:\n1. Go to any company profile\n2. Click 'Find Similar Companies'\n3. Adjust the similarity parameters\n4. View ranked results with match scores\n\nWould you like to try it with a specific company?"
  }
  
  if (keywords.includes('oppscan') || keywords.includes('opp scan')) {
    return "**OppScan** is our comprehensive M&A opportunity scanner that:\n\n• **Multi-source search** - Scans Companies House, web data, and proprietary databases\n• **Smart filtering** - Industry, size, location, financial criteria\n• **AI analysis** - Evaluates strategic fit and opportunity quality\n• **Real-time alerts** - Notifies you of new opportunities\n• **Detailed reports** - Complete intelligence on each target\n\nTo start a scan:\n1. Click 'New Scan' from the dashboard\n2. Set your search criteria\n3. Review and refine results\n4. Export or save promising targets\n\nWhat criteria are important for your search?"
  }
  
  // Default helpful response
  return "I can help you with OppSpot's features including company search, similarity analysis, OppScan for M&A opportunities, and more. What would you like to know?"
}

// Convert conversation history to Ollama format
const convertToOllamaMessages = (
  currentMessage: string,
  conversationHistory: any[] = []
): any[] => {
  const messages = []
  
  // Add conversation history (last 5 messages for context)
  const recentHistory = conversationHistory.slice(-5)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })
  }
  
  // Add current message
  messages.push({
    role: 'user',
    content: currentMessage
  })
  
  return messages
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, session_id, context, conversation_history } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Generate session ID if not provided
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    let aiResponse: string
    let confidence = 0.85
    let usedModel = 'fallback'
    
    // Try to use Ollama if available
    const ollamaAvailable = await ollama.isAvailable()
    
    if (ollamaAvailable) {
      try {
        console.log('[AI Chat] Using Ollama for response generation')
        
        // Convert messages to Ollama format
        const messages = convertToOllamaMessages(message, conversation_history)
        
        // Try different models in order of preference
        // Using mistral first as it gives better responses, tinyllama as fast fallback
        const modelsToTry = ['mistral:7b', 'tinyllama:1.1b', 'phi3.5:3.8b']
        const availableModels = await ollama.getModels()
        
        for (const model of modelsToTry) {
          if (availableModels.includes(model)) {
            try {
              aiResponse = await ollama.chat(messages, {
                model,
                temperature: 0.7,
                stream: false,
                systemPrompt: SYSTEM_PROMPT
              })
              
              if (aiResponse && aiResponse.trim().length > 0) {
                usedModel = model
                confidence = 0.95
                console.log(`[AI Chat] Successfully used ${model}`)
                break
              }
            } catch (modelError) {
              console.warn(`[AI Chat] Failed with ${model}:`, modelError)
              continue
            }
          }
        }
        
        // If no model worked, use fallback
        if (!aiResponse || aiResponse.trim().length === 0) {
          throw new Error('No valid response from Ollama')
        }
      } catch (ollamaError) {
        console.warn('[AI Chat] Ollama failed, using fallback:', ollamaError)
        aiResponse = getFallbackResponse(message)
        usedModel = 'fallback'
        confidence = 0.75
      }
    } else {
      console.log('[AI Chat] Ollama not available, using fallback')
      aiResponse = getFallbackResponse(message)
      usedModel = 'fallback'
      confidence = 0.75
    }
    
    // Ensure we have a response
    if (!aiResponse || aiResponse.trim().length === 0) {
      aiResponse = getFallbackResponse(message)
      usedModel = 'fallback'
      confidence = 0.75
    }
    
    // Check if streaming is requested
    const stream = request.headers.get('accept') === 'text/event-stream'
    
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Send model info first
          const modelData = `data: ${JSON.stringify({
            type: 'model',
            model: usedModel,
            timestamp: new Date()
          })}\n\n`
          controller.enqueue(encoder.encode(modelData))
          
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
                confidence,
                model: usedModel
              })}\n\n`
              controller.enqueue(encoder.encode(data))
              clearInterval(interval)
              controller.close()
            }
          }, 20) // Faster streaming for better UX
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
          confidence,
          model: usedModel,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    console.error('[AI Chat API] Error:', error)
    
    // Return a helpful error response
    const errorMessage = "I apologize, but I encountered an issue processing your request. Please try again, or ask your question in a different way."
    
    return NextResponse.json({
      session_id: `error_${Date.now()}`,
      message: {
        role: 'assistant',
        content: errorMessage,
        confidence: 0.5,
        model: 'error',
        timestamp: new Date().toISOString()
      }
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    
    // Check Ollama status
    if (action === 'status') {
      const isAvailable = await ollama.isAvailable()
      const models = isAvailable ? await ollama.getModels() : []
      
      return NextResponse.json({
        ollama: {
          available: isAvailable,
          models,
          preferredModel: 'mistral:7b'
        }
      })
    }
    
    // Return empty history for now
    return NextResponse.json({ 
      sessions: [],
      messages: [] 
    })
  } catch (error) {
    console.error('[AI Chat API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    )
  }
}