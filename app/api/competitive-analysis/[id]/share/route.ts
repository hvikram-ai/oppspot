import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { validateShareInput, validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/competitive-analysis/errors';
import { z } from 'zod';

const ShareRequestSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  access_level: z.enum(['view', 'edit'], {
    errorMap: () => ({ message: 'Access level must be either "view" or "edit"' }),
  }),
});

/**
 * POST /api/competitive-analysis/[id]/share
 * Invite a user to access the analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(analysisId, 'Analysis ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can share)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can share this analysis');
    }

    // Parse and sanitize request body
    const body = await request.json();
    const sanitizedInput = validateShareInput(body);

    // Validate with Zod schema
    const validationResult = ShareRequestSchema.safeParse(sanitizedInput);

    if (!validationResult.success) {
      const { statusCode, body: errorBody } = handleError(validationResult.error);
      return NextResponse.json(errorBody, { status: statusCode });
    }

    const { user_email, access_level } = validationResult.data;

    // Find user by email
    const { data: invitedUserData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user_email)
      .single();

    if (userError || !invitedUserData) {
      throw new NotFoundError('User', user_email);
    }

    // Check if grant already exists
    const existingGrants = await competitiveAnalysisRepository.getAccessGrants(id);
    const existingGrant = existingGrants.find((g) => g.user_id === invitedUserData.id);

    if (existingGrant) {
      throw new ConflictError('This user already has access to the analysis', user_email);
    }

    // Grant access
    const grant = await competitiveAnalysisRepository.grantAccess(
      id,
      invitedUserData.id,
      access_level,
      user.id,
      'email',
      user_email
    );

    return NextResponse.json(
      {
        grant_id: grant.id,
        message: `Access granted to ${user_email}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * GET /api/competitive-analysis/[id]/share
 * Get all access grants for the analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(analysisId, 'Analysis ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can view grants)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can view access grants');
    }

    // Get access grants
    const grants = await competitiveAnalysisRepository.getAccessGrants(id);

    return NextResponse.json({ grants }, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
