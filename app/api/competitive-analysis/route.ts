import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { CreateCompetitiveAnalysisSchema } from '@/lib/competitive-analysis/types';
import { validateAnalysisInput, validatePagination } from '@/lib/competitive-analysis/validation';
import { handleError, UnauthorizedError } from '@/lib/competitive-analysis/errors';

/**
 * GET /api/competitive-analysis
 * List user's competitive analyses with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const { limit, offset } = validatePagination({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    // Fetch analyses
    const { analyses, total } = await competitiveAnalysisRepository.findByUser(user.id, {
      status,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        analyses,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * POST /api/competitive-analysis
 * Create a new competitive analysis
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Parse request body
    const body = await request.json();

    // Sanitize and validate input
    const sanitizedInput = validateAnalysisInput(body);

    // Validate with Zod schema
    const validationResult = CreateCompetitiveAnalysisSchema.safeParse(sanitizedInput);

    if (!validationResult.success) {
      const { statusCode, body: errorBody } = handleError(validationResult.error);
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Create analysis
    const analysis = await competitiveAnalysisRepository.create(validationResult.data, user.id);

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
