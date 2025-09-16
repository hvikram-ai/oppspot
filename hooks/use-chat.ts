'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  confidence?: number
  tool_calls?: unknown[]
}

interface Citation {
  id: string
  source_type: 'web' | 'platform' | 'document' | 'analysis'
  title: string
  url?: string
  snippet: string
  confidence: number
  relevance: number
  metadata?: Record<string, unknown>
}

interface UseChatOptions {
  context?: Record<string, unknown>
  onMessage?: (message: ChatMessage) => void
  onCitation?: (citations: Citation[]) => void
  onError?: (error: Error) => void
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamBufferRef = useRef<string>('')

  // Initialize session on mount
  useEffect(() => {
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
      // Try to get existing session from localStorage
      const storedSessionId = localStorage.getItem('chat_session_id')
      if (storedSessionId) {
        setSessionId(storedSessionId)
        await loadHistory(storedSessionId)
      }
    } catch (err) {
      console.error('Failed to initialize chat session:', err)
    }
  }

  const loadHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai-chat?session_id=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages) {
          setMessages(data.messages.map((msg: { role: string; content: string; created_at?: string; confidence_score?: number; tool_calls?: unknown[] }) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            confidence: msg.confidence_score,
            tool_calls: msg.tool_calls
          })))
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setCitations([]) // Clear previous citations
    setError(null)
    setIsLoading(true)
    setIsStreaming(false)
    streamBufferRef.current = ''

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          conversation_history: messages,
          context: {
            current_page: window.location.pathname,
            current_context: options.context,
            preferences: {
              stream: true
            }
          }
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      // Check if streaming response
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        setIsStreaming(true)
        await handleStreamResponse(response, abortController.signal)
      } else {
        // Handle regular JSON response
        const data = await response.json()
        handleNonStreamResponse(data)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted')
      } else {
        console.error('Chat error:', err)
        setError(err)
        options.onError?.(err)
        
        toast.error(err.message || 'Failed to send message')

        // Add error message to chat
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [sessionId, options, toast])

  const handleStreamResponse = async (response: Response, signal: AbortSignal) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    if (!reader) {
      throw new Error('No response body')
    }

    // Add empty assistant message that will be updated
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMessage])
    const messageIndex = messages.length + 1 // Account for user message already added

    try {
      while (true) {
        if (signal.aborted) break
        
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              handleStreamChunk(parsed, messageIndex)
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const handleStreamChunk = (chunk: any, messageIndex: number) => {
    switch (chunk.type) {
      case 'text':
        streamBufferRef.current += chunk.content
        setMessages(prev => {
          const updated = [...prev]
          if (updated[messageIndex]) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: streamBufferRef.current
            }
          }
          return updated
        })
        break

      case 'citation':
        if (chunk.citations) {
          setCitations(prev => [...prev, ...chunk.citations])
          options.onCitation?.(chunk.citations)
        }
        break

      case 'done':
        setMessages(prev => {
          const updated = [...prev]
          if (updated[messageIndex]) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: chunk.content || streamBufferRef.current,
              confidence: chunk.confidence
            }
          }
          return updated
        })
        if (chunk.citations) {
          setCitations(chunk.citations)
          options.onCitation?.(chunk.citations)
        }
        
        // Store session ID if this is the first message
        if (chunk.session_id && !sessionId) {
          setSessionId(chunk.session_id)
          localStorage.setItem('chat_session_id', chunk.session_id)
        }
        break

      case 'error':
        setError(new Error(chunk.content))
        toast.error(chunk.content)
        break
    }
  }

  const handleNonStreamResponse = (data: any) => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: data.message.content,
      timestamp: new Date().toISOString(),
      confidence: data.message.confidence,
      tool_calls: data.message.tool_calls
    }
    
    setMessages(prev => [...prev, assistantMessage])
    
    if (data.message.citations) {
      setCitations(data.message.citations)
      options.onCitation?.(data.message.citations)
    }
    
    if (data.session_id && !sessionId) {
      setSessionId(data.session_id)
      localStorage.setItem('chat_session_id', data.session_id)
    }
    
    options.onMessage?.(assistantMessage)
  }

  const clearChat = useCallback(() => {
    setMessages([])
    setCitations([])
    setSessionId(null)
    localStorage.removeItem('chat_session_id')
    setError(null)
  }, [])

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    messages,
    citations,
    sessionId,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    stopStream
  }
}