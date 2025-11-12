'use client'

/**
 * Q&A Chat Interface Component
 * Feature: 008-oppspot-docs-dataroom
 * Task: T027
 *
 * Chat-style interface for asking questions about data room documents
 * with streaming answers, citations, and error handling
 */

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, Send, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  QueryResponse,
  QueryStreamEvent,
  ErrorResponse,
  CitationResponse,
  QueryMetrics,
  QA_CONSTANTS
} from '@/types/data-room-qa'

interface QAChatInterfaceProps {
  dataRoomId: string
  onCitationClick?: (citation: CitationResponse) => void
  className?: string
}

interface Message {
  id: string
  type: 'question' | 'answer' | 'error'
  content: string
  citations?: CitationResponse[]
  metrics?: QueryMetrics
  timestamp: Date
}

export function QAChatInterface({
  dataRoomId,
  onCitationClick,
  className
}: QAChatInterfaceProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [retryAllowed, setRetryAllowed] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastQuestionRef = useRef<string>('')

  // Constants from types
  const MIN_LENGTH = 5
  const MAX_LENGTH = 2000

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return

    const timer = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev === null || prev <= 1) {
          setError(null)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [rateLimitCountdown])

  const isValidQuestion = question.trim().length >= MIN_LENGTH && question.trim().length <= MAX_LENGTH

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!isValidQuestion || isProcessing) return

    const trimmedQuestion = question.trim()
    lastQuestionRef.current = trimmedQuestion

    // Add question to messages
    const questionMessage: Message = {
      id: `q-${Date.now()}`,
      type: 'question',
      content: trimmedQuestion,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, questionMessage])
    setQuestion('')
    setError(null)
    setIsProcessing(true)
    setStreamingContent('')

    try {
      const response = await fetch(`/api/data-room/${dataRoomId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          stream: true
        })
      })

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json()
        handleError(errorData)
        return
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Handle streaming response
      await handleStreamingResponse(response.body)

    } catch (err) {
      console.error('Query error:', err)
      setError({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        retry_allowed: true
      })
      setRetryAllowed(true)
      setIsProcessing(false)
    }
  }

  const handleStreamingResponse = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    const currentCitations: CitationResponse[] = []
    let queryId = ''
    let metrics: QueryMetrics | undefined

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const data = line.slice(6) // Remove 'data: ' prefix
          if (data === '[DONE]') continue

          try {
            const event: QueryStreamEvent = JSON.parse(data)

            switch (event.type) {
              case 'chunk':
                setStreamingContent(prev => prev + event.content)
                break

              case 'citation':
                currentCitations.push(event.citation)
                break

              case 'complete':
                queryId = event.query_id
                metrics = event.metrics
                break

              case 'error':
                handleError({
                  error: event.error.error_type as any,
                  message: event.error.message,
                  retry_allowed: true
                })
                setIsProcessing(false)
                return
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', parseError)
          }
        }
      }

      // Stream complete - add answer message
      if (streamingContent || currentCitations.length > 0) {
        const answerMessage: Message = {
          id: queryId || `a-${Date.now()}`,
          type: 'answer',
          content: streamingContent,
          citations: currentCitations,
          metrics,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, answerMessage])
        setStreamingContent('')
      }

    } catch (err) {
      console.error('Streaming error:', err)
      handleError({
        error: 'INTERNAL_ERROR',
        message: 'Connection interrupted. Please try again.',
        retry_allowed: true
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleError = (errorResponse: ErrorResponse) => {
    setError(errorResponse)
    setRetryAllowed(errorResponse.retry_allowed || false)

    if (errorResponse.retry_after_seconds) {
      setRateLimitCountdown(errorResponse.retry_after_seconds)
    }

    // Add error message to chat
    const errorMessage: Message = {
      id: `e-${Date.now()}`,
      type: 'error',
      content: errorResponse.message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, errorMessage])
  }

  const handleRetry = () => {
    if (!retryAllowed || !lastQuestionRef.current) return

    setQuestion(lastQuestionRef.current)
    setError(null)
    setRetryAllowed(false)

    // Wait for state update then submit
    setTimeout(() => {
      handleSubmit()
    }, 100)
  }

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Ask Questions
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 && !isProcessing && (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div className="space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-sm">Ask questions about the documents in this data room</p>
                <p className="text-xs">{`I'll provide answers with citations to specific pages`}</p>
              </div>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.type === 'question' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.type === 'question'
                    ? 'bg-primary text-primary-foreground'
                    : message.type === 'error'
                    ? 'bg-destructive/10 border border-destructive text-destructive'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                    <p className="text-xs font-medium opacity-70">Citations:</p>
                    {message.citations.map((citation, idx) => (
                      <button
                        key={idx}
                        onClick={() => onCitationClick?.(citation)}
                        className="block text-xs text-left hover:underline opacity-80 hover:opacity-100 transition-opacity"
                      >
                        [{idx + 1}] {citation.document_title} (p.{citation.page_number})
                      </button>
                    ))}
                  </div>
                )}

                {message.metrics && (
                  <p className="text-xs opacity-60 mt-2">
                    {(message.metrics.total_time_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {isProcessing && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-muted rounded-lg p-3">
                <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs opacity-60">Generating...</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isProcessing && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching documents...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                {error.message}
                {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                  <span className="block mt-1 text-xs">
                    Try again in {formatCountdown(rateLimitCountdown)}
                  </span>
                )}
              </div>
              {retryAllowed && !rateLimitCountdown && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the documents... (Shift+Enter for new line)"
              className="min-h-[80px] pr-12 resize-none"
              disabled={isProcessing || (rateLimitCountdown !== null && rateLimitCountdown > 0)}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!isValidQuestion || isProcessing || (rateLimitCountdown !== null && rateLimitCountdown > 0)}
              className="absolute bottom-2 right-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {question.length}/{MAX_LENGTH} characters
              {question.length < MIN_LENGTH && question.length > 0 && (
                <span className="text-destructive ml-1">
                  (min {MIN_LENGTH})
                </span>
              )}
            </span>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
