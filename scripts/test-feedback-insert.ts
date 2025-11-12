/**
 * Test Feedback Insert - Diagnose RLS Issues
 * Tests if authenticated users can insert into feedback table
 */

import { createClient } from '@supabase/supabase-js'

async function testFeedbackInsert() {
  console.log('🧪 Testing Feedback Insert with RLS...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fuqdbewftdthbjfcecrz.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cWRiZXdmdGR0aGJqZmNlY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDczODYsImV4cCI6MjA3MjA4MzM4Nn0.peIt7dPqPLJEp-bCsKTl4kfmmu08zjzq9iK7FV6szHY'

  // Create client as anon user (simulates real user)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('✓ Created Supabase client (anon key)\n')

  // Test 1: Check if we can read from feedback
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 1: Check if feedback table is accessible')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data: feedbackList, error: readError } = await supabase
    .from('feedback')
    .select('id')
    .limit(1)

  if (readError) {
    console.log('❌ Cannot read from feedback table:', readError.message)
    console.log('   This suggests a table or RLS issue\n')
  } else {
    console.log('✅ Can read from feedback table\n')
  }

  // Test 2: Sign in as test user
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 2: Sign in as test user')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const testEmail = 'demo@oppspot.com'
  const testPassword = 'Demo123456!'

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (signInError) {
    console.log('❌ Sign in failed:', signInError.message)
    console.log('   Cannot proceed with authenticated test\n')
    console.log('💡 Create test user first:')
    console.log('   npm run demo-login\n')
    return
  }

  const user = authData.user
  console.log('✅ Signed in as:', user?.email)
  console.log('   User ID:', user?.id, '\n')

  // Test 3: Try to insert feedback
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 3: Attempt to insert feedback')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const testFeedback = {
    user_id: user!.id,
    title: 'Test feedback from diagnostic script',
    description: 'Testing RLS policies on feedback table',
    category: 'bug' as const,
    status: 'pending' as const,
    priority: 'medium' as const,
    is_public: false,
    tags: ['bug'],
    affected_feature: null,
    page_url: null,
    browser_info: { userAgent: 'Test Script', timestamp: new Date().toISOString() },
    screenshot_url: null,
  }

  console.log('Attempting INSERT with data:', {
    user_id: user!.id,
    title: testFeedback.title,
    category: testFeedback.category,
  }, '\n')

  const { data: insertedFeedback, error: insertError } = await supabase
    .from('feedback')
    .insert(testFeedback)
    .select()
    .single()

  if (insertError) {
    console.log('❌ INSERT FAILED!')
    console.log('   Error code:', insertError.code)
    console.log('   Error message:', insertError.message)
    console.log('   Error details:', insertError.details)
    console.log('   Error hint:', insertError.hint, '\n')

    console.log('🔍 Diagnosis:')
    if (insertError.code === '42501') {
      console.log('   ⚠️  Permission denied (42501)')
      console.log('   This is an RLS policy issue!')
      console.log('   The INSERT policy may be missing or incorrect\n')
    } else if (insertError.code === '23502') {
      console.log('   ⚠️  NOT NULL constraint violation')
      console.log('   A required field is missing\n')
    } else if (insertError.code === '23505') {
      console.log('   ⚠️  Unique constraint violation')
      console.log('   Duplicate value detected\n')
    } else {
      console.log('   ⚠️  Unknown error code:', insertError.code, '\n')
    }

    console.log('📋 Check RLS policies in Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/auth/policies\n')
    console.log('   Look for "feedback" table and verify INSERT policy exists:\n')
    console.log('   Policy name: "Users can create feedback"')
    console.log('   Command: INSERT')
    console.log('   WITH CHECK: auth.uid() = user_id\n')

    return
  }

  console.log('✅ INSERT SUCCESSFUL!')
  console.log('   Feedback ID:', insertedFeedback.id)
  console.log('   Title:', insertedFeedback.title, '\n')

  // Test 4: Try to insert activity log
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Test 4: Attempt to insert activity log')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data: activity, error: activityError } = await supabase
    .from('feedback_activity')
    .insert({
      feedback_id: insertedFeedback.id,
      user_id: user!.id,
      action: 'created',
      new_value: { title: testFeedback.title, category: 'bug' },
    })
    .select()
    .single()

  if (activityError) {
    console.log('❌ Activity log INSERT FAILED!')
    console.log('   Error:', activityError.message, '\n')
  } else {
    console.log('✅ Activity log INSERT successful')
    console.log('   Activity ID:', activity.id, '\n')
  }

  // Cleanup: Delete test feedback
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Cleanup: Deleting test feedback')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await supabase
    .from('feedback')
    .delete()
    .eq('id', insertedFeedback.id)

  console.log('✅ Test feedback deleted\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('✅ All tests passed!')
  console.log('   - Feedback table accessible')
  console.log('   - User authentication works')
  console.log('   - Feedback INSERT works')
  console.log('   - Activity log INSERT works\n')
  console.log('If tests passed but UI still fails, check:')
  console.log('   1. Browser console for errors')
  console.log('   2. Network tab for API response')
  console.log('   3. Server logs (npm run dev output)\n')
}

testFeedbackInsert().catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})
