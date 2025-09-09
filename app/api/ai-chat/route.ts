import { NextRequest, NextResponse } from 'next/server'
import { SimpleOllamaClient } from '@/lib/ai/simple-ollama'
import { findBestMatch } from '@/lib/ai/knowledge-base'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Ollama client
const ollama = new SimpleOllamaClient()

// Enhanced system prompt with examples and better context
const SYSTEM_PROMPT = `You are OppSpot AI Assistant, specialized in helping users navigate the OppSpot business intelligence platform and find M&A opportunities.

IMPORTANT: Stay focused on OppSpot features and business intelligence. Always provide specific, actionable answers.

OppSpot Platform Overview:
• Database: 4.5M+ UK & Ireland companies with real-time updates
• Key Features: Company Search, Similarity Analysis, OppScan (M&A scanner)
• Data Points: Financials, ownership, directors, credit ratings, news
• Industries: All UK SIC codes, focus on tech, healthcare, manufacturing

Example Good Responses:

Q: "How do I find tech companies?"
A: "To find tech companies in OppSpot:
1. Use Quick Search and enter 'technology' or specific keywords
2. Apply Industry Filter > Technology (SIC codes 62-63)
3. Add filters for location, size, or revenue
4. Or use OppScan with 'Technology' sector for comprehensive results
Would you like help with specific criteria?"

Q: "What is similarity analysis?"
A: "Similarity Analysis finds companies like your target using AI. It analyzes:
• Financial metrics (revenue, growth)
• Market position
• Business model
• Risk factors
Click 'Find Similar' on any company profile to start. You can adjust weights for each factor."

Q: "yes, for Patsnap"
A: "To find companies similar to Patsnap:
1. Search 'Patsnap' in Quick Search
2. Open their company profile
3. Click 'Find Similar Companies'
4. For IP/patent companies, increase weight on 'Technology' and 'Innovation' factors
5. Review results ranked by similarity percentage
This will show IP analytics, patent search, and innovation intelligence companies similar to Patsnap."

Guidelines:
1. Be specific - mention exact features and steps
2. Be concise - 2-3 sentences for simple questions, bullet points for complex ones
3. Be helpful - always suggest next steps
4. Stay on topic - focus on OppSpot and business intelligence
5. Use formatting - bold for features, bullets for lists
6. Handle follow-ups - When users say "yes" or give company names, provide specific instructions for that case

When you don't know something specific about OppSpot, guide users to relevant features or suggest contacting support.`

// Enhanced fallback responses using knowledge base
const getFallbackResponse = (message: string): string => {
  // First try to find a match in the knowledge base
  const kbMatch = findBestMatch(message)
  if (kbMatch) {
    return kbMatch.response
  }
  
  // If no match, provide a helpful default response
  const lowerMessage = message.toLowerCase().trim()
  
  // Check for specific questions about LLM/AI
  if (lowerMessage.includes('llm') || lowerMessage.includes('model') || lowerMessage.includes('what are you using')) {
    return "I'm powered by advanced LLMs (currently Phi-3.5 and TinyLlama) through Ollama for intelligent responses. This enables me to understand your questions about OppSpot and provide specific guidance on finding companies, using our analysis tools, and discovering M&A opportunities. What would you like to know about OppSpot?"
  }
  
  // Default helpful response with specific options
  return "I can help you with OppSpot's features. Here are some things you can ask me:\n\n• How to search for companies\n• What is Similarity Analysis\n• How OppScan works for M&A discovery\n• Data coverage and sources\n• Pricing and plans\n• API integration\n\nWhat would you like to know?"
}

// Validate that response is relevant to OppSpot and the question
const validateResponse = (response: string, question: string): boolean => {
  const lowerResponse = response.toLowerCase()
  const lowerQuestion = question.toLowerCase()
  
  // Check if response mentions OppSpot or related terms
  const oppspotTerms = ['oppspot', 'platform', 'companies', 'business', 'search', 'analysis', 'oppscan', 'similarity', 'uk', 'ireland', 'm&a', 'acquisition', 'filter', 'export', 'data', 'dashboard']
  const hasOppSpotContext = oppspotTerms.some(term => lowerResponse.includes(term))
  
  // Check if response is too generic or off-topic
  const genericPhrases = ['i dont have access', 'i cannot', 'as an ai', 'i am not able', 'language model', 'i apologize but i dont', 'im sorry but', 'unfortunately i', 'as a language model']
  const isGeneric = genericPhrases.some(phrase => lowerResponse.includes(phrase))
  
  // Extract meaningful keywords from question (ignore common words)
  const stopWords = ['what', 'how', 'can', 'the', 'and', 'for', 'with', 'you', 'help', 'me', 'find', 'get', 'show']
  const questionKeywords = lowerQuestion
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
  
  // Check if response addresses the question keywords (at least 30% match)
  const keywordMatches = questionKeywords.filter(keyword => lowerResponse.includes(keyword))
  const addressesQuestion = keywordMatches.length >= Math.max(1, Math.floor(questionKeywords.length * 0.3))
  
  // Check for actionable content (steps, instructions, features)
  const hasActionableContent = /\b(click|select|go to|use|enter|search|filter|export|navigate|open|choose|add|create)\b/i.test(response)
  
  // Response is valid if it's specific, relevant, and actionable
  return (hasOppSpotContext || (addressesQuestion && hasActionableContent)) && !isGeneric && response.length > 50
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
        // Using phi3.5 as primary (best balance of speed and quality)
        const modelsToTry = ['phi3.5:3.8b', 'tinyllama:1.1b']
        const availableModels = await ollama.getModels()
        
        for (const model of modelsToTry) {
          if (availableModels.includes(model)) {
            try {
              aiResponse = await ollama.chat(messages, {
                model,
                temperature: 0.5, // Lower temperature for more focused responses
                stream: false,
                systemPrompt: SYSTEM_PROMPT
              })
              
              if (aiResponse && aiResponse.trim().length > 0) {
                // Validate response relevance
                const isRelevant = validateResponse(aiResponse, message)
                if (isRelevant) {
                  usedModel = model
                  confidence = 0.95
                  console.log(`[AI Chat] Successfully used ${model}`)
                  break
                } else {
                  console.warn(`[AI Chat] Response from ${model} was not relevant, trying next model`)
                  aiResponse = '' // Clear for next attempt
                }
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