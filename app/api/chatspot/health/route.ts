/**
 * ChatSpot™ API - Health Check
 * Verify ChatSpot dependencies are ready
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks = {
    ollama: false,
    database: false,
    mistral_model: false,
  }

  const errors: string[] = []

  try {
    // Check Ollama
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
    try {
      const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      })

      if (ollamaResponse.ok) {
        checks.ollama = true
        const data = await ollamaResponse.json()

        // Check if mistral:7b model is available
        checks.mistral_model = data.models?.some((m: unknown) =>
          (m as any).name === 'mistral:7b' || (m as any).model === 'mistral:7b'
        ) || false

        if (!checks.mistral_model) {
          errors.push('Mistral 7B model not found. Run: ollama pull mistral:7b')
        }
      } else {
        errors.push(`Ollama server returned status ${ollamaResponse.status}`)
      }
    } catch (error) {
      errors.push('Ollama not accessible. Make sure Ollama is running: ollama serve')
    }

    // Check database tables
    try {
      const supabase = await createClient()

      const { error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .limit(1)

      const { error: msgError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1)

      if (!convError && !msgError) {
        checks.database = true
      } else {
        errors.push('Chat database tables not found. Run migrations.')
      }
    } catch (error) {
      errors.push(`Database check failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    const allHealthy = checks.ollama && checks.database && checks.mistral_model

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }, {
      status: allHealthy ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      checks,
      errors: [error instanceof Error ? error.message : 'Health check failed'],
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}
