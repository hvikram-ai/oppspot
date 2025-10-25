import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Use same encryption as main route
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

// Test API key connection
async function testApiKey(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        if (openaiResponse.ok) {
          return { success: true }
        }
        return { success: false, error: 'Invalid OpenAI API key' }

      case 'anthropic':
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
        })
        if (anthropicResponse.status === 200 || anthropicResponse.status === 401) {
          return { success: anthropicResponse.status === 200 }
        }
        return { success: false, error: 'Invalid Anthropic API key' }

      case 'google':
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        if (googleResponse.ok) {
          return { success: true }
        }
        return { success: false, error: 'Invalid Google AI API key' }

      case 'openrouter':
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        if (openrouterResponse.ok) {
          return { success: true }
        }
        return { success: false, error: 'Invalid OpenRouter API key' }

      case 'mistral':
        const mistralResponse = await fetch('https://api.mistral.ai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        if (mistralResponse.ok) {
          return { success: true }
        }
        return { success: false, error: 'Invalid Mistral API key' }

      case 'cohere':
        const cohereResponse = await fetch('https://api.cohere.ai/v1/check-api-key', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        if (cohereResponse.ok) {
          return { success: true }
        }
        return { success: false, error: 'Invalid Cohere API key' }

      default:
        return { success: false, error: `Provider ${provider} not supported for testing` }
    }
  } catch (error) {
    console.error(`Error testing ${provider} API key:`, error)
    return { success: false, error: `Failed to test ${provider} API key` }
  }
}

// POST /api/settings/api-keys/test - Test an API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    // Fetch the encrypted key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('provider, encrypted_key')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single()

    if (error || !apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Decrypt the key
    let decryptedKey: string
    try {
      decryptedKey = decrypt((apiKey as { encrypted_key: string }).encrypted_key)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
    }

    // Test the key
    const testResult = await testApiKey((apiKey as { provider: string }).provider, decryptedKey)

    // Update last_used timestamp if test was successful
    if (testResult.success) {
      await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', user.id)
    }

    return NextResponse.json(testResult)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}