/**
 * Test feedback submission workflow
 * Run with: npx tsx scripts/test-feedback-workflow.ts
 */

import { createClient } from '@supabase/supabase-js';
import { FeedbackNotificationService } from '../lib/feedback/notification-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testWorkflow() {
  console.log('🧪 Testing Feedback System Workflow\n');
  console.log('=' .repeat(50));

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Check if feedback table exists and is accessible
  console.log('\n📋 Step 1: Checking database tables...');
  const { data: existingFeedback, error: checkError } = await supabase
    .from('feedback')
    .select('*')
    .limit(1);

  if (checkError) {
    console.log('❌ Database check failed:', checkError.message);
    return;
  }
  console.log('✅ Database tables accessible');

  // Step 2: Create test user (or use existing demo user)
  console.log('\n👤 Step 2: Getting test user...');
  const testEmail = 'hvikram.ai@gmail.com';
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users?.users.find(u => u.email === testEmail) || users?.users[0];

  if (!testUser) {
    console.log('❌ No test user found. Please create a user first.');
    return;
  }
  console.log(`✅ Using test user: ${testUser.email}`);

  // Step 3: Insert test feedback
  console.log('\n📝 Step 3: Creating test feedback...');
  const testFeedback = {
    user_id: testUser.id,
    title: 'Test Bug Report - Automated Workflow Test',
    description: 'This is an automated test of the feedback system. Testing email notifications and database operations.',
    category: 'bug',
    status: 'pending',
    priority: 'high',
    is_public: true,
    tags: ['test', 'bug', 'automation'],
    affected_feature: 'Feedback System',
    page_url: 'http://localhost:3000/feedback',
    browser_info: { test: true, timestamp: new Date().toISOString() },
  };

  const { data: feedback, error: insertError } = await supabase
    .from('feedback')
    .insert(testFeedback)
    .select()
    .single();

  if (insertError) {
    console.log('❌ Failed to insert feedback:', insertError.message);
    return;
  }
  console.log(`✅ Feedback created with ID: ${feedback.id}`);

  // Step 4: Test email notifications
  console.log('\n📧 Step 4: Testing email notifications...');

  try {
    // Test admin notification
    console.log('   Sending admin notification...');
    await FeedbackNotificationService.notifyAdminNewFeedback({
      feedbackId: feedback.id,
      title: feedback.title,
      category: feedback.category,
      description: feedback.description,
      submitterEmail: testUser.email || undefined,
      priority: feedback.priority,
      affectedFeature: feedback.affected_feature,
      isPublic: feedback.is_public,
    });
    console.log('   ✅ Admin notification sent');

    // Test user confirmation
    if (testUser.email) {
      console.log('   Sending user confirmation...');
      await FeedbackNotificationService.sendFeedbackConfirmation({
        userEmail: testUser.email,
        userName: testUser.email.split('@')[0],
        feedbackId: feedback.id,
        title: feedback.title,
        category: feedback.category,
        referenceId: `TEST-${Date.now()}`,
        isPublic: feedback.is_public,
      });
      console.log('   ✅ User confirmation sent');
    }
  } catch (emailError) {
    console.log('   ❌ Email error:', emailError instanceof Error ? emailError.message : emailError);
    console.log('   Note: Check your RESEND_API_KEY in .env.local');
  }

  // Step 5: Test voting
  console.log('\n👍 Step 5: Testing voting...');
  const { error: voteError } = await supabase
    .from('feedback_votes')
    .insert({
      feedback_id: feedback.id,
      user_id: testUser.id,
    });

  if (voteError) {
    console.log('❌ Vote failed:', voteError.message);
  } else {
    console.log('✅ Vote added successfully');

    // Check vote count updated
    const { data: updated } = await supabase
      .from('feedback')
      .select('votes_count')
      .eq('id', feedback.id)
      .single();
    console.log(`   Vote count: ${updated?.votes_count || 0}`);
  }

  // Step 6: Test commenting
  console.log('\n💬 Step 6: Testing comments...');
  const { error: commentError } = await supabase
    .from('feedback_comments')
    .insert({
      feedback_id: feedback.id,
      user_id: testUser.id,
      comment: 'This is a test comment from the automated workflow test.',
    });

  if (commentError) {
    console.log('❌ Comment failed:', commentError.message);
  } else {
    console.log('✅ Comment added successfully');

    // Check comment count updated
    const { data: updated } = await supabase
      .from('feedback')
      .select('comments_count')
      .eq('id', feedback.id)
      .single();
    console.log(`   Comment count: ${updated?.comments_count || 0}`);
  }

  // Step 7: Test status update
  console.log('\n🔄 Step 7: Testing status update...');
  const { error: updateError } = await supabase
    .from('feedback')
    .update({
      status: 'in_review',
      admin_response: 'Thank you for the test feedback. We are reviewing this.',
    })
    .eq('id', feedback.id);

  if (updateError) {
    console.log('❌ Update failed:', updateError.message);
  } else {
    console.log('✅ Status updated to "in_review"');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ WORKFLOW TEST COMPLETED\n');
  console.log('Test Results:');
  console.log(`  - Feedback ID: ${feedback.id}`);
  console.log(`  - View at: http://localhost:3000/feedback/${feedback.id}`);
  console.log(`  - Admin portal: http://localhost:3000/admin/feedback`);
  console.log(`\n📧 Check your email at: ${testEmail}`);
  console.log('   You should receive:');
  console.log('   1. Admin notification (new feedback alert)');
  console.log('   2. User confirmation (thank you email)');

  // Cleanup prompt
  console.log('\n🧹 To clean up test data, run:');
  console.log(`   DELETE FROM feedback WHERE id = '${feedback.id}';`);
}

testWorkflow().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
