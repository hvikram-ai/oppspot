/**
 * Test Script for SaaS Valuation Feature
 *
 * Tests the complete valuation flow:
 * 1. Create valuation with manual input
 * 2. List valuations
 * 3. Get valuation by ID
 * 4. Recalculate valuation
 * 5. Delete valuation
 */

import { createClient } from '@/lib/supabase/server';

const BASE_URL = 'http://localhost:3000';

async function testValuationFeature() {
  console.log('🚀 Starting Valuation Feature Test...\n');

  try {
    // Step 1: Get authenticated user and data room
    console.log('📋 Step 1: Setup - Getting user and data room...');
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed. Please run: npm run demo-login');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}`);

    // Get or create a test data room
    const { data: dataRooms, error: roomError } = await supabase
      .from('data_rooms')
      .select('id, name')
      .limit(1)
      .single();

    if (roomError || !dataRooms) {
      console.error('❌ No data rooms found. Please create one first.');
      return;
    }

    const dataRoomId = dataRooms.id;
    console.log(`✅ Using data room: ${dataRooms.name} (${dataRoomId})\n`);

    // Step 2: Create valuation with manual input
    console.log('📋 Step 2: Creating valuation with manual input...');

    const createPayload = {
      data_room_id: dataRoomId,
      model_name: 'Test Valuation - ITONICS Q4 2024',
      company_name: 'ITONICS GmbH',
      currency: 'USD',
      fiscal_year_end: '2024-12-31',
      extraction_method: 'manual',
      arr: 10000000, // $10M ARR
      mrr: 833333, // ~$833K MRR
      revenue_growth_rate: 45.5, // 45.5% growth
      gross_margin: 75.0, // 75% margin
      net_revenue_retention: 110.0, // 110% NRR
      cac_payback_months: 12,
      ebitda: 500000, // $500K EBITDA
      employees: 85,
    };

    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;

    const createResponse = await fetch(`${BASE_URL}/api/data-room/valuations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(createPayload),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('❌ Create failed:', error);
      return;
    }

    const createResult = await createResponse.json();
    console.log('✅ Valuation created successfully!');
    console.log(`   Valuation ID: ${createResult.valuation_model_id}`);
    console.log(`   Range: ${createResult.valuation_range}`);
    console.log(`   Confidence: ${(createResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Multiple: ${createResult.multiple_low}x - ${createResult.multiple_high}x\n`);

    const valuationId = createResult.valuation_model_id;

    // Step 3: List valuations
    console.log('📋 Step 3: Listing all valuations...');

    const listResponse = await fetch(
      `${BASE_URL}/api/data-room/valuations?data_room_id=${dataRoomId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      console.error('❌ List failed');
      return;
    }

    const listResult = await listResponse.json();
    console.log(`✅ Found ${listResult.valuations.length} valuation(s)\n`);

    // Step 4: Get specific valuation
    console.log('📋 Step 4: Getting valuation details...');

    const getResponse = await fetch(`${BASE_URL}/api/data-room/valuations/${valuationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!getResponse.ok) {
      console.error('❌ Get failed');
      return;
    }

    const getResult = await getResponse.json();
    console.log('✅ Valuation details retrieved:');
    console.log(`   Status: ${getResult.valuation.status}`);
    console.log(`   ARR: $${(getResult.valuation.arr / 1000000).toFixed(1)}M`);
    console.log(`   Growth: ${getResult.valuation.revenue_growth_rate}%`);
    console.log(`   Valuation: ${getResult.valuation_range}\n`);

    // Step 5: Recalculate with updated assumptions
    console.log('📋 Step 5: Recalculating with updated growth rate...');

    const recalcPayload = {
      revenue_growth_rate: 60.0, // Increase to 60%
    };

    const recalcResponse = await fetch(
      `${BASE_URL}/api/data-room/valuations/${valuationId}/calculate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(recalcPayload),
      }
    );

    if (!recalcResponse.ok) {
      console.error('❌ Recalculate failed');
      return;
    }

    const recalcResult = await recalcResponse.json();
    console.log('✅ Valuation recalculated!');
    console.log(`   New Range: ${recalcResult.valuation_range}`);
    console.log(`   New Multiple: ${recalcResult.multiple_mid.toFixed(1)}x\n`);

    // Step 6: Delete valuation (cleanup)
    console.log('📋 Step 6: Cleaning up - deleting test valuation...');

    const deleteResponse = await fetch(`${BASE_URL}/api/data-room/valuations/${valuationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!deleteResponse.ok) {
      console.error('❌ Delete failed');
      return;
    }

    console.log('✅ Test valuation deleted\n');

    // Summary
    console.log('🎉 All tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Create valuation - PASSED');
    console.log('   ✅ List valuations - PASSED');
    console.log('   ✅ Get valuation - PASSED');
    console.log('   ✅ Recalculate valuation - PASSED');
    console.log('   ✅ Delete valuation - PASSED');
    console.log('\n🚀 Valuation feature is working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error(error instanceof Error ? error.stack : error);
  }
}

// Run tests
testValuationFeature().catch(console.error);
