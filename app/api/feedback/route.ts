// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { FeedbackCategory, FeedbackListResponse, FeedbackSubmissionResponse } from '@/types/feedback';
import { FeedbackNotificationService } from '@/lib/feedback/notification-service';

// Validation schema
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'data_quality', 'integration', 'performance', 'documentation', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  screenshot: z.string().nullable().optional(),
  is_public: z.boolean().default(false),
});

// Generate reference ID
function generateReferenceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FB-${timestamp}${random}`.toUpperCase();
}

// Detect affected feature from URL
function detectFeatureFromUrl(url: string | null): string | null {
  if (!url) return null;

  const featureMap: Record<string, string> = {
    '/research': 'ResearchGPT',
    '/data-room': 'Data Room',
    '/business': 'Business Details',
    '/search': 'Search',
    '/dashboard': 'Dashboard',
    '/map': 'Map',
    '/analytics': 'Analytics',
    '/collections': 'Collections',
    '/streams': 'Streams',
  };

  for (const [path, feature] of Object.entries(featureMap)) {
    if (url.includes(path)) {
      return feature;
    }
  }

  return null;
}

/**
 * POST /api/feedback
 * Submit user feedback
 */
export async function POST(request: NextRequest) {
  console.log('[Feedback API] ===== NEW FEEDBACK SUBMISSION REQUEST =====');
  console.log('[Feedback API] Timestamp:', new Date().toISOString());
  console.log('[Feedback API] Request URL:', request.url);
  console.log('[Feedback API] Request method:', request.method);

  try {
    // Debug: Check ALL headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = key.toLowerCase().includes('auth') || key.toLowerCase().includes('cookie') ? value : '***';
    });
    console.log('[Feedback API] Request headers:', JSON.stringify(headers, null, 2));

    // Debug: Check cookies
    const cookies = request.cookies.getAll();
    console.log('[Feedback API] Cookies present:', cookies.map(c => c.name).join(', '));
    console.log('[Feedback API] Cookie details:', cookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length })));

    // Create Supabase client
    console.log('[Feedback API] Creating Supabase client...');
    const supabase = await createClient();
    console.log('[Feedback API] Supabase client created successfully');

    // Parse request body
    console.log('[Feedback API] Parsing request body...');
    const body = await request.json();
    console.log('[Feedback API] Request body parsed:', {
      hasType: !!body.type,
      hasTitle: !!body.title,
      hasDescription: !!body.description,
      titleLength: body.title?.length,
      descriptionLength: body.description?.length,
      isPublic: body.is_public
    });

    // Validate input
    console.log('[Feedback API] Validating input schema...');
    const validation = feedbackSchema.safeParse(body);
    if (!validation.success) {
      console.error('[Feedback API] Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.issues },
        { status: 400 }
      );
    }
    console.log('[Feedback API] Validation passed');

    const { type, title, description, screenshot, is_public } = validation.data;

    // Get authenticated user
    console.log('[Feedback API] Attempting to get authenticated user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Debug: Log auth state with full details
    console.log('[Feedback API] Auth check result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasAuthError: !!authError,
      authErrorName: authError?.name,
      authErrorMessage: authError?.message,
      authErrorStatus: authError?.status,
      authErrorCode: (authError as any)?.code,
    });

    if (authError || !user) {
      console.error('[Feedback API] ❌ Authentication failed!');
      console.error('[Feedback API] Auth error details:', JSON.stringify(authError, null, 2));
      console.error('[Feedback API] Cookies count:', cookies.length);
      console.error('[Feedback API] Cookie names:', cookies.map(c => c.name));
      return NextResponse.json(
        {
          error: 'Authentication required',
          debug: {
            hasAuthError: !!authError,
            errorMessage: authError?.message,
            errorStatus: authError?.status,
            cookiesCount: cookies.length,
            cookieNames: cookies.map(c => c.name)
          }
        },
        { status: 401 }
      );
    }

    console.log('[Feedback API] ✅ User authenticated successfully:', user.email);

    // Get additional context
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;
    const affectedFeature = detectFeatureFromUrl(referer || null);

    // Generate reference ID
    const referenceId = generateReferenceId();

    // Prepare browser info
    const browserInfo = {
      userAgent: userAgent || '',
      timestamp: new Date().toISOString(),
    };

    // Map type to priority
    const priorityMap: Record<FeedbackCategory, string> = {
      bug: 'high',
      data_quality: 'high',
      feature: 'medium',
      improvement: 'medium',
      integration: 'medium',
      performance: 'high',
      documentation: 'low',
      other: 'low',
    };

    // Insert feedback
    console.log('[Feedback API] Preparing to insert feedback into database...');
    const insertData = {
      user_id: user.id,
      title,
      description,
      category: type,
      status: 'pending' as const,
      priority: priorityMap[type as FeedbackCategory] || 'medium',
      is_public,
      tags: [type],
      affected_feature: affectedFeature,
      page_url: referer,
      browser_info: browserInfo,
      screenshot_url: screenshot || null,
    };
    console.log('[Feedback API] Insert data prepared:', {
      user_id: insertData.user_id,
      title: insertData.title,
      category: insertData.category,
      status: insertData.status,
      priority: insertData.priority,
      is_public: insertData.is_public,
      has_screenshot: !!insertData.screenshot_url,
    });

    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[Feedback API] ❌ Database insert failed!');
      console.error('[Feedback API] Insert error:', insertError);
      console.error('[Feedback API] Insert error code:', insertError.code);
      console.error('[Feedback API] Insert error details:', insertError.details);
      console.error('[Feedback API] Insert error hint:', insertError.hint);
      console.error('[Feedback API] Insert error message:', insertError.message);
      console.error('[Feedback API] Full data being inserted:', JSON.stringify(insertData, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to submit feedback',
          debug: {
            code: insertError.code,
            message: insertError.message,
            hint: insertError.hint,
            details: insertError.details
          }
        },
        { status: 500 }
      );
    }

    console.log('[Feedback API] ✅ Feedback inserted successfully:', feedback.id);

    // Auto-follow the feedback
    const { error: followError } = await supabase
      .from('feedback_followers')
      .insert({
        feedback_id: feedback.id,
        user_id: user.id,
      });

    if (followError) {
      console.log('[Feedback API] Auto-follow failed:', followError);
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('feedback_activity')
      .insert({
        feedback_id: feedback.id,
        user_id: user.id,
        action: 'created',
        new_value: {
          title,
          category: type,
          priority: priorityMap[type as FeedbackCategory],
          is_public
        },
      });

    if (activityError) {
      console.log('[Feedback API] Activity log failed:', activityError);
    }

    // Create submission tracking record
    const { data: submission, error: submissionError } = await supabase
      .from('feedback_submissions')
      .insert({
        feedback_id: feedback.id,
        reference_id: referenceId,
        user_id: user.id,
        user_email: user.email || '',
        admin_email_sent: false,
        user_email_sent: false,
      })
      .select()
      .single();

    // Send email notifications (fire and forget - don't block response)
    const emailsSent = { admin: false, user: false };

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

    // Send admin notification
    FeedbackNotificationService.notifyAdminNewFeedback({
      feedbackId: feedback.id,
      title,
      category: type,
      description,
      submitterEmail: user.email || undefined,
      priority: priorityMap[type as FeedbackCategory] || 'medium',
      affectedFeature,
      isPublic: is_public,
    })
      .then(() => {
        // Update tracking
        supabase
          .from('feedback_submissions')
          .update({ admin_email_sent: true })
          .eq('id', submission?.id || '');
      })
      .catch((err) => console.log('[Feedback API] Admin email failed:', err));

    // Send user confirmation
    if (user.email) {
      FeedbackNotificationService.sendFeedbackConfirmation({
        userEmail: user.email,
        userName,
        feedbackId: feedback.id,
        title,
        category: type,
        referenceId,
        isPublic: is_public,
      })
        .then(() => {
          // Update tracking
          supabase
            .from('feedback_submissions')
            .update({ user_email_sent: true })
            .eq('id', submission?.id || '');
          emailsSent.user = true;
        })
        .catch((err) => console.log('[Feedback API] User email failed:', err));
    }

    const response: FeedbackSubmissionResponse = {
      success: true,
      referenceId,
      feedbackId: feedback.id,
      message: is_public
        ? 'Feedback submitted successfully and posted to the community board!'
        : 'Feedback submitted successfully. It will be reviewed by our team.',
      emailsSent,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Feedback API] ❌❌❌ UNEXPECTED ERROR CAUGHT ❌❌❌');
    console.error('[Feedback API] Error type:', typeof error);
    console.error('[Feedback API] Error name:', (error as any)?.name);
    console.error('[Feedback API] Error message:', (error as any)?.message);
    console.error('[Feedback API] Error stack:', (error as any)?.stack);
    console.error('[Feedback API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    const errorReferenceId = generateReferenceId();
    console.error('[Feedback API] Generated error reference ID:', errorReferenceId);

    return NextResponse.json(
      {
        error: `Failed to submit feedback. Please try again or contact support with reference: ${errorReferenceId}`,
        referenceId: errorReferenceId,
        debug: {
          errorType: typeof error,
          errorName: (error as any)?.name,
          errorMessage: (error as any)?.message,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * List feedback with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Debug: Log auth state for GET
    console.log('[Feedback API GET] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'votes'; // votes, recent, comments
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' });

    // Apply filters
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Show public feedback OR user's own feedback
    query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);

    // Apply sorting
    switch (sort) {
      case 'votes':
        query = query.order('votes_count', { ascending: false });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'comments':
        query = query.order('comments_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: feedback, error, count } = await query;

    if (error) {
      console.error('[Feedback API] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Check if user has voted on each feedback
    const feedbackIds = feedback?.map((f) => f.id) || [];
    const { data: votes } = await supabase
      .from('feedback_votes')
      .select('feedback_id')
      .eq('user_id', user.id)
      .in('feedback_id', feedbackIds);

    const votedIds = new Set(votes?.map((v) => v.feedback_id) || []);

    const feedbackWithVotes = feedback?.map((f) => ({
      ...f,
      hasVoted: votedIds.has(f.id),
    }));

    const response: FeedbackListResponse = {
      feedback: feedbackWithVotes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Feedback API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
