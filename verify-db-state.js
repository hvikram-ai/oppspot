// Verify database state via RPC
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabaseState() {
  console.log('='.repeat(60))
  console.log('VERIFYING DATABASE STATE')
  console.log('='.repeat(60))

  // Check triggers
  const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tgname, tgrelid::regclass::text as table_name
      FROM pg_trigger
      WHERE tgname LIKE '%stream%' AND NOT tgisinternal
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }))

  if (trigError || !triggers) {
    console.log('\n❌ Cannot verify triggers via RPC')
    console.log('You need to manually check in Supabase SQL Editor:')
    console.log('SELECT tgname FROM pg_trigger WHERE tgname LIKE \'%stream%\' AND NOT tgisinternal;')
  } else {
    console.log('\n📋 TRIGGERS on stream tables:')
    if (triggers.length === 0) {
      console.log('✅ No triggers found (GOOD)')
    } else {
      triggers.forEach(t => {
        console.log(`❌ ${t.tgname} on ${t.table_name} (BAD - should be removed)`)
      })
    }
  }

  // Check RLS status
  const { data: rlsStatus } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'stream_members'
    `
  }).catch(() => ({ data: null }))

  if (rlsStatus) {
    console.log('\n🔒 RLS STATUS on stream_members:')
    const status = rlsStatus[0]
    if (status.relrowsecurity) {
      console.log('❌ RLS is ENABLED (BAD - causes recursion)')
    } else {
      console.log('✅ RLS is DISABLED (GOOD)')
    }
  }

  // Check policies
  const { data: policies } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename = 'stream_members'
    `
  }).catch(() => ({ data: null }))

  if (policies) {
    console.log('\n📜 POLICIES on stream_members:')
    if (policies.length === 0) {
      console.log('✅ No policies (GOOD)')
    } else {
      policies.forEach(p => {
        console.log(`❌ ${p.policyname} (BAD - should be removed)`)
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('MANUAL VERIFICATION REQUIRED')
  console.log('='.repeat(60))
  console.log('\nSince RPC might not work, run this in Supabase SQL Editor:')
  console.log('\n-- Check trigger:')
  console.log("SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_auto_add_stream_owner';")
  console.log('\n-- Check RLS:')
  console.log("SELECT relrowsecurity FROM pg_class WHERE relname = 'stream_members';")
  console.log('\n-- Check policies:')
  console.log("SELECT COUNT(*) FROM pg_policies WHERE tablename = 'stream_members';")
  console.log('\nExpected results:')
  console.log('  - Trigger: 0 rows (trigger should be gone)')
  console.log('  - RLS: false (RLS should be disabled)')
  console.log('  - Policies: 0 (no policies should exist)')
  console.log('='.repeat(60))
}

verifyDatabaseState().catch(console.error)
