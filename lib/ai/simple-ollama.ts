/**
 * Simple Ollama integration for chat
 */

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaResponse {
  model: string
  created_at: string
  message?: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  eval_count?: number
}

export class SimpleOllamaClient {
  private baseUrl: string
  private defaultModel: string
  
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    // Use mistral as default, with llama3.3 as alternative
    this.defaultModel = process.env.OLLAMA_MODEL || 'mistral:7b'
  }
  
  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      })
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) return []
      const data = await response.json()
      return data.models?.map((m: any) => m.name) || []
    } catch {
      return []
    }
  }
  
  /**
   * Chat with Ollama
   */
  async chat(
    messages: OllamaMessage[], 
    options: {
      model?: string
      temperature?: number
      stream?: boolean
      systemPrompt?: string
    } = {}
  ): Promise<string> {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      stream = false,
      systemPrompt
    } = options
    
    try {
      // Prepare messages with system prompt if provided
      const finalMessages = [...messages]
      if (systemPrompt && !messages.some(m => m.role === 'system')) {
        finalMessages.unshift({
          role: 'system',
          content: systemPrompt
        })
      }
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: finalMessages,
          stream,
          options: {
            temperature,
            num_predict: 1000,
            top_k: 40,
            top_p: 0.9
          }
        }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }
      
      if (stream) {
        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        
        if (!reader) throw new Error('No response body')
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.message?.content) {
                fullResponse += data.message.content
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
        
        return fullResponse
      } else {
        // Handle regular response
        const data: OllamaResponse = await response.json()
        return data.message?.content || ''
      }
    } catch (error) {
      console.error('[SimpleOllama] Error:', error)
      throw error
    }
  }
  
  /**
   * Generate response for a simple prompt
   */
  async generate(prompt: string, model?: string): Promise<string> {
    return this.chat([
      { role: 'user', content: prompt }
    ], { model, stream: false })
  }
}