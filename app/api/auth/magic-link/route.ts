/**
 * Magic Link Authentication API
 * Sends a passwordless login link to the user's email
 *
 * POST /api/auth/magic-link
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rate-limiter';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Disposable email domains to block
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Block disposable email domains
    const emailDomain = sanitizedEmail.split('@')[1];
    if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }

    // Check rate limit (3 attempts per 5 minutes per email)
    const rateLimit = await checkRateLimit(sanitizedEmail, {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Too many magic link requests. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Get origin for redirect URL
    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/auth/callback?next=/dashboard`;

    // Create Supabase client
    const supabase = await createClient();

    // Send magic link via Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      email: sanitizedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true, // Auto-create user if doesn't exist
      },
    });

    if (error) {
      console.error('[Magic Link] Supabase error:', error);

      // Handle specific errors
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
          error: 'Failed to send magic link',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Success response
    console.log(`[Magic Link] Sent to: ${sanitizedEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Magic link sent successfully',
      email: sanitizedEmail,
      expiresIn: 300, // 5 minutes in seconds
      remaining: rateLimit.remaining,
    });

  } catch (error) {
    console.error('[Magic Link] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
