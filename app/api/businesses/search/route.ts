/**
 * Business Search API
 * Quick search for companies by name
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search businesses by name
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, company_number')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[Business Search] Query failed:', error);
      return NextResponse.json(
        { error: 'Failed to search businesses' },
        { status: 500 }
      );
    }

    return NextResponse.json(businesses || []);
  } catch (error) {
    console.error('[Business Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
