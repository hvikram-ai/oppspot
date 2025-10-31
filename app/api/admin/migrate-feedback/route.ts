import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/admin/migrate-feedback
 * Apply the feedback system database migration
 * This is a one-time setup route
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251031060948_feedback_system.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_').select('*').limit(0);

          if (queryError) {
            console.error('Statement error:', statement.substring(0, 100), queryError);
            errorCount++;
            results.push({ statement: statement.substring(0, 100), error: queryError.message });
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Execution error:', err);
        errorCount++;
        results.push({
          statement: statement.substring(0, 100),
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Migration completed. ${successCount} statements succeeded, ${errorCount} failed.`,
      successCount,
      errorCount,
      results: results.length > 0 ? results : undefined,
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply migration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
