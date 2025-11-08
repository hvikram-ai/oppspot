/**
 * API: /api/ollama/manage
 *
 * Manage Ollama server lifecycle
 *
 * POST - Start or stop the Ollama server
 * GET - Get server status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOllamaStatus,
  startOllamaServer,
  stopOllamaServer,
  isOllamaInstalled,
} from '@/lib/llm/utils/ollama-server';

/**
 * GET - Get Ollama server status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || 'http://localhost:11434';

    console.log('[Ollama Manage] Checking status...');

    const status = await getOllamaStatus(endpoint);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[Ollama Manage] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Start or stop Ollama server
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'start' or 'stop'

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      );
    }

    console.log(`[Ollama Manage] ${action}ing Ollama server...`);

    let result;
    if (action === 'start') {
      result = await startOllamaServer();
    } else {
      result = await stopOllamaServer();
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      pid: result.pid,
    });
  } catch (error) {
    console.error('[Ollama Manage] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
