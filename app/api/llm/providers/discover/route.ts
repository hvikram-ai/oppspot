/**
 * API: /api/llm/providers/discover
 *
 * Auto-discover local LLM servers (Ollama, LM Studio, LocalAI)
 *
 * GET - Scan for local servers and return their status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LocalLLMProvider } from '@/lib/llm/providers/LocalLLMProvider';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[LLM Discovery] Scanning for local LLM servers...');

    // Discover local servers
    const servers = await LocalLLMProvider.discoverLocalServers();

    const availableServers = servers.filter(s => s.available);
    const unavailableServers = servers.filter(s => !s.available);

    console.log(`[LLM Discovery] Found ${availableServers.length} available servers`);

    return NextResponse.json({
      success: true,
      scannedAt: new Date().toISOString(),
      summary: {
        totalScanned: servers.length,
        available: availableServers.length,
        unavailable: unavailableServers.length,
      },
      servers: {
        available: availableServers.map(s => ({
          type: s.serverType,
          endpoint: s.endpoint,
          models: s.models || [],
          modelCount: s.models?.length || 0,
        })),
        unavailable: unavailableServers.map(s => ({
          type: s.serverType,
          endpoint: s.endpoint,
        })),
      },
      recommendations: availableServers.length > 0
        ? [
            {
              message: `Found ${availableServers.length} local LLM server(s) running!`,
              action: 'You can configure these in your LLM settings for free, private AI inference.',
            },
          ]
        : [
            {
              message: 'No local LLM servers detected.',
              action: 'Install Ollama (recommended) or LM Studio to run models locally for free.',
              links: {
                ollama: 'https://ollama.ai',
                lmstudio: 'https://lmstudio.ai',
              },
            },
          ],
    });
  } catch (error) {
    console.error('GET /api/llm/providers/discover error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
