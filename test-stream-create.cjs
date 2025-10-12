// Direct test of stream creation bypassing Next.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStreamCreation() {
  console.log('Testing stream creation with service role key...')

  // First, get a test user
  const { data: users } = await supabase.from('profiles').select('id, org_id').limit(1)
  if (!users || users.length === 0) {
    console.error('No users found')
    return
  }

  const user = users[0]
  console.log('Using user:', user.id)
  console.log('Using org:', user.org_id)

  // Try to create a stream
  const { data: stream, error: streamError } = await supabase
    .from('streams')
    .insert({
      name: 'Test Stream ' + Date.now(),
      description: 'Test',
      org_id: user.org_id,
      stream_type: 'lead_pipeline',
      workflow_stages: [
        { id: 'new', name: 'New', color: '#3b82f6' }
      ],
      created_by: user.id,
      status: 'active'
    })
    .select()
    .single()

  if (streamError) {
    console.error('ERROR creating stream:', streamError)
    console.error('Code:', streamError.code)
    console.error('Message:', streamError.message)
    return
  }

  console.log('✓ Stream created:', stream.id)

  // Try to add member
  const { error: memberError } = await supabase
    .from('stream_members')
    .insert({
      stream_id: stream.id,
      user_id: user.id,
      role: 'owner',
      invitation_accepted_at: new Date().toISOString()
    })

  if (memberError) {
    console.error('ERROR adding member:', memberError)
    console.error('Code:', memberError.code)
    console.error('Message:', memberError.message)
    return
  }

  console.log('✓ Member added successfully')
  console.log('\n✅ TEST PASSED - Stream creation works!')
}

testStreamCreation().catch(console.error)
