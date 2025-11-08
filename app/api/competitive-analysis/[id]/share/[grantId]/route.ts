import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors';

/**
 * DELETE /api/competitive-analysis/[id]/share/[grantId]
 * Revoke access to the analysis
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; grantId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID formats
    const id = validateUUID(params.id, 'Analysis ID');
    const grantId = validateUUID(params.grantId, 'Grant ID');

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Verify ownership (only owner can revoke)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can revoke access');
    }

    // Revoke access
    await competitiveAnalysisRepository.revokeAccess(grantId, user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
