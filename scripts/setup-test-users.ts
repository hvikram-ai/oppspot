/**
 * Setup Test Users for E2E Tests
 * Creates test users in Supabase Auth for competitive intelligence testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: 'test@oppspot.com',
    password: 'Test123456!',
    role: 'owner',
    metadata: {
      full_name: 'Test Owner',
      role: 'owner',
    },
  },
  {
    email: 'viewer@oppspot.com',
    password: 'Test123456!',
    role: 'viewer',
    metadata: {
      full_name: 'Test Viewer',
      role: 'viewer',
    },
  },
  {
    email: 'admin@oppspot.com',
    password: 'Admin123456!',
    role: 'admin',
    metadata: {
      full_name: 'Test Admin',
      role: 'admin',
    },
  },
];

async function setupTestUsers() {
  console.log('🔧 Setting up test users for E2E tests...\n');

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error(`❌ Error listing users:`, listError.message);
        continue;
      }

      const existingUser = existingUsers?.users.find((u) => u.email === user.email);

      if (existingUser) {
        console.log(`✓ User ${user.email} already exists (${existingUser.id})`);

        // Update password if needed
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            password: user.password,
            user_metadata: user.metadata,
          }
        );

        if (updateError) {
          console.error(`  ⚠️  Failed to update password:`, updateError.message);
        } else {
          console.log(`  ✓ Password updated`);
        }
      } else {
        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email for test users
          user_metadata: user.metadata,
        });

        if (error) {
          console.error(`❌ Failed to create ${user.email}:`, error.message);
        } else {
          console.log(`✅ Created ${user.email} (${data.user?.id})`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${user.email}:`, error.message);
    }
  }

  console.log('\n✅ Test user setup complete!\n');
  console.log('Test credentials:');
  testUsers.forEach((u) => {
    console.log(`  ${u.role.padEnd(10)} - ${u.email} / ${u.password}`);
  });
}

setupTestUsers().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
