import { NextRequest, NextResponse } from 'next/server'
import { ChatOrchestrator, ChatContext, StreamChunk } from '@/lib/ai/chat-orchestrator'
import { createClient } from '@/lib/supabase/server'

// Enable streaming
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const body = await request.json()
    const { message, session_id, context } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Initialize chat orchestrator
    const orchestrator = new ChatOrchestrator()
    
    // Get or create session
    let sessionId = session_id
    if (!sessionId) {
      sessionId = await orchestrator.getOrCreateSession(
        user?.id,
        context || {}
      )
    }
    
    // Create chat context
    const chatContext: ChatContext = {
      session_id: sessionId,
      user_id: user?.id,
      current_page: context?.current_page,
      current_context: context?.current_context,
      preferences: context?.preferences
    }
    
    await orchestrator.initialize(chatContext)
    
    // Check if streaming is requested
    const stream = request.headers.get('accept') === 'text/event-stream'
    
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      // Process message with streaming
      orchestrator.processMessage(message, async (chunk: StreamChunk) => {
        const data = `data: ${JSON.stringify(chunk)}\n\n`
        await writer.write(encoder.encode(data))
      }).then(async (response) => {
        // Send final message
        const data = `data: ${JSON.stringify({
          type: 'done',
          content: response.content,
          citations: response.citations,
          confidence: response.confidence
        })}\n\n`
        await writer.write(encoder.encode(data))
        await writer.close()
      }).catch(async (error) => {
        const data = `data: ${JSON.stringify({
          type: 'error',
          content: error.message
        })}\n\n`
        await writer.write(encoder.encode(data))
        await writer.close()
      })
      
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Regular JSON response
      const response = await orchestrator.processMessage(message)
      
      return NextResponse.json({
        session_id: sessionId,
        message: response
      })
    }
  } catch (error) {
    console.error('[AI Chat API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat processing failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const searchParams = request.nextUrl.searchParams
    const session_id = searchParams.get('session_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (!session_id) {
      // Get user's recent sessions
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      return NextResponse.json({ sessions })
    } else {
      // Get messages for specific session
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          chat_citations (*)
        `)
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(limit)
      
      if (error) throw error
      
      // Check if user has access to this session
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', session_id)
        .single()
      
      if (session && (session.user_id === user?.id || !session.user_id)) {
        return NextResponse.json({ 
          session,
          messages 
        })
      } else {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        )
      }
    }
  } catch (error) {
    console.error('[AI Chat API] Error fetching history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}