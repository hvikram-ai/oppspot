import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeedback() {
  console.log('📊 Checking feedback database records...\n');

  const { data: allFeedback, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const count = allFeedback ? allFeedback.length : 0;
  console.log(`✅ Total feedback found: ${count}\n`);

  if (allFeedback && allFeedback.length > 0) {
    console.log('📋 Recent feedback:\n');
    allFeedback.forEach((fb: any, i: number) => {
      console.log(`${i + 1}. [${fb.status}] ${fb.title}`);
      console.log(`   Category: ${fb.category} | Priority: ${fb.priority}`);
      console.log(`   Votes: ${fb.votes_count} | Comments: ${fb.comments_count}`);
      console.log(`   Public: ${fb.is_public} | Created: ${new Date(fb.created_at).toLocaleString()}`);
      console.log(`   ID: ${fb.id}\n`);
    });
  } else {
    console.log('ℹ️  No feedback records found in database\n');
  }
}

checkFeedback();
