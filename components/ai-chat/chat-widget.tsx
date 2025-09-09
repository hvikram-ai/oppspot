'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChatMessage } from './chat-message'
import { CitationCard } from './citation-card'
import { useChat } from '@/hooks/use-chat'

interface ChatWidgetProps {
  defaultOpen?: boolean
  position?: 'bottom-right' | 'bottom-left'
  context?: Record<string, any>
}

export function ChatWidget({ 
  defaultOpen = false, 
  position = 'bottom-right',
  context 
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    sessionId,
    citations
  } = useChat({ context })
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || isLoading) return
    
    const userMessage = message.trim()
    setMessage('')
    await sendMessage(userMessage)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
            position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <Card className={cn(
          'fixed z-50 flex flex-col shadow-2xl transition-all duration-300',
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6',
          'w-[400px] h-[600px] max-h-[80vh]'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">OppSpot AI Assistant</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                  <p className="text-sm">Hi! I'm your AI assistant.</p>
                  <p className="text-xs mt-2">Ask me anything about OppSpot or business intelligence.</p>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  message={msg}
                  isStreaming={isStreaming && index === messages.length - 1}
                />
              ))}

              {citations.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-medium text-muted-foreground">References:</p>
                  {citations.map((citation, index) => (
                    <CitationCard key={citation.id} citation={citation} index={index + 1} />
                  ))}
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t shrink-0 bg-background">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[50px] max-h-[100px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                size="icon"
                className="h-[50px] w-[50px] shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">AI is thinking...</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  )
}