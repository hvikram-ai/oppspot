#!/usr/bin/env tsx

/**
 * Seed dashboard data for demo user
 * Usage: npx tsx scripts/seed-dashboard-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Demo user ID (update with actual demo user ID)
const DEMO_USER_ID = '0042afd0-6776-40a6-913e-ff0d50a0c39a'

async function seedDashboardData() {
  console.log('🌱 Seeding dashboard data...\n')

  try {
    // 1. Create dashboard preferences
    console.log('📋 Creating dashboard preferences...')
    const { error: prefsError } = await supabase
      .from('dashboard_preferences')
      .upsert({
        user_id: DEMO_USER_ID,
        visible_cards: {
          aiDigest: true,
          priorityQueue: true,
          metrics: true,
          researchGPT: true,
          spotlight: true,
          recentSearches: true,
          savedLists: true,
        },
        card_order: [
          'aiDigest',
          'metrics',
          'priorityQueue',
          'researchGPT',
          'spotlight',
        ],
        theme: 'system',
        layout: 'grid',
      })

    if (prefsError) throw prefsError
    console.log('✅ Dashboard preferences created')

    // 2. Create AI digest
    console.log('\n🤖 Creating AI digest...')
    const today = new Date().toISOString().split('T')[0]
    const { error: digestError } = await supabase
      .from('ai_digest')
      .upsert({
        user_id: DEMO_USER_ID,
        digest_date: today,
        digest_data: {
          overnight_discoveries: [
            {
              type: 'new_opportunity',
              title: 'High-growth tech startup in Manchester',
              description: '50-employee SaaS company with 200% YoY growth',
              action_url: '/search',
              priority: 'high',
            },
            {
              type: 'pattern',
              title: 'Trending: FinTech sector',
              description: "You've saved 5 FinTech companies this week",
              action_url: '/search?industry=fintech',
              priority: 'medium',
            },
          ],
          urgent_alerts: [
            {
              type: 'follow_up',
              title: 'TechCorp Ltd needs follow-up',
              company_ids: ['demo-1'],
              days_since_contact: 14,
            },
          ],
          completed_work: [
            {
              type: 'research_report',
              title: 'Research completed: InnovateCo',
              report_ids: ['demo-report-1'],
            },
          ],
          recommendations: [
            {
              type: 'suggestion',
              title: 'Try ResearchGPT™ on your saved companies',
              reason: 'Generate deep insights on companies you\'re tracking',
            },
          ],
        },
        priority_score: 8,
        generation_duration_ms: 1200,
        ai_model: 'demo-v1',
      })

    if (digestError) throw digestError
    console.log('✅ AI digest created')

    // 3. Create priority queue items
    console.log('\n📊 Creating priority queue items...')
    const queueItems = [
      {
        user_id: DEMO_USER_ID,
        item_type: 'research',
        priority_level: 'critical',
        priority_score: 95,
        status: 'pending',
        title: 'Generate research report for high-value lead',
        description: 'TechStartup Inc - £500k opportunity',
        action_url: '/research',
        metadata: { company_id: 'demo-1', estimated_value: 500000 },
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: DEMO_USER_ID,
        item_type: 'lead',
        priority_level: 'high',
        priority_score: 82,
        status: 'pending',
        title: 'Follow up with Manchester SaaS company',
        description: 'Last contact: 14 days ago',
        action_url: '/business/demo-2',
        metadata: { company_id: 'demo-2', days_since_contact: 14 },
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: DEMO_USER_ID,
        item_type: 'search',
        priority_level: 'medium',
        priority_score: 65,
        status: 'pending',
        title: 'Review 12 new companies matching your criteria',
        description: 'FinTech companies in London',
        action_url: '/search',
        metadata: { query: 'fintech london', result_count: 12 },
      },
      {
        user_id: DEMO_USER_ID,
        item_type: 'task',
        priority_level: 'low',
        priority_score: 45,
        status: 'pending',
        title: 'Update stakeholder information',
        description: '3 companies need stakeholder updates',
        action_url: '/stakeholders',
        metadata: { pending_count: 3 },
      },
    ]

    for (const item of queueItems) {
      const { error } = await supabase
        .from('priority_queue_items')
        .insert(item)
      if (error && error.code !== '23505') throw error // Ignore duplicates
    }
    console.log(`✅ Created ${queueItems.length} priority queue items`)

    // 4. Create feature spotlight config
    console.log('\n✨ Creating feature spotlight...')
    const spotlightItems = [
      {
        feature_name: 'ResearchGPT™',
        title: 'Try ResearchGPT™',
        description: 'Generate deep company intelligence with AI in seconds',
        cta_text: 'Generate Research',
        cta_url: '/research',
        priority: 10,
        is_active: true,
        targeting_rules: { min_saves: 1 },
      },
      {
        feature_name: 'Priority Queue',
        title: 'Never miss an opportunity',
        description: 'Your AI-powered priority queue keeps you focused on what matters',
        cta_text: 'View Queue',
        cta_url: '/dashboard#queue',
        priority: 8,
        is_active: true,
      },
    ]

    for (const item of spotlightItems) {
      const { error } = await supabase
        .from('feature_spotlight_config')
        .upsert(item, { onConflict: 'feature_name' })
      if (error) throw error
    }
    console.log(`✅ Created ${spotlightItems.length} spotlight items`)

    // 5. Create sample dashboard views
    console.log('\n👁️  Creating dashboard views...')
    const { error: viewError } = await supabase
      .from('dashboard_views')
      .insert({
        user_id: DEMO_USER_ID,
        page_path: '/dashboard',
        time_spent_seconds: 120,
        interactions_count: 5,
      })

    if (viewError && viewError.code !== '23505') throw viewError
    console.log('✅ Dashboard view recorded')

    console.log('\n🎉 Dashboard data seeded successfully!')
    console.log(`\n📊 Summary:`)
    console.log(`  - Dashboard preferences: ✅`)
    console.log(`  - AI digest: ✅`)
    console.log(`  - Priority queue items: ${queueItems.length}`)
    console.log(`  - Feature spotlight: ${spotlightItems.length}`)
    console.log(`  - Dashboard views: 1`)
  } catch (error) {
    console.error('\n❌ Error seeding data:', error)
    process.exit(1)
  }
}

// Run seeding
seedDashboardData()
