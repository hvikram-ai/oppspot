'use client'

/**
 * ChatSpot™ - Chat Interface Component
 * Conversational AI interface with streaming responses
 */

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import { ResultDisplay } from './result-display'
import type { ChatMessage, SuggestedAction } from '@/lib/chatspot/types'

interface ChatInterfaceProps {
  conversationId?: string
  onConversationCreated?: (id: string) => void
}

export function ChatInterface({ conversationId, onConversationCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chatspot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: input
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update conversation ID if this was the first message
      if (!conversationId && data.conversation_id) {
        onConversationCreated?.(data.conversation_id)
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.response.id,
        conversation_id: data.conversation_id,
        role: 'assistant',
        content: data.response.content,
        intent: data.response.intent?.type,
        confidence: data.response.intent?.confidence,
        results: data.response.results,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
      setSuggestedActions(data.response.suggested_actions || [])
    } catch (error) {
      console.error('Send message error:', error)

      // Check health status to provide better error message
      let errorMessage = 'Sorry, I encountered an error processing your message. Please try again.'

      try {
        const healthResponse = await fetch('/api/chatspot/health')
        if (healthResponse.ok) {
          const health = await healthResponse.json()
          if (health.status !== 'healthy' && health.errors) {
            errorMessage = `ChatSpot is not fully configured:\n\n${health.errors.join('\n')}\n\nPlease contact support or check the setup guide.`
          }
        }
      } catch {
        // Ignore health check errors
      }

      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversation_id: conversationId || '',
          role: 'assistant',
          content: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const executeAction = async (action: SuggestedAction) => {
    console.log('Execute action:', action)
    // TODO: Implement action execution
  }

  const handleResultAction = async (action: string, data: any) => {
    console.log('Result action:', action, data)
    // TODO: Implement result actions (add to list, export, etc.)
    // For now, just log the action
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Welcome to ChatSpot™</h3>
            <p className="text-muted-foreground mb-6">
              Ask me anything about your business intelligence data
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => setInput('Find fintech companies in London that raised money this year')}
              >
                <div>
                  <div className="font-medium">Search companies</div>
                  <div className="text-sm text-muted-foreground">Find companies matching criteria</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => setInput('Research Revolut')}
              >
                <div>
                  <div className="font-medium">Research a company</div>
                  <div className="text-sm text-muted-foreground">Get detailed intelligence</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => setInput('Find companies similar to Stripe')}
              >
                <div>
                  <div className="font-medium">Find similar</div>
                  <div className="text-sm text-muted-foreground">AI-powered similarity search</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => setInput('Which accounts are showing buying signals?')}
              >
                <div>
                  <div className="font-medium">Check signals</div>
                  <div className="text-sm text-muted-foreground">Active buying intent</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${message.role === 'user' ? 'bg-blue-600 text-white' : ''}`}>
              <CardContent className="p-4">
                {/* Message content */}
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Intent badge */}
                {message.intent && message.role === 'assistant' && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {message.intent} ({Math.round((message.confidence || 0) * 100)}%)
                    </Badge>
                  </div>
                )}

                {/* Results */}
                {message.results && message.results.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.results.map((result, idx) => (
                      <div key={idx} className="border-t pt-3">
                        <ResultDisplay result={result} onAction={handleResultAction} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {message.error && (
                  <div className="mt-2 text-xs text-red-400">
                    Error: {message.error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="border-t p-4">
          <div className="text-sm font-medium mb-2">Suggested actions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => executeAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything... 'Find fintech companies in London' or 'Research Revolut'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Try: "Find SaaS companies that raised Series A" or "Who should I contact at Stripe?"
        </p>
      </div>
    </div>
  )
}
