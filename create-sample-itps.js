const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sampleITPs = [
  {
    name: 'Fast-Growing SaaS Startups',
    description: 'Looking for high-growth B2B SaaS companies with recurring revenue',
    criteria: {
      industries: ['Software', 'SaaS', 'Technology'],
      companySize: { min: 10, max: 500 },
      revenue: { min: 1000000, max: 50000000 },
      growthRate: { min: 30 },
      location: { countries: ['United States', 'United Kingdom', 'Canada'] }
    },
    scoring_weights: {
      firmographics: 0.2,
      size: 0.15,
      growth: 0.3,
      funding: 0.15,
      marketPresence: 0.1,
      workflow: 0.1
    },
    min_match_score: 75,
    auto_tag: 'High-Growth SaaS',
    is_active: true,
    is_favorite: true
  },
  {
    name: 'Healthcare Technology Companies',
    description: 'Digital health and medical technology companies for potential acquisition',
    criteria: {
      industries: ['Healthcare', 'Medical Devices', 'Health Tech'],
      companySize: { min: 20, max: 1000 },
      revenue: { min: 2000000, max: 100000000 },
      location: { countries: ['United States', 'United Kingdom', 'Germany'] }
    },
    scoring_weights: {
      firmographics: 0.25,
      size: 0.2,
      growth: 0.2,
      funding: 0.15,
      marketPresence: 0.15,
      workflow: 0.05
    },
    min_match_score: 70,
    auto_tag: 'HealthTech Target',
    is_active: true,
    is_favorite: false
  },
  {
    name: 'E-Commerce Brands (DTC)',
    description: 'Direct-to-consumer e-commerce brands with strong online presence',
    criteria: {
      industries: ['E-commerce', 'Retail', 'Consumer Goods'],
      companySize: { min: 5, max: 200 },
      revenue: { min: 500000, max: 20000000 },
      onlinePresence: { minSocialFollowers: 10000 },
      location: { countries: ['United States', 'United Kingdom'] }
    },
    scoring_weights: {
      firmographics: 0.15,
      size: 0.15,
      growth: 0.25,
      funding: 0.1,
      marketPresence: 0.25,
      workflow: 0.1
    },
    min_match_score: 65,
    auto_tag: 'DTC Brand',
    is_active: true,
    is_favorite: false
  },
  {
    name: 'Fintech Innovators',
    description: 'Financial technology companies disrupting traditional banking',
    criteria: {
      industries: ['Fintech', 'Financial Services', 'Payments'],
      companySize: { min: 10, max: 500 },
      revenue: { min: 1000000, max: 75000000 },
      funding: { minTotal: 1000000 },
      location: { countries: ['United States', 'United Kingdom', 'Singapore'] }
    },
    scoring_weights: {
      firmographics: 0.2,
      size: 0.15,
      growth: 0.25,
      funding: 0.2,
      marketPresence: 0.1,
      workflow: 0.1
    },
    min_match_score: 80,
    auto_tag: 'Fintech',
    is_active: true,
    is_favorite: true
  },
  {
    name: 'AI/ML Service Providers',
    description: 'Companies providing AI and machine learning services or products',
    criteria: {
      industries: ['Artificial Intelligence', 'Machine Learning', 'Data Analytics'],
      companySize: { min: 5, max: 300 },
      revenue: { min: 500000, max: 30000000 },
      technologies: ['AI', 'ML', 'Deep Learning', 'NLP'],
      location: { countries: ['United States', 'United Kingdom', 'Canada', 'Israel'] }
    },
    scoring_weights: {
      firmographics: 0.25,
      size: 0.15,
      growth: 0.25,
      funding: 0.15,
      marketPresence: 0.1,
      workflow: 0.1
    },
    min_match_score: 75,
    auto_tag: 'AI/ML',
    is_active: true,
    is_favorite: true
  }
];

async function getOrCreateDemoUser() {
  // Try to get existing demo user
  const { data: users, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    throw error;
  }

  // Find demo user
  let demoUser = users.users.find(u => u.email === 'demo@oppspot.com');

  if (demoUser) {
    console.log('✅ Found existing demo user:', demoUser.id);
    return demoUser.id;
  }

  // Create demo user if not exists
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'demo@oppspot.com',
    password: 'Demo123456!',
    email_confirm: true,
    user_metadata: {
      name: 'Demo User',
      created_by: 'sample_data_script'
    }
  });

  if (createError) {
    console.error('❌ Error creating demo user:', createError.message);
    throw createError;
  }

  console.log('✅ Created demo user:', newUser.user.id);
  return newUser.user.id;
}

async function main() {
  console.log('🚀 Creating sample Ideal Target Profiles...\n');

  // Get or create demo user
  const userId = await getOrCreateDemoUser();

  // Check existing ITPs for this user
  const { data: existingITPs, error: checkError } = await supabase
    .from('ideal_target_profiles')
    .select('id, name')
    .eq('user_id', userId);

  if (checkError) {
    console.error('❌ Error checking existing ITPs:', checkError.message);
    process.exit(1);
  }

  console.log(`\n📊 Found ${existingITPs.length} existing ITPs for user`);

  if (existingITPs.length >= 5) {
    console.log('\n✅ Sample ITPs already exist! Skipping creation.');
    console.log('\nExisting ITPs:');
    existingITPs.forEach((itp, i) => {
      console.log(`  ${i + 1}. ${itp.name} (${itp.id})`);
    });
    return;
  }

  console.log('\n📝 Creating sample ITPs...\n');

  // Create ITPs
  const createdITPs = [];

  for (const itp of sampleITPs) {
    // Skip if already exists with this name
    const exists = existingITPs.find(e => e.name === itp.name);
    if (exists) {
      console.log(`  ⏭️  Skipping "${itp.name}" (already exists)`);
      createdITPs.push(exists);
      continue;
    }

    const { data, error } = await supabase
      .from('ideal_target_profiles')
      .insert({
        user_id: userId,
        ...itp
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to create "${itp.name}":`, error.message);
      continue;
    }

    console.log(`  ✅ Created: "${itp.name}" (${data.id})`);
    createdITPs.push(data);
  }

  console.log(`\n🎉 Successfully created ${createdITPs.length} sample ITPs!`);
  console.log('\n📋 Summary:');
  createdITPs.forEach((itp, i) => {
    const favorite = itp.is_favorite ? '⭐' : '  ';
    console.log(`  ${favorite} ${i + 1}. ${itp.name}`);
    console.log(`      Min Score: ${itp.min_match_score}% | Auto-tag: ${itp.auto_tag || 'None'}`);
  });

  console.log('\n🔗 Next steps:');
  console.log('  1. Visit http://localhost:3000/itp to view ITPs');
  console.log('  2. Run matching engine to find businesses');
  console.log('  3. View ITP tags in search results and business details');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
