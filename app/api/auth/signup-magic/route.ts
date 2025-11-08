/**
 * Passwordless Signup API
 * Creates account via magic link (no password required)
 *
 * POST /api/auth/signup-magic
 * Body: { email: string, full_name: string, company_name: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rate-limiter';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, company_name } = body;

    // Validate required fields
    if (!email || !full_name || !company_name) {
      return NextResponse.json(
        { error: 'Email, full name, and company name are required' },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check rate limit (3 attempts per 5 minutes per email)
    const rateLimit = await checkRateLimit(`signup:${sanitizedEmail}`, {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Too many signup attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Get origin for redirect URL
    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/auth/callback?next=/onboarding`;

    // Create Supabase client
    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === sanitizedEmail);

    if (userExists) {
      return NextResponse.json(
        {
          error: 'Account already exists',
          message: 'An account with this email already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    // Send magic link with user metadata
    const { error } = await supabase.auth.signInWithOtp({
      email: sanitizedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        data: {
          full_name: full_name.trim(),
          company_name: company_name.trim(),
        },
      },
    });

    if (error) {
      console.error('[Signup Magic] Supabase error:', error);

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to send signup link',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Success response
    console.log(`[Signup Magic] Sent to: ${sanitizedEmail}, Company: ${company_name}`);

    return NextResponse.json({
      success: true,
      message: 'Signup link sent successfully',
      email: sanitizedEmail,
      expiresIn: 300, // 5 minutes
      remaining: rateLimit.remaining,
    });

  } catch (error) {
    console.error('[Signup Magic] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
