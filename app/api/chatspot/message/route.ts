/**
 * ChatSpot™ API - Send Message
 * Process user messages and generate AI responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChatService } from '@/lib/chatspot/chat-service'
import type { SendMessageRequest } from '@/lib/chatspot/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request
    const body: SendMessageRequest = await request.json()

    if (!body.message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    // Process message
    const response = await ChatService.processMessage(
      user.id,
      body.message,
      body.conversation_id
    )

    return NextResponse.json({
      success: true,
      conversation_id: response.message.conversation_id,
      message: response.message,
      response: {
        id: response.message.id,
        content: response.message.content,
        intent: response.intent,
        results: response.results,
        suggested_actions: response.suggested_actions
      }
    })
  } catch (error) {
    console.error('[API] ChatSpot message error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Message processing failed' },
      { status: 500 }
    )
  }
}
