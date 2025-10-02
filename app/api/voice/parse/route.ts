import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    baseURL: 'https://openrouter.ai/api/v1'
  })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transcript } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript required' }, { status: 400 })
    }

    // Use GPT-4 to parse command
    const response = await openai.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: `You are a voice command parser for a B2B intelligence platform.
          Parse the user's voice command and extract:
          - intent: navigate, search, query, action, or unknown
          - parameters: relevant extracted data

          Examples:
          - "go to dashboard" -> { "intent": "navigate", "parameters": { "page": "dashboard" } }
          - "find tech companies in london" -> { "intent": "search", "parameters": { "industry": "tech", "location": "london" } }
          - "show me streams" -> { "intent": "navigate", "parameters": { "page": "streams" } }

          Return ONLY JSON without any markdown formatting or explanation.`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.3
    })

    const content = response.choices[0].message.content || '{}'

    // Remove markdown code blocks if present
    const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim()

    const parsed = JSON.parse(jsonContent)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[Voice Parse API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to parse command',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
