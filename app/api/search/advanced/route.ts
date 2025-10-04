/**
 * Advanced Search API
 * POST /api/search/advanced
 * Execute filtered search with pagination and sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedFilterService } from '@/lib/search/advanced-filter-service';
import type { FilteredSearchRequest } from '@/types/filters';

export async function POST(request: NextRequest) {
  try {
    const body: FilteredSearchRequest = await request.json();

    // Validate request
    if (!body.filters || !body.pagination) {
      return NextResponse.json(
        { error: 'Missing required fields: filters and pagination' },
        { status: 400 }
      );
    }

    // Validate filters
    const validation = advancedFilterService.validateFilters(body.filters);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid filters',
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Set defaults for pagination and sorting
    const searchRequest: FilteredSearchRequest = {
      filters: body.filters,
      pagination: {
        page: body.pagination.page || 1,
        perPage: Math.min(body.pagination.perPage || 50, 100), // Max 100 per page
      },
      sorting: body.sorting || {
        field: 'updated_at',
        direction: 'desc',
      },
    };

    // Execute search
    const results = await advancedFilterService.executeSearch(searchRequest);

    // Log analytics (optional - can be sent to separate analytics service)
    // await logFilterAnalytics(body.filters, results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Advanced search API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
