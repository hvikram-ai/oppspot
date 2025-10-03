#!/usr/bin/env npx tsx

/**
 * Diagnostic tool to test goal-oriented stream creation
 * Usage: npx tsx test-goal-stream.ts
 */

async function testGoalStreamCreation() {
  const baseUrl = 'http://localhost:3007'

  console.log('🔍 Testing goal-oriented stream creation...\n')

  // Test 1: Check if API endpoint exists
  console.log('1. Testing API endpoint availability...')
  try {
    const response = await fetch(`${baseUrl}/api/streams/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Stream' })
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)

    if (response.status === 401) {
      console.log('   ✅ API endpoint exists (authentication required)')
    } else if (response.status === 400) {
      const data = await response.json()
      console.log(`   ⚠️  Validation error: ${data.error}`)
    } else if (response.status === 500) {
      const data = await response.json()
      console.log(`   ❌ Server error: ${data.error}`)
      console.log('   This likely means a database schema issue')
    } else if (response.ok) {
      console.log('   ⚠️  Unexpected success without auth!')
      const data = await response.json()
      console.log('   Response:', data)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`)
  }

  console.log('\n📋 Next steps:')
  console.log('1. Make sure you are logged in to the app')
  console.log('2. Check browser console for errors when creating a stream')
  console.log('3. Check Network tab for the actual error response')
  console.log('\n💡 To see the exact error:')
  console.log('   - Open browser DevTools (F12)')
  console.log('   - Go to Console tab')
  console.log('   - Try creating a goal-oriented stream')
  console.log('   - Look for errors in red')
}

testGoalStreamCreation().catch(console.error)
