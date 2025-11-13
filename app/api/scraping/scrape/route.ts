/**
 * Company Scraping API
 * POST - Trigger web scraping for a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ScrapingOrchestrator } from '@/lib/scraping/scraping-orchestrator';
import type { ScrapingJobRequest } from '@/lib/scraping/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    const {
      company_name,
      company_website,
      company_number,
      linkedin_url,
      providers = ['website'],
    } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      );
    }

    // Create scraping job request
    const jobRequest: ScrapingJobRequest = {
      company_name,
      company_website,
      company_number,
      linkedin_url,
      providers,
      priority: 'normal',
      user_id: user.id,
    };

    // Create orchestrator
    const orchestrator = new ScrapingOrchestrator(supabase);

    // Create job
    const job = await orchestrator.createJob(jobRequest);

    // Execute job asynchronously (don't wait for completion)
    orchestrator.executeJob(job.id).catch((error) => {
      console.error('[Scraping API] Job execution failed:', error);
    });

    return NextResponse.json({
      success: true,
      job_id: job.id,
      message: `Scraping job created for ${company_name}`,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Scraping API] Error:', error);
    console.error('[Scraping API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to create scraping job',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get scraping job status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (jobId) {
      // Get specific job
      const { data: job, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, job });
    } else {
      // List user's jobs
      const { data: jobs, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, jobs });
    }
  } catch (error) {
    console.error('[Scraping API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch scraping jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
