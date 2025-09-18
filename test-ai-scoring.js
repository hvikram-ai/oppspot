#!/usr/bin/env node

// Test AI Scoring System
// This script tests the AI-powered scoring functionality

async function testAIScoring() {
  console.log('🧪 Testing AI Scoring System...\n');

  // First, check if AI is available
  console.log('1️⃣  Checking AI scoring status...');
  try {
    const statusResponse = await fetch('http://localhost:3002/api/scoring/ai-analyze', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const statusData = await statusResponse.json();

    if (!statusResponse.ok && statusResponse.status === 401) {
      console.log('❌ Authentication required. The API needs a valid session.');
      console.log('   Please login to the app first at http://localhost:3002/login');
      return;
    }

    console.log('✅ AI Scoring Status:');
    console.log('   - Enabled:', statusData.ai_scoring?.enabled);
    console.log('   - Available:', statusData.ai_scoring?.available);
    console.log('   - Status:', statusData.ai_scoring?.status);
    console.log('   - Models:', statusData.ai_scoring?.models?.join(', '));

    if (!statusData.ai_scoring?.available) {
      console.log('\n⚠️  AI scoring is not available. Please ensure Ollama is running.');
      return;
    }

    console.log('\n✅ AI Scoring System is ready!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the database migration in Supabase dashboard');
    console.log('2. Login to the app at http://localhost:3002/login');
    console.log('3. Navigate to Companies page');
    console.log('4. Click "Calculate Score" on any company');
    console.log('5. Enable "Use AI Scoring" in the scoring dialog');
    console.log('\n🎉 The AI will analyze the company using local LLMs!');

  } catch (error) {
    console.error('❌ Error testing AI scoring:', error.message);
  }
}

testAIScoring();