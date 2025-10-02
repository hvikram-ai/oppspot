'use client'

/**
 * ChatSpot™ - Main Dashboard Page
 * Conversational AI interface for oppSpot
 */

import { useState } from 'react'
import { ChatInterface } from '@/components/chatspot/chat-interface'
import { Card } from '@/components/ui/card'
import { Sparkles, MessageSquare, Zap } from 'lucide-react'

export default function ChatSpotPage() {
  const [conversationId, setConversationId] = useState<string>()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          ChatSpot™
        </h1>
        <p className="text-muted-foreground mt-1">
          Talk to your data - no forms, no filters, just conversation
        </p>
      </div>

      {/* Chat Interface */}
      <Card className="h-[calc(100%-6rem)]">
        <ChatInterface
          conversationId={conversationId}
          onConversationCreated={setConversationId}
        />
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Natural Language</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ask questions like you would ask a colleague - no learning curve
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Instant Actions</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Search, research, export, and analyze - all from one conversation
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">AI-Powered</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Understands context and suggests relevant next steps
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
