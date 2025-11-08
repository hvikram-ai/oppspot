/**
 * API Route: GET /api/opp-scan/countries
 *
 * Returns list of countries available for Opp Scan
 *
 * Query parameters:
 * - continent: Filter by continent (Africa, Americas, Asia, Europe, Oceania)
 * - data_coverage: Filter by data source coverage (excellent, good, limited, minimal)
 * - enabled: Filter by enabled status (true/false)
 * - has_free_api: Filter countries with free company registry APIs
 * - search: Search by country name or code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const continent = searchParams.get('continent');
    const dataCoverage = searchParams.get('data_coverage');
    const enabled = searchParams.get('enabled');
    const hasFreeAPI = searchParams.get('has_free_api');
    const search = searchParams.get('search');

    // Create Supabase client
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    // Apply filters
    if (continent) {
      query = query.eq('continent', continent);
    }

    if (dataCoverage) {
      query = query.eq('data_source_coverage', dataCoverage);
    }

    if (enabled !== null && enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true');
    }

    if (hasFreeAPI === 'true') {
      query = query.eq('company_registry_type', 'free_api');
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,country_code.ilike.%${search}%,country_code_alpha3.ilike.%${search}%`
      );
    }

    // Execute query
    const { data: countries, error } = await query;

    if (error) {
      console.error('Error fetching countries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch countries', details: error.message },
        { status: 500 }
      );
    }

    // Return countries with summary statistics
    const summary = {
      total: countries?.length || 0,
      byContinent: countries?.reduce((acc, country) => {
        acc[country.continent] = (acc[country.continent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byDataCoverage: countries?.reduce((acc, country) => {
        acc[country.data_source_coverage] = (acc[country.data_source_coverage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      freeAPICount: countries?.filter(c => c.company_registry_type === 'free_api').length || 0,
    };

    return NextResponse.json({
      countries: countries || [],
      summary,
    });
  } catch (error) {
    console.error('Unexpected error in countries API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
