/**
 * Filter Options API
 * GET /api/search/filters
 * Get available options for filter dropdowns
 */

import { NextResponse } from 'next/server';
import { advancedFilterService } from '@/lib/search/advanced-filter-service';

export async function GET() {
  try {
    const filterOptions = await advancedFilterService.getFilterOptions();

    return NextResponse.json({
      success: true,
      data: filterOptions,
    });
  } catch (error) {
    console.error('Filter options API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}

// Cache for 1 hour since filter options don't change frequently
export const revalidate = 3600;
