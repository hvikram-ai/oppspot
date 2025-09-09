#!/usr/bin/env node

const testQueries = [
  {
    query: "Can you identify similar companies to SendBird?",
    expectedType: "similarity_analysis"
  },
  {
    query: "yes, SendBird",
    context: { last_action: "similarity_prompt" },
    expectedType: "similarity_analysis"
  },
  {
    query: "Find tech companies in London",
    expectedType: "company_search"
  },
  {
    query: "Tell me about Patsnap",
    expectedType: "company_analysis"
  },
  {
    query: "Find competitors for Stream",
    expectedType: "similarity_analysis"
  }
];

async function testEnhancedChat(testCase) {
  const { query, context, expectedType } = testCase;
  
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📝 Query: "${query}"`);
  if (context) console.log(`   Context: ${JSON.stringify(context)}`);
  console.log(`   Expected: ${expectedType}`);
  console.log(`${"─".repeat(70)}`);
  
  try {
    const response = await fetch('http://localhost:3004/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: query,
        context: context || {},
        session_id: 'test_session_001'
      })
    });
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const content = data.message?.content || 'No response';
    const model = data.message?.model || 'unknown';
    const confidence = data.message?.confidence || 0;
    const platformData = data.message?.platform_data;
    
    console.log(`\n🤖 Model: ${model} (confidence: ${confidence})`);
    
    // Check if platform data is present
    if (platformData) {
      console.log(`✅ Platform Data Present:`, {
        hasData: true,
        dataKeys: Object.keys(platformData),
        targetCompany: platformData.targetCompany,
        totalMatches: platformData.totalMatches || platformData.totalFound,
        topScore: platformData.topScore
      });
      
      // Show top matches if available
      if (platformData.topMatches && platformData.topMatches.length > 0) {
        console.log(`\n📊 Top Similar Companies:`);
        platformData.topMatches.slice(0, 3).forEach((match, i) => {
          console.log(`   ${i+1}. ${match.company_name} (${match.overall_score}% match)`);
          console.log(`      - ${match.similarity_reasoning}`);
        });
      }
    } else {
      console.log(`⚠️  No platform data (using fallback/Ollama)`);
    }
    
    // Show first part of response
    console.log(`\n💬 Response Preview:`);
    const lines = content.split('\n').slice(0, 10);
    lines.forEach(line => console.log(`   ${line}`));
    
    if (content.split('\n').length > 10) {
      console.log(`   ... [${content.split('\n').length - 10} more lines]`);
    }
    
    // Check if response is relevant
    const isRelevant = content.toLowerCase().includes('sendbird') || 
                      content.toLowerCase().includes('patsnap') ||
                      content.toLowerCase().includes('stream') ||
                      content.toLowerCase().includes('companies') ||
                      content.toLowerCase().includes('similar');
    
    console.log(`\n📈 Analysis:`);
    console.log(`   - Relevant: ${isRelevant ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Uses Platform Services: ${platformData ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Model Type: ${model}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log("🚀 Testing Enhanced OppSpot AI Chatbot");
  console.log("Testing integration with platform services...");
  
  for (const testCase of testQueries) {
    await testEnhancedChat(testCase);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✨ Enhanced chatbot tests completed!");
  console.log("The chatbot should now use real platform services instead of generic responses.");
}

runTests().catch(console.error);