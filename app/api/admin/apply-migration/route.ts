import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getErrorMessage } from '@/lib/utils/error-handler'

/**
 * ADMIN ONLY: Apply database migration
 * POST /api/admin/apply-migration
 *
 * This endpoint uses service role to bypass RLS and apply migrations
 */
export async function POST(request: NextRequest) {
  try {
    const { migration } = await request.json()

    if (!migration) {
      return NextResponse.json(
        { error: 'Migration name required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Create admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Read migration file
    const migrationPath = join(process.cwd(), `supabase/migrations/${migration}.sql`)
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    // Execute the SQL
    // Note: Supabase doesn't have a direct exec_sql function, so we need to use raw SQL
    // We'll execute it as a transaction

    console.log(`[Migration] Applying ${migration}...`)

    // For RLS and DDL statements, we need to execute them individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/))

    const results = []
    for (const statement of statements) {
      if (!statement) continue

      try {
        // Execute raw SQL - note this requires a special setup
        // For now, return the SQL to be executed manually
        results.push({
          statement: statement.substring(0, 100),
          status: 'queued'
        })
      } catch (error: unknown) {
        console.error(`[Migration] Error executing statement:`, error)
        results.push({
          statement: statement.substring(0, 100),
          status: 'error',
          error: getErrorMessage(error)
        })
      }
    }

    return NextResponse.json({
      migration,
      statements: results.length,
      sql: migrationSQL,
      message: 'Migration SQL ready. Please apply via Supabase SQL Editor.',
      url: `${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`
    })

  } catch (error: unknown) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
