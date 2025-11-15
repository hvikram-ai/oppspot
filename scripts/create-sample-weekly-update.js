const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSampleUpdate() {
  console.log('🚀 Creating sample weekly update...\n');

  // Week 7, 2025 data
  const weekNumber = 7;
  const year = 2025;
  const dateStart = '2025-02-10';
  const dateEnd = '2025-02-16';
  const slug = 'week-7-2025';

  // Create the update
  const { data: update, error: updateError } = await supabase
    .from('weekly_updates')
    .insert({
      week_number: weekNumber,
      year: year,
      date_start: dateStart,
      date_end: dateEnd,
      slug: slug,
      headline: "ResearchGPT™ is now 2x faster + New Ideal Target Profiles",
      summary: "This week brings major performance improvements to ResearchGPT™ and introduces a powerful new Ideal Target Profile (ITP) feature for AI-powered target matching.",
      featured_image: null,
      estimated_time_saved: "2.5 hours/week per analyst",
      roi_metric: "15% productivity increase",
      published_at: new Date().toISOString()
    })
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error creating update:', updateError);
    return;
  }

  console.log('✅ Created weekly update:', update.id);

  // Create update items
  const items = [
    {
      update_id: update.id,
      category: 'feature',
      title: 'Ideal Target Profiles (ITP)',
      description: 'Create AI-powered target profiles and automatically match businesses in your pipeline. Define criteria once (industry, size, growth rate, location) and oppSpot continuously identifies matches with confidence scores.',
      impact_before: '4-6 hours manually filtering searches',
      impact_after: '< 10 minutes to set up, automatic matching',
      improvement_pct: 95,
      cta_label: 'Create Your First ITP',
      cta_href: '/itp',
      badge: 'New',
      sort_order: 1
    },
    {
      update_id: update.id,
      category: 'feature',
      title: 'Data Room Q&A Copilot',
      description: 'Ask natural language questions across all documents in a data room. Get grounded answers with citations linking to specific pages and chunks.',
      impact_before: '30-60 minutes searching PDFs manually',
      impact_after: '< 30 seconds for AI answer with sources',
      improvement_pct: 98,
      cta_label: 'Try Q&A Copilot',
      cta_href: '/data-rooms',
      badge: 'New',
      sort_order: 2
    },
    {
      update_id: update.id,
      category: 'improvement',
      title: 'ResearchGPT™ Performance Boost',
      description: 'Optimized AI pipeline and parallel data fetching. Reports now generate 47% faster on average.',
      impact_before: '28 seconds average',
      impact_after: '15 seconds average',
      improvement_pct: 47,
      sort_order: 3
    },
    {
      update_id: update.id,
      category: 'improvement',
      title: 'Search Indexing Overhaul',
      description: 'Rebuilt search infrastructure with vector embeddings. Queries now return in < 200ms (was 800ms).',
      sort_order: 4
    },
    {
      update_id: update.id,
      category: 'improvement',
      title: 'Business Detail Header Redesign',
      description: 'Refreshed UI with clearer information hierarchy and improved readability.',
      sort_order: 5
    },
    {
      update_id: update.id,
      category: 'improvement',
      title: 'New Companies Data',
      description: 'Added 50,000 new UK companies from latest Companies House export.',
      sort_order: 6
    },
    {
      update_id: update.id,
      category: 'fix',
      title: 'Fixed map clustering performance with 1000+ markers',
      description: 'Resolved performance issues when displaying large numbers of business locations on the map.',
      sort_order: 7
    },
    {
      update_id: update.id,
      category: 'fix',
      title: 'Resolved login redirect issue on Data Rooms page',
      description: 'Fixed authentication redirect that was sending users to search page instead of data rooms.',
      sort_order: 8
    },
    {
      update_id: update.id,
      category: 'fix',
      title: 'Fixed search filter state persistence across sessions',
      description: 'Search filters now correctly persist across browser sessions and page refreshes.',
      sort_order: 9
    },
    {
      update_id: update.id,
      category: 'coming-soon',
      title: 'Deal Hypothesis Tracker',
      description: 'Validate acquisition theses with AI-extracted evidence from data rooms. Track confidence scores as you add documents.',
      badge: 'Beta',
      sort_order: 10
    },
    {
      update_id: update.id,
      category: 'coming-soon',
      title: 'Competitive Intelligence Suite',
      description: 'Monitor competitors and market dynamics in real-time with news tracking, funding updates, and leadership changes.',
      badge: 'Coming in 2 weeks',
      sort_order: 11
    }
  ];

  for (const item of items) {
    const { error } = await supabase.from('update_items').insert(item);
    if (error) {
      console.error(`❌ Error creating item "${item.title}":`, error);
    } else {
      console.log(`✅ Created: ${item.title}`);
    }
  }

  // Create metrics
  const metrics = [
    {
      update_id: update.id,
      metric_name: 'Uptime',
      metric_value: '99.97%',
      metric_change: '+0.02%'
    },
    {
      update_id: update.id,
      metric_name: 'Avg Response Time',
      metric_value: '142ms',
      metric_change: '-12%'
    },
    {
      update_id: update.id,
      metric_name: 'Reports Generated',
      metric_value: '3,421',
      metric_change: '+31%'
    },
    {
      update_id: update.id,
      metric_name: 'Active Users',
      metric_value: '1,247',
      metric_change: '+8%'
    }
  ];

  for (const metric of metrics) {
    const { error } = await supabase.from('update_metrics').insert(metric);
    if (error) {
      console.error(`❌ Error creating metric "${metric.metric_name}":`, error);
    } else {
      console.log(`✅ Created metric: ${metric.metric_name}`);
    }
  }

  // Create spotlight
  const spotlight = {
    update_id: update.id,
    title: 'How GlobalInvest saved 80 hours using ResearchGPT™',
    quote: 'We used to spend days compiling due diligence reports from multiple sources. Now we generate comprehensive intelligence in under a minute and focus our time on strategic analysis. The ROI is incredible.',
    attribution: 'Senior Analyst, Mid-Market PE Firm',
    company_name: null,
    stats: {
      'Reports Generated': 127,
      'Time Saved': '80 hours',
      'Deals Closed': 3
    }
  };

  const { error: spotlightError } = await supabase.from('update_spotlights').insert(spotlight);
  if (spotlightError) {
    console.error('❌ Error creating spotlight:', spotlightError);
  } else {
    console.log('✅ Created user spotlight');
  }

  console.log('\n✅ Sample weekly update created successfully!');
  console.log(`\nView it at: http://localhost:3000/weekly-updates/${slug}`);
}

createSampleUpdate().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
