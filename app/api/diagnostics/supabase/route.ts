import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'

  // Basic validation
  const urlValid = /^https?:\/\//.test(url)
  const anonPresent = anon.length > 10

  // Attempt a quick health check if possible
  let health: { ok: boolean; status?: number } = { ok: false }
  try {
    if (urlValid) {
      const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, { cache: 'no-store' })
      health = { ok: res.ok, status: res.status }
    }
  } catch {
    health = { ok: false }
  }

  return NextResponse.json({
    supabaseUrlHost: urlValid ? new URL(url).host : null,
    supabaseUrlValid: urlValid,
    anonKeyPresent: anonPresent,
    serviceRole: service,
    authHealth: health,
  })
}

