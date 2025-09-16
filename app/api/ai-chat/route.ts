import { NextRequest, NextResponse } from 'next/server'
import { SimpleOllamaClient } from '@/lib/ai/simple-ollama'
import { findBestMatch } from '@/lib/ai/knowledge-base'
import { PlatformChatOrchestrator } from '@/lib/ai/platform-chat-orchestrator'
import { OpenRouterClient } from '@/lib/ai/openrouter'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize clients
const ollama = new SimpleOllamaClient()
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

// Build prioritized model list from env or sensible defaults
function getPreferredModels(): string[] {
  const fromEnv = process.env.OLLAMA_CHAT_MODELS
  if (fromEnv) {
    return fromEnv.split(',').map(m => m.trim()).filter(Boolean)
  }
  // Defaults align with scripts/setup-ollama.sh
  return ['mistral:7b', 'llama3.2:3b', 'llama3.2:1b', 'phi:2.7b']
}

// Convert chat history + KB priming to Ollama message format
function convertToOllamaMessages(
  currentMessage: string,
  history?: Array<{ role: string; content: string }>,
  kbContext?: string
) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

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
    
    let aiResponse: string
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
        const ollamaAvailable = await ollama.isAvailable()
        const installed = ollamaAvailable ? await ollama.getModels() : []
        const preferred = getPreferredModels().filter(m => installed.includes(m))
        const hasOpenRouter = !!process.env.OPENROUTER_API_KEY

        const parts: string[] = []
        if (ollamaAvailable && (preferred.length || installed.length)) {
          parts.push(`I'm using local Ollama models (${(preferred.length ? preferred : installed).join(', ')}).`)
        } else if (ollamaAvailable) {
          parts.push('Ollama is available locally, but no preferred models are installed.')
        } else {
          parts.push('Local Ollama is not available in this environment.')
        }
        if (hasOpenRouter) {
          parts.push('A cloud fallback via OpenRouter is configured for reliability.')
        }
        parts.push('Responses are tailored to OppSpot features and workflows.')

        aiResponse = parts.join(' ')
        usedModel = ollamaAvailable ? 'ollama' : (hasOpenRouter ? 'openrouter' : 'fallback')
        confidence = (ollamaAvailable || hasOpenRouter) ? 0.95 : 0.8

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
        platformData = platformResult.data
        // Derive lightweight citations from platform data if available
        try {
          if (platformResult.data?.topMatches?.length) {
            collectedCitations = (platformResult.data as PlatformData).topMatches!.slice(0, 5).map((m, idx: number) => ({
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
      console.log('[AI Chat] Platform orchestration failed or incomplete, using Ollama:', platformError)
      
      // Fall back to Ollama for general responses
      const ollamaAvailable = await ollama.isAvailable()
      
      if (ollamaAvailable) {
        try {
          console.log('[AI Chat] Using Ollama for response generation')
        
        // Convert messages to Ollama format with KB priming
        const kb = findBestMatch(message)
        const messages = convertToOllamaMessages(message, conversation_history, kb?.response)
        
        // Try different models in order of preference (aligned with installed models)
        const modelsToTry = getPreferredModels()
        const availableModels = await ollama.getModels()
        
        for (const model of modelsToTry) {
          if (availableModels.includes(model)) {
            try {
              aiResponse = await ollama.chat(messages, {
                model,
                temperature: 0.4, // lower for focus
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
        
        // If no model worked, try OpenRouter before fallback
        if (!aiResponse || aiResponse.trim().length === 0) {
          throw new Error('No valid response from Ollama')
        }
      } catch (ollamaError) {
        console.warn('[AI Chat] Ollama failed, considering OpenRouter fallback:', ollamaError)
        // Attempt OpenRouter if API key is present
        const orKey = process.env.OPENROUTER_API_KEY
        if (orKey) {
          try {
            const kb = findBestMatch(message)
            const prompt = buildOpenRouterPrompt(message, conversation_history, kb?.response)
            const stream = request.headers.get('accept') === 'text/event-stream'
            if (stream) {
              // Stream tokens from OpenRouter to client
              return await streamOpenRouter(sessionId, prompt, SYSTEM_PROMPT)
            } else {
              const client = new OpenRouterClient(orKey)
              aiResponse = await client.complete(prompt, {
                system_prompt: SYSTEM_PROMPT,
                temperature: 0.4,
                max_tokens: 700,
              })
              usedModel = 'openrouter'
              confidence = 0.9
            }
          } catch (orError) {
            console.warn('[AI Chat] OpenRouter fallback failed, using static fallback:', orError)
            aiResponse = getFallbackResponse(message)
            usedModel = 'fallback'
            confidence = 0.75
          }
        } else {
          aiResponse = getFallbackResponse(message)
          usedModel = 'fallback'
          confidence = 0.75
        }
      }
    } else {
      console.log('[AI Chat] Ollama not available; checking OpenRouter')
      const orKey = process.env.OPENROUTER_API_KEY
      if (orKey) {
        try {
          const kb = findBestMatch(message)
          const prompt = buildOpenRouterPrompt(message, conversation_history, kb?.response)
          const stream = request.headers.get('accept') === 'text/event-stream'
          if (stream) {
            return await streamOpenRouter(sessionId, prompt, SYSTEM_PROMPT)
          } else {
            const client = new OpenRouterClient(orKey)
            aiResponse = await client.complete(prompt, {
              system_prompt: SYSTEM_PROMPT,
              temperature: 0.4,
              max_tokens: 700,
            })
            usedModel = 'openrouter'
            confidence = 0.9
          }
        } catch (orError) {
          console.warn('[AI Chat] OpenRouter failed, using static fallback:', orError)
          aiResponse = getFallbackResponse(message)
          usedModel = 'fallback'
          confidence = 0.75
        }
      } else {
        aiResponse = getFallbackResponse(message)
        usedModel = 'fallback'
        confidence = 0.75
      }
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
    
    // Check Ollama status
    if (action === 'status') {
      const isAvailable = await ollama.isAvailable()
      const models = isAvailable ? await ollama.getModels() : []
      const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
      
      return NextResponse.json({
        ollama: {
          available: isAvailable,
          models,
          preferredModel: 'mistral:7b'
        },
        openrouter: {
          configured: hasOpenRouter
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

// Build an OpenRouter prompt that includes brief recent history and a KB hint
function buildOpenRouterPrompt(
  message: string,
  conversation_history?: Array<{ role: string; content: string }>,
  kbHint?: string
): string {
  const parts: string[] = []
  if (kbHint) {
    parts.push('Context to consider (from OppSpot KB):')
    parts.push(kbHint)
    parts.push('---')
  }
  if (Array.isArray(conversation_history) && conversation_history.length) {
    const recent = conversation_history.slice(-5)
    parts.push('Recent conversation:')
    for (const h of recent) {
      const role = h.role === 'assistant' ? 'Assistant' : 'User'
      parts.push(`${role}: ${h.content}`)
    }
    parts.push('---')
  }
  parts.push('User question:')
  parts.push(message)
  parts.push('\nPlease answer with concrete, OppSpot-specific guidance and actionable steps.')
  return parts.join('\n')
}

// Stream OpenRouter responses to the client as SSE tokens
async function streamOpenRouter(sessionId: string, prompt: string, systemPrompt?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY!
  const baseUrl = 'https://openrouter.ai/api/v1'
  const model = 'anthropic/claude-3-haiku'
  const encoder = new TextEncoder()

  // Prepare request body
  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://oppspot.com',
      'X-Title': 'OppSpot Business Platform'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 700,
      stream: true
    })
  })

  if (!resp.ok || !resp.body) {
    // Fall back to normal flow by throwing; caller handles
    throw new Error(`OpenRouter stream error: ${resp.status}`)
  }

  let full = ''
  const reader = resp.body.getReader()
  const readable = new ReadableStream({
    async start(controller) {
      // Send model info
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'model', model: 'openrouter', timestamp: new Date() })}\n\n`))
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.replace(/^data: ?/, '').trim()
            if (!data || data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || ''
              if (delta) {
                full += delta
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta })}\n\n`))
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: full, confidence: 0.9, model: 'openrouter', session_id: sessionId })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
