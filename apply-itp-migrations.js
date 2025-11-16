const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function checkTableExists(tableName) {
  try {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      );
    `;

    const result = await executeSQL(sql);
    return result && result.length > 0 && result[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function executeMigrationFile(filepath, name) {
  console.log(`\n📄 Applying: ${name}`);
  console.log(`   File: ${path.basename(filepath)}`);

  const sql = fs.readFileSync(filepath, 'utf8');

  try {
    await executeSQL(sql);
    console.log(`   ✅ Success!`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 ITP Feature Migration Tool\n');
  console.log('📡 Supabase URL:', supabaseUrl);
  console.log('🔑 Service Key:', supabaseServiceKey ? 'SET' : 'MISSING');

  console.log('\n🔍 Checking current database state...\n');

  const tables = {
    'tags': await checkTableExists('tags'),
    'business_tags': await checkTableExists('business_tags'),
    'ideal_target_profiles': await checkTableExists('ideal_target_profiles'),
    'itp_matches': await checkTableExists('itp_matches')
  };

  console.log('Database Table Status:');
  Object.entries(tables).forEach(([table, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  });

  const allExist = Object.values(tables).every(v => v);

  if (allExist) {
    console.log('\n✅ All ITP tables already exist! No migration needed.');
    console.log('\n📋 Next steps:');
    console.log('  1. Run: node create-sample-itps.js');
    console.log('  2. Visit: http://localhost:3000/itp');
    return;
  }

  console.log('\n📦 Applying migrations...');

  const migrations = [
    {
      file: path.join(__dirname, 'supabase/migrations/20250114_tag_management_system.sql'),
      name: 'Tag Management System',
      needed: !tables.tags || !tables.business_tags
    },
    {
      file: path.join(__dirname, 'supabase/migrations/20250114_ideal_target_profiles.sql'),
      name: 'Ideal Target Profiles',
      needed: !tables.ideal_target_profiles || !tables.itp_matches
    }
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const migration of migrations) {
    if (!migration.needed) {
      console.log(`\n⏭️  Skipping: ${migration.name} (already applied)`);
      continue;
    }

    const success = await executeMigrationFile(migration.file, migration.name);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log('='.repeat(60));

  if (failureCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📋 ITP Feature is now active:');
    console.log('  ✅ Database tables created');
    console.log('  ✅ RLS policies enabled');
    console.log('  ✅ Helper functions installed');
    console.log('\n🔗 Next steps:');
    console.log('  1. Run: node create-sample-itps.js');
    console.log('  2. Visit: http://localhost:3000/itp');
  } else {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
