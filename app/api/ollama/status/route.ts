import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const ollamaUrl = request.nextUrl.searchParams.get('url') || 'http://localhost:11434'

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { status: 'offline', error: 'Ollama server not responding' },
        { status: 503 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      status: 'online',
      models: data.models?.map((m: unknown) => m.name) || [],
    })
  } catch (error) {
    console.error('Ollama status check failed:', error)
    return NextResponse.json(
      { status: 'offline', error: 'Failed to connect to Ollama server' },
      { status: 503 }
    )
  }
}
