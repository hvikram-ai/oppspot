/**
 * Test Pinecone Connection
 * Verify Pinecone is configured correctly
 */

require('dotenv').config({ path: '.env.local' })

async function testPineconeConnection() {
  console.log('🧪 Testing Pinecone Configuration...\n')

  // Check environment variables
  const apiKey = process.env.PINECONE_API_KEY
  const environment = process.env.PINECONE_ENVIRONMENT
  const indexName = process.env.PINECONE_INDEX_NAME

  console.log('📋 Configuration Check:')
  console.log(`   PINECONE_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`)
  console.log(`   PINECONE_ENVIRONMENT: ${environment || '❌ Missing'}`)
  console.log(`   PINECONE_INDEX_NAME: ${indexName || '❌ Missing'}`)
  console.log()

  if (!apiKey || !environment || !indexName) {
    console.error('❌ Missing Pinecone configuration')
    console.log('\n📝 Add these to your .env.local file:')
    console.log('   PINECONE_API_KEY=your_api_key')
    console.log('   PINECONE_ENVIRONMENT=us-east-1-aws')
    console.log('   PINECONE_INDEX_NAME=oppspot-rag')
    console.log('\n📖 See PINECONE_SETUP.md for detailed instructions')
    process.exit(1)
  }

  try {
    // Import and test connection
    const { getPineconeClient } = require('../lib/ai/rag/pinecone-client')

    console.log('🔌 Connecting to Pinecone...')
    const pinecone = getPineconeClient()

    console.log('🏥 Running health check...')
    const health = await pinecone.healthCheck()

    if (health.healthy) {
      console.log('\n✅ Pinecone Connection Successful!\n')
      console.log('📊 Index Information:')
      console.log(`   Name: ${health.indexName}`)
      console.log(`   Dimensions: ${health.dimension}`)
      console.log(`   Status: Ready`)
      console.log('\n🎯 Next Steps:')
      console.log('   1. Start dev server: npm run dev')
      console.log('   2. Test RAG API: curl http://localhost:3000/api/rag/health')
      console.log('   3. Follow testing guide: docs/PHASE_2_TESTING.md')
      console.log()
      return true
    } else {
      throw new Error(health.error || 'Health check failed')
    }
  } catch (err) {
    console.error('\n❌ Pinecone Connection Failed')
    console.error(`   Error: ${err.message}\n`)

    if (err.message.includes('API key')) {
      console.log('💡 Check your PINECONE_API_KEY is correct')
    } else if (err.message.includes('index')) {
      console.log('💡 Verify your index exists in Pinecone dashboard')
      console.log('   Dashboard: https://app.pinecone.io/')
    } else if (err.message.includes('environment')) {
      console.log('💡 Check your PINECONE_ENVIRONMENT matches your index')
    }

    console.log('\n📖 See PINECONE_SETUP.md for troubleshooting')
    process.exit(1)
  }
}

testPineconeConnection().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
