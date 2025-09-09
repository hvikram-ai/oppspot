#!/usr/bin/env node

const testQueries = [
  "How do I find tech companies in London?",
  "What is similarity analysis?",
  "How much does OppSpot cost?",
  "Find competitors for my company",
  "What data do you have on UK companies?"
];

async function testChat(query) {
  console.log(`\n📝 Testing: "${query}"`);
  console.log("─".repeat(60));
  
  try {
    const response = await fetch('http://localhost:3004/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    const content = data.message?.content || 'No response';
    const model = data.message?.model || 'unknown';
    const confidence = data.message?.confidence || 0;
    
    console.log(`🤖 Model: ${model} (confidence: ${confidence})`);
    console.log(`💬 Response: ${content.substring(0, 200)}...`);
    
    // Check if response is relevant
    const isRelevant = content.toLowerCase().includes('oppspot') || 
                      content.toLowerCase().includes('search') ||
                      content.toLowerCase().includes('companies');
    
    console.log(`✅ Relevant: ${isRelevant ? 'YES' : 'NO'}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log("🚀 Testing OppSpot AI Chatbot");
  console.log("=".repeat(60));
  
  for (const query of testQueries) {
    await testChat(query);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n✨ Tests completed!");
}

runTests().catch(console.error);