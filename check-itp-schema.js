const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking ITP tables in database schema...\n');

  // Query PostgreSQL information schema directly
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('ideal_target_profiles', 'itp_matches', 'tags', 'business_tags')
      ORDER BY table_name;
    `
  });

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 The exec_sql RPC function might not exist.');
    console.log('   Trying alternative method...\n');

    // Try using PostgREST directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        sql_query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('ideal_target_profiles', 'itp_matches', 'tags', 'business_tags')
          ORDER BY table_name;
        `
      })
    });

    const result = await response.json();
    console.log('Raw API response:', JSON.stringify(result, null, 2));
    return;
  }

  console.log('✅ Found tables:', data);
}

checkSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
