import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import type { Row } from '@/lib/supabase/helpers'

// Define api_keys table structure
interface ApiKey {
  id: string
  user_id: string
  provider: string
  key_name: string
  encrypted_key: string
  is_active: boolean
  last_used: string | null
  created_at: string
}

// Sanitized API key response (without encrypted_key)
interface SanitizedApiKey {
  id: string
  provider: string
  key_name: string
  is_active: boolean
  last_used: string | null
  created_at: string
}

// Simple encryption for API keys (in production, use a proper key management service)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

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

// GET /api/settings/api-keys - List user's API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = (await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }))

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Don't send encrypted keys to client, only metadata
    const sanitizedKeys: SanitizedApiKey[] = data?.map(key => ({
      id: key.id,
      provider: key.provider,
      key_name: key.key_name,
      is_active: key.is_active,
      last_used: key.last_used,
      created_at: key.created_at
    })) || []

    return NextResponse.json({ keys: sanitizedKeys })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settings/api-keys - Add new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, keyName, apiKey } = body

    if (!provider || !keyName || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Encrypt the API key before storing
    const encryptedKey = encrypt(apiKey)

    const insertData = {
      user_id: user.id,
      provider,
      key_name: keyName,
      encrypted_key: encryptedKey,
      is_active: true
    }

    const { data, error } = await supabase
      .from('api_keys')
      // @ts-expect-error - Supabase type inference issue with encryption
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'API key with this name already exists' }, { status: 400 })
      }
      console.error('Error saving API key:', error)
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return sanitized response
    const sanitizedKey: SanitizedApiKey = {
      id: data.id,
      provider: data.provider,
      key_name: data.key_name,
      is_active: data.is_active,
      last_used: data.last_used,
      created_at: data.created_at
    }

    return NextResponse.json({
      success: true,
      key: sanitizedKey
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settings/api-keys/[id] - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract ID from URL path
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const keyId = pathParts[pathParts.length - 1]

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}