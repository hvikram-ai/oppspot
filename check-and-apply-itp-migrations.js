const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../oppspot/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1);

  // If error message contains "does not exist" or "relation", table doesn't exist
  if (error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
    return false;
  }

  return true;
}

async function executeMigration(migrationFile) {
  console.log(`\n📄 Reading migration: ${path.basename(migrationFile)}`);
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log(`⚙️  Executing migration...`);

  // Use the Supabase SQL execution endpoint
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error(`❌ Migration failed:`, error.message);
    return false;
  }

  console.log(`✅ Migration applied successfully!`);
  return true;
}

async function main() {
  console.log('🔍 Checking ITP feature database status...\n');

  // Check if tables exist
  const tablesExist = {
    ideal_target_profiles: await checkTableExists('ideal_target_profiles'),
    itp_matches: await checkTableExists('itp_matches'),
    tags: await checkTableExists('tags'),
    business_tags: await checkTableExists('business_tags')
  };

  console.log('Database table status:');
  console.log('  ideal_target_profiles:', tablesExist.ideal_target_profiles ? '✅ EXISTS' : '❌ MISSING');
  console.log('  itp_matches:', tablesExist.itp_matches ? '✅ EXISTS' : '❌ MISSING');
  console.log('  tags:', tablesExist.tags ? '✅ EXISTS' : '❌ MISSING');
  console.log('  business_tags:', tablesExist.business_tags ? '✅ EXISTS' : '❌ MISSING');

  // Determine what needs to be done
  const needsTagMigration = !tablesExist.tags || !tablesExist.business_tags;
  const needsItpMigration = !tablesExist.ideal_target_profiles || !tablesExist.itp_matches;

  if (!needsTagMigration && !needsItpMigration) {
    console.log('\n✅ All ITP tables already exist! No migration needed.');
    return;
  }

  console.log('\n🚀 Applying missing migrations...\n');

  // Apply migrations in order
  const migrations = [
    {
      file: '/home/vik/oppspot/supabase/migrations/20250114_tag_management_system.sql',
      needed: needsTagMigration,
      name: 'Tag Management System'
    },
    {
      file: '/home/vik/oppspot/supabase/migrations/20250114_ideal_target_profiles.sql',
      needed: needsItpMigration,
      name: 'Ideal Target Profiles'
    }
  ];

  for (const migration of migrations) {
    if (migration.needed) {
      console.log(`\n📦 Applying: ${migration.name}`);
      const success = await executeMigration(migration.file);
      if (!success) {
        console.error(`\n❌ Failed to apply ${migration.name} migration`);
        process.exit(1);
      }
    } else {
      console.log(`\n⏭️  Skipping: ${migration.name} (already applied)`);
    }
  }

  console.log('\n🎉 All ITP migrations completed successfully!');
  console.log('\n📊 ITP Feature Status:');
  console.log('  ✅ Database tables created');
  console.log('  ✅ Row-level security policies enabled');
  console.log('  ✅ Helper functions installed');
  console.log('  ✅ Indexes created for performance');
  console.log('\n🔗 Next steps:');
  console.log('  1. Test ITP creation via UI at /itp');
  console.log('  2. Create sample ITPs for testing');
  console.log('  3. Run matching engine on businesses');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
