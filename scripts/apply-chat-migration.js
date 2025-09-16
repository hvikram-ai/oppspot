/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250909000001_add_ai_chat_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Applying AI chat system migration...')
    
    // Execute the SQL
    const { error } = await supabase.from('_supabase_migrations').rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Try direct execution if RPC fails
      console.log('Direct RPC failed, attempting alternative method...')
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        // Note: Supabase JS client doesn't support direct SQL execution
        // We'll need to use the dashboard or CLI with proper auth
      }
      
      console.log('\n⚠️  Migration needs to be applied manually through Supabase Dashboard')
      console.log('Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
      console.log('And paste the contents of: supabase/migrations/20250909000001_add_ai_chat_system.sql')
    } else {
      console.log('✅ Migration applied successfully!')
    }
  } catch (error) {
    console.error('Error applying migration:', error)
    console.log('\n⚠️  Please apply the migration manually through the Supabase Dashboard')
    console.log('Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new')
    console.log('And paste the contents of: supabase/migrations/20250909000001_add_ai_chat_system.sql')
  }
}

applyMigration()