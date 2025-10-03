import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { modelName, ollamaUrl = 'http://localhost:11434' } = await request.json()

    if (!modelName) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to pull model' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ollama pull error:', error)
    return NextResponse.json(
      { error: 'Failed to download model' },
      { status: 500 }
    )
  }
}
