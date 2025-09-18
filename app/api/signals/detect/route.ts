import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fundingDetector from '@/lib/signals/detectors/funding-signal-detector';
import executiveDetector from '@/lib/signals/detectors/executive-change-detector';
import jobAnalyzer from '@/lib/signals/detectors/job-posting-analyzer';
import technologyDetector from '@/lib/signals/detectors/technology-adoption-detector';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { company_id, signal_type, signal_data } = body;

    if (!company_id || !signal_type || !signal_data) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, signal_type, and signal_data' },
        { status: 400 }
      );
    }

    let signal = null;

    // Route to appropriate detector based on signal type
    switch (signal_type) {
      case 'funding_round':
        signal = await fundingDetector.detectFundingRound(company_id, signal_data);
        break;

      case 'executive_change':
        signal = await executiveDetector.detectExecutiveChange(company_id, signal_data);
        break;

      case 'job_posting':
        signal = await jobAnalyzer.analyzeJobPosting(company_id, signal_data);
        break;

      case 'technology_adoption':
        signal = await technologyDetector.detectTechnologyAdoption(company_id, signal_data);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid signal type' },
          { status: 400 }
        );
    }

    if (!signal) {
      return NextResponse.json(
        { error: 'Failed to detect signal or duplicate signal detected' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: signal
    });

  } catch (error) {
    console.error('Error in signal detection API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Batch signal detection
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { company_id, signals } = body;

    if (!company_id || !signals || !Array.isArray(signals)) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id and signals array' },
        { status: 400 }
      );
    }

    const detectedSignals = [];
    const errors = [];

    // Process each signal
    for (const signalInput of signals) {
      try {
        let signal = null;

        switch (signalInput.type) {
          case 'funding_round':
            signal = await fundingDetector.detectFundingRound(company_id, signalInput.data);
            break;
          case 'executive_change':
            signal = await executiveDetector.detectExecutiveChange(company_id, signalInput.data);
            break;
          case 'job_posting':
            signal = await jobAnalyzer.analyzeJobPosting(company_id, signalInput.data);
            break;
          case 'technology_adoption':
            signal = await technologyDetector.detectTechnologyAdoption(company_id, signalInput.data);
            break;
        }

        if (signal) {
          detectedSignals.push(signal);
        } else {
          errors.push({
            type: signalInput.type,
            error: 'Detection failed or duplicate'
          });
        }
      } catch (error) {
        errors.push({
          type: signalInput.type,
          error: String(error)
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        detected: detectedSignals,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error in batch signal detection API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}