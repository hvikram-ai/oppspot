#!/usr/bin/env tsx
/**
 * Test Multi-Agent System
 * Quick test to verify the multi-agent orchestrator works
 */

// Load environment variables from .env.local (override existing)
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { getMultiAgentOrchestrator } from '../lib/agents/orchestrator'
import { getRouterAgent } from '../lib/agents/router-agent'
import type { ResearchContext } from '../lib/agents/agent-types'

console.log('=================================================')
console.log('🤖 Multi-Agent System Test')
console.log('=================================================\n')

// Check environment variable
console.log('📋 Configuration:')
console.log(`   ENABLE_MULTI_AGENT: ${process.env.ENABLE_MULTI_AGENT}`)
console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'}\n`)

async function testRouterAgent() {
  console.log('🧪 Test 1: Router Agent Classification')
  console.log('─────────────────────────────────────────')

  const router = getRouterAgent()

  const testQueries = [
    "What is their revenue growth?",
    "Who are their main competitors?",
    "What is their tech stack?",
    "Who is the CEO?",
    "Are they compliant with regulations?"
  ]

  for (const query of testQueries) {
    try {
      console.log(`\n   Query: "${query}"`)
      const classification = await router.classify(query)
      console.log(`   ✅ Agent: ${classification.agentType}`)
      console.log(`   📊 Confidence: ${Math.round(classification.confidence * 100)}%`)
      console.log(`   💭 Reasoning: ${classification.reasoning}`)
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('\n')
}

async function testOrchestratorRouting() {
  console.log('🧪 Test 2: Orchestrator Query Routing')
  console.log('─────────────────────────────────────────')

  const orchestrator = getMultiAgentOrchestrator()

  // Create minimal test context
  const testContext: ResearchContext = {
    companyData: {
      id: 'test-company-id',
      name: 'Acme Corp',
      description: 'A leading B2B software company',
      industry: 'Software',
      employee_count: 150,
      website: 'https://acme.com',
    },
    newsArticles: [
      {
        title: 'Acme Corp raises $10M Series A',
        summary: 'Growing company secures funding from top VCs',
        url: 'https://news.com/acme-funding',
        source: 'TechCrunch',
        published_date: '2025-01-15',
      }
    ],
    financialData: [
      {
        year: 2024,
        revenue: 5000000,
        growth: 45,
        profit: 500000,
      }
    ],
    competitors: [
      {
        name: 'Competitor Inc',
        description: 'Direct competitor in the space',
      }
    ],
    technologies: [
      {
        name: 'React',
        category: 'Frontend',
      },
      {
        name: 'Node.js',
        category: 'Backend',
      }
    ],
    sources: [
      {
        url: 'https://acme.com',
        title: 'Acme Corp Homepage',
        source_type: 'website',
      }
    ],
    metadata: {
      sources_fetched: 3,
      sources_failed: 0,
    }
  }

  const testQuery = "What is Acme Corp's financial health?"

  try {
    console.log(`\n   Query: "${testQuery}"`)
    console.log('   ⏳ Routing to appropriate agent...\n')

    const analysis = await orchestrator.routeQuery(testQuery, testContext)

    console.log(`   ✅ Agent Used: ${analysis.agentType}`)
    console.log(`   📊 Confidence: ${Math.round(analysis.confidence * 100)}%`)
    console.log(`   📝 Key Insights: ${analysis.keyInsights.length}`)
    if (analysis.keyInsights.length > 0) {
      analysis.keyInsights.slice(0, 3).forEach((insight, i) => {
        console.log(`      ${i + 1}. ${insight.substring(0, 80)}${insight.length > 80 ? '...' : ''}`)
      })
    }
    console.log(`   📚 Sources: ${analysis.sources.length}`)
    console.log(`\n   📄 Analysis Preview:`)
    console.log(`   ${analysis.content.substring(0, 200)}...`)
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
  }

  console.log('\n')
}

async function testComprehensiveResearch() {
  console.log('🧪 Test 3: Comprehensive Multi-Agent Research')
  console.log('─────────────────────────────────────────')

  const orchestrator = getMultiAgentOrchestrator()

  // Create richer test context
  const testContext: ResearchContext = {
    companyData: {
      id: 'test-company-id',
      name: 'TechVentures Ltd',
      company_number: '12345678',
      description: 'AI-powered business intelligence platform',
      industry: 'Software & Technology',
      employee_count: 85,
      website: 'https://techventures.com',
      founded_date: '2020-03-15',
    },
    newsArticles: [
      {
        title: 'TechVentures raises £5M Series A',
        summary: 'Fast-growing AI startup secures major funding',
        url: 'https://news.com/techventures-funding',
        source: 'TechCrunch UK',
        published_date: '2024-12-01',
      },
      {
        title: 'TechVentures expands to Ireland',
        summary: 'Opening new Dublin office with 20 employees',
        url: 'https://news.com/techventures-expansion',
        source: 'Irish Times',
        published_date: '2025-01-10',
      }
    ],
    financialData: [
      {
        year: 2024,
        revenue: 3500000,
        growth: 120,
        profit: -500000,
        assets: 6000000,
        liabilities: 2000000,
        cash: 4500000,
      },
      {
        year: 2023,
        revenue: 1590000,
        growth: 85,
        profit: -800000,
      }
    ],
    competitors: [
      {
        name: 'DataInsights Pro',
        description: 'Enterprise BI platform',
        marketShare: 15,
      },
      {
        name: 'SmartAnalytics',
        description: 'AI-driven analytics tool',
        marketShare: 12,
      }
    ],
    technologies: [
      { name: 'React', category: 'Frontend' },
      { name: 'TypeScript', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
      { name: 'PostgreSQL', category: 'Database' },
      { name: 'AWS', category: 'Infrastructure' },
      { name: 'OpenAI', category: 'AI/ML' },
    ],
    people: [
      {
        name: 'Sarah Johnson',
        title: 'CEO & Co-Founder',
        seniority: 'C-level',
      },
      {
        name: 'Michael Chen',
        title: 'CTO & Co-Founder',
        seniority: 'C-level',
      }
    ],
    sources: [
      {
        url: 'https://techventures.com',
        title: 'TechVentures Homepage',
        source_type: 'website',
      },
      {
        url: 'https://companieshouse.gov.uk/company/12345678',
        title: 'Companies House Filing',
        source_type: 'companies_house',
      }
    ],
    metadata: {
      sources_fetched: 8,
      sources_failed: 1,
    }
  }

  try {
    console.log('\n   🚀 Executing all specialized agents in parallel...')
    console.log('   ⏱️  This will take ~15-20 seconds...\n')

    const startTime = Date.now()
    const report = await orchestrator.comprehensiveResearch(testContext)
    const duration = (Date.now() - startTime) / 1000

    console.log(`   ✅ Analysis Complete in ${duration.toFixed(1)}s`)
    console.log(`   📊 Agents Used: ${report.metadata.total_agents_used}`)
    console.log(`   ⚡ Parallel Execution: ${report.metadata.parallel_execution ? 'Yes' : 'No'}`)
    console.log(`   🎯 Opportunity Score: ${report.opportunityScore}/100`)
    console.log(`   🚨 Buying Signals: ${report.buyingSignals?.length || 0}`)

    if (report.buyingSignals && report.buyingSignals.length > 0) {
      console.log('\n   🔔 Detected Buying Signals:')
      report.buyingSignals.forEach((signal, i) => {
        console.log(`      ${i + 1}. ${signal.type.toUpperCase()}: ${signal.description}`)
        console.log(`         Confidence: ${Math.round(signal.confidence * 100)}% (Source: ${signal.source})`)
      })
    }

    console.log('\n   📝 Agent Sections:')
    Object.entries(report.sections).forEach(([type, analysis]) => {
      if (analysis) {
        console.log(`      • ${type}: ${analysis.keyInsights.length} insights, ${Math.round(analysis.confidence * 100)}% confidence`)
      }
    })

    console.log('\n   📄 Executive Summary Preview:')
    const summaryPreview = report.executiveSummary.split('\n').slice(0, 5).join('\n')
    console.log(summaryPreview.split('\n').map(line => `      ${line}`).join('\n'))

    console.log(`\n   📚 Total Sources: ${report.allSources.length}`)

  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) {
      console.log(`\n   Stack trace:\n${error.stack}`)
    }
  }

  console.log('\n')
}

async function runTests() {
  try {
    // Test 1: Router classification
    await testRouterAgent()

    // Test 2: Single agent routing
    await testOrchestratorRouting()

    // Test 3: Comprehensive multi-agent research
    await testComprehensiveResearch()

    console.log('=================================================')
    console.log('✅ Multi-Agent System Test Complete')
    console.log('=================================================\n')

  } catch (error) {
    console.error('\n❌ Test Failed:', error)
    process.exit(1)
  }
}

// Run tests
runTests()
