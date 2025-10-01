import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { meddicFramework } from '@/lib/qualification/frameworks/meddic-framework';
import { CalculateMEDDICRequest } from '@/lib/qualification/types/qualification';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CalculateMEDDICRequest = await request.json();

    if (!body.lead_id || !body.company_id) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id and company_id' },
        { status: 400 }
      );
    }

    // Calculate MEDDIC qualification
    const qualification = await meddicFramework.calculateMEDDIC(body);

    if (!qualification) {
      return NextResponse.json(
        { error: 'Failed to calculate MEDDIC qualification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: qualification
    });

  } catch (error) {
    console.error('Error in MEDDIC API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing lead_id parameter' },
        { status: 400 }
      );
    }

    // Get existing MEDDIC qualification
    const { data, error } = await supabase
      .from('meddic_qualifications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      return NextResponse.json(
        { error: 'Failed to fetch MEDDIC qualification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || null
    });

  } catch (error) {
    console.error('Error in MEDDIC GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}