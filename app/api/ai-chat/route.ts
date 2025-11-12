/**
 * AI Chat API Route
 *
 * Migrated to use LLMManager system for unified multi-provider support.
 * LLMManager automatically handles provider selection, fallback, and usage tracking.
 *
 * Migration: Phase 4.4 - Replaced direct Ollama/OpenRouter calls with getUserLLMManager()
 */

import { NextRequest, NextResponse } from 'next/server'
import { findBestMatch } from '@/lib/ai/knowledge-base'
import { PlatformChatOrchestrator } from '@/lib/ai/platform-chat-orchestrator'
import { getUserLLMManager } from '@/lib/ai/llm-client-wrapper'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize platform orchestrator
const platformOrchestrator = new PlatformChatOrchestrator()

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


// Convert chat history + KB priming to message format
function convertToMessages(
  currentMessage: string,
  history?: Array<{ role: string; content: string }>,
  kbContext?: string
) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

  // Add system prompt
  messages.push({
    role: 'system',
    content: SYSTEM_PROMPT
  })

  // Add lightweight KB priming to steer relevance
  if (kbContext) {
    messages.push({
      role: 'system',
      content: `Relevant OppSpot context to use in your answer:\n${kbContext}`,
    })
  }

  // Map previous history
  if (Array.isArray(history)) {
    for (const h of history) {
      const role = h.role === 'assistant' || h.role === 'system' ? (h.role as 'assistant' | 'system') : 'user'
      messages.push({ role, content: h.content })
    }
  }

  // Current user message last
  messages.push({ role: 'user', content: currentMessage })
  return messages
}

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
    return "I'm powered by oppSpot's multi-provider LLM system, which automatically selects the best available AI model (local Ollama, OpenAI, Anthropic, or OpenRouter) to answer your questions. This enables me to understand your questions about OppSpot and provide specific guidance on finding companies, using our analysis tools, and discovering M&A opportunities. What would you like to know about OppSpot?"
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

// (old convertToOllamaMessages removed in favor of KB-primed version above)

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

    let aiResponse: string = ''
    let confidence = 0.85
    let usedModel = 'fallback'
    interface PlatformData {
      topMatches?: Array<{
        company_name?: string
        name?: string
        website?: string
        similarity_reasoning?: string
        relevance?: number
        overall_score?: number
      }>
      [key: string]: unknown
    }
    
    interface Citation {
      id: string
      source_type: string
      title: string
      url?: string
      snippet: string
      relevance?: number
      confidence?: number
      metadata?: { source: string }
    }
    
    let platformData: PlatformData | null = null
    let collectedCitations: Citation[] = []
    
    // Short-circuit: answer LLM/model identity questions directly
    const lower = String(message).toLowerCase()
    if (/(\bllm\b|which\s+llm|which\s+model|what\s+model|model\s+are\s+you|are\s+you\s+using\s+.*model)/.test(lower)) {
      try {
        const manager = await getUserLLMManager('system')

        const parts: string[] = []
        parts.push("I'm powered by oppSpot's intelligent LLM Manager, which automatically")
        parts.push("selects the best available AI provider (Local Ollama, OpenAI, Anthropic, or OpenRouter)")
        parts.push("based on your configuration and availability. This ensures reliable, high-quality responses.")
        parts.push('Responses are tailored to OppSpot features and workflows.')

        aiResponse = parts.join(' ')
        usedModel = 'llm_manager'
        confidence = 0.95

        await manager.cleanup()

        const stream = request.headers.get('accept') === 'text/event-stream'
        if (stream) {
          const encoder = new TextEncoder()
          const readable = new ReadableStream({
            start(controller) {
              const modelData = `data: ${JSON.stringify({ type: 'model', model: usedModel, timestamp: new Date() })}\n\n`
              controller.enqueue(encoder.encode(modelData))
              const words = aiResponse.split(' ')
              let index = 0
              const interval = setInterval(() => {
                if (index < words.length) {
                  const chunk = words[index] + ' '
                  const data = `data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`
                  controller.enqueue(encoder.encode(data))
                  index++
                } else {
                  const data = `data: ${JSON.stringify({ type: 'done', content: aiResponse, confidence, model: usedModel, session_id: sessionId })}\n\n`
                  controller.enqueue(encoder.encode(data))
                  clearInterval(interval)
                  controller.close()
                }
              }, 20)
            }
          })
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            }
          })
        }

        return NextResponse.json({
          session_id: sessionId,
          message: {
            role: 'assistant',
            content: aiResponse,
            confidence,
            model: usedModel,
            timestamp: new Date().toISOString(),
          }
        })
      } catch (e) {
        // If this path fails, continue with normal orchestration
        console.warn('[AI Chat] LLM status short-circuit failed:', e)
      }
    }
    
    // First, try to use Platform Orchestrator for intelligent responses
    try {
      console.log('[AI Chat] Attempting platform orchestration for:', message)
      
      const platformContext = {
        sessionId,
        conversationHistory: conversation_history || [],
        currentCompany: context?.current_company,
        previousCompanies: context?.previous_companies,
        lastAction: context?.last_action,
        userPreferences: context?.preferences
      }
      
      const platformResult = await platformOrchestrator.processMessage(message, platformContext)
      
      if (platformResult.success && platformResult.formattedResponse) {
        console.log('[AI Chat] Platform orchestrator succeeded')
        aiResponse = platformResult.formattedResponse
        confidence = 0.95
        usedModel = 'platform_orchestrator'
        platformData = platformResult.data as PlatformData | null
        // Derive lightweight citations from platform data if available
        try {
          const typedData = platformResult.data as PlatformData
          if (typedData?.topMatches?.length) {
            collectedCitations = typedData.topMatches!.slice(0, 5).map((m, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              source_type: 'analysis',
              title: m.company_name || m.name || 'Similar company',
              url: m.website || undefined,
              snippet: m.similarity_reasoning || 'Similar by AI analysis',
              confidence: typeof m.overall_score === 'number' ? Math.min(Math.max(m.overall_score / 100, 0), 1) : 0.8,
              relevance: 0.9,
              metadata: { source: 'similarity_analysis' }
            }))
          }
        } catch {}

        // Add suggested actions if available
        if (platformResult.suggestedActions && platformResult.suggestedActions.length > 0) {
          aiResponse += '\n\n**What would you like to do next?**\n'
          platformResult.suggestedActions.forEach((action: string, index: number) => {
            aiResponse += `${index + 1}. ${action}\n`
          })
        }
      } else {
        // Platform orchestrator didn't provide a formatted response, continue with Ollama
        console.log('[AI Chat] Platform orchestrator returned no formatted response, falling back to Ollama')
        throw new Error('No formatted response from platform orchestrator')
      }
    } catch (platformError) {
      console.log('[AI Chat] Platform orchestration failed or incomplete, using LLM Manager:', platformError)

      // Fall back to LLM Manager for general responses
      const manager = await getUserLLMManager('system')

      try {
        console.log('[AI Chat] Using LLM Manager for response generation')

        // Convert messages with KB priming
        const kb = findBestMatch(message)
        const messages = convertToMessages(message, conversation_history, kb?.response)

        // Use LLM Manager - it automatically handles provider selection and fallback
        const response = await manager.chat(messages, {
          temperature: 0.4, // Lower for focused responses
          maxTokens: 700,
          feature: 'ai-chat', // Track usage under ai-chat feature
        })

        if (response && response.content && response.content.trim().length > 0) {
          aiResponse = response.content

          // Validate response relevance
          const isRelevant = validateResponse(aiResponse, message)
          if (isRelevant) {
            usedModel = response.model || 'llm_manager'
            confidence = 0.95
            console.log(`[AI Chat] Successfully generated response with LLM Manager`)
          } else {
            console.warn(`[AI Chat] Response was not relevant, using fallback`)
            aiResponse = getFallbackResponse(message)
            usedModel = 'fallback'
            confidence = 0.75
          }
        } else {
          throw new Error('No valid response from LLM Manager')
        }
      } catch (llmError) {
        console.warn('[AI Chat] LLM Manager failed, using static fallback:', llmError)
        aiResponse = getFallbackResponse(message)
        usedModel = 'fallback'
        confidence = 0.75
      } finally {
        await manager.cleanup()
      }
    } // End of platform error catch block
    
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
          
          // Send citations early if present
          if (collectedCitations.length) {
            const citeData = `data: ${JSON.stringify({
              type: 'citation',
              citations: collectedCitations
            })}\n\n`
            controller.enqueue(encoder.encode(citeData))
          }
          
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
                model: usedModel,
                session_id: sessionId,
                citations: collectedCitations
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
          timestamp: new Date().toISOString(),
          platform_data: platformData, // Include platform data if available
          citations: collectedCitations
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

    // Check LLM Manager status
    if (action === 'status') {
      // Try to get LLM Manager status with graceful fallback
      try {
        const manager = await getUserLLMManager('system')

        try {
          return NextResponse.json({
            llm_manager: {
              enabled: true,
              system: 'multi-provider',
              description: 'Automatic provider selection with fallback support',
              providers: 'Local Ollama, OpenAI, Anthropic, OpenRouter'
            }
          })
        } finally {
          await manager.cleanup()
        }
      } catch (managerError) {
        // If LLM Manager initialization fails, return degraded status instead of error
        console.warn('[AI Chat API] LLM Manager initialization failed:', managerError)
        return NextResponse.json({
          llm_manager: {
            enabled: false,
            system: 'unavailable',
            description: 'LLM Manager initialization failed - degraded mode',
            providers: 'None available',
            error: managerError instanceof Error ? managerError.message : 'Unknown error'
          }
        })
      }
    }

    // Return empty history for now
    return NextResponse.json({
      sessions: [],
      messages: []
    })
  } catch (error) {
    console.error('[AI Chat API] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

/**
 * Legacy OpenRouter functions removed - LLMManager now handles all provider interactions
 * including OpenRouter, with automatic fallback and usage tracking.
 *
 * For streaming support with LLMManager, see the future streaming implementation in LLMManager.
 */
