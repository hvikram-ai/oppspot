/**
 * Business Search API
 * Quick search for companies by name
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const isDemoMode = searchParams.get('demo') === 'true';

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Return demo data for demo mode
    if (isDemoMode) {
      const demoCompanies = [
        { id: 'demo-1', name: 'Acme Corporation Ltd', company_number: '12345678' },
        { id: 'demo-2', name: 'Tech Innovations UK', company_number: '23456789' },
        { id: 'demo-3', name: 'Global Services Group', company_number: '34567890' },
        { id: 'demo-4', name: 'Digital Solutions Ltd', company_number: '45678901' },
        { id: 'demo-5', name: 'Enterprise Holdings PLC', company_number: '56789012' },
      ];

      // Filter demo companies by query
      const filtered = demoCompanies.filter(company =>
        company.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);

      return NextResponse.json(filtered);
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
