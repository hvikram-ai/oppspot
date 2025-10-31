/**
 * API: /api/llm/settings
 *
 * Manage user's LLM provider configurations
 *
 * GET - Retrieve all configurations (with sanitized API keys)
 * POST - Create or update a configuration
 * DELETE - Remove a configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKeyVault } from '@/lib/llm/security/KeyVault';
import type { ProviderType } from '@/lib/llm/interfaces/ILLMProvider';

interface CreateConfigRequest {
  providerType: ProviderType;
  name: string;
  config: Record<string, any>;
  priority?: number;
  isPrimary?: boolean;
  monthlyTokenLimit?: number;
  monthlyCostLimit?: number;
  rateLimitRPM?: number;
}

interface UpdateConfigRequest extends CreateConfigRequest {
  id: string;
}

/**
 * GET - Retrieve user's provider configurations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch configurations
    const { data: configs, error } = await supabase
      .from('llm_configurations')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Failed to fetch configurations:', error);
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
    }

    // Sanitize configurations (hide full API keys)
    const keyVault = getKeyVault();
    const sanitizedConfigs = configs.map(config => {
      try {
        // Decrypt config
        const decryptedConfig = JSON.parse(keyVault.decrypt(config.encrypted_config));

        // Sanitize API keys
        if (decryptedConfig.apiKey) {
          decryptedConfig.apiKey = keyVault.sanitizeKey(decryptedConfig.apiKey);
        }

        return {
          id: config.id,
          providerType: config.provider_type,
          name: config.name,
          config: decryptedConfig,
          isActive: config.is_active,
          isPrimary: config.is_primary,
          priority: config.priority,
          monthlyTokenLimit: config.monthly_token_limit,
          monthlyCostLimit: config.monthly_cost_limit,
          rateLimitRPM: config.rate_limit_rpm,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          lastUsedAt: config.last_used_at,
          lastTestedAt: config.last_tested_at,
          lastError: config.last_error,
        };
      } catch (e) {
        console.error(`Failed to decrypt config ${config.id}:`, e);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      configurations: sanitizedConfigs,
      count: sanitizedConfigs.length,
    });
  } catch (error) {
    console.error('GET /api/llm/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update a configuration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as CreateConfigRequest | UpdateConfigRequest;
    const keyVault = getKeyVault();

    // Validate required fields
    if (!body.providerType || !body.name || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: providerType, name, config' },
        { status: 400 }
      );
    }

    // Encrypt configuration
    const encryptedConfig = keyVault.encrypt(JSON.stringify(body.config));

    // Check if updating existing config
    if ('id' in body && body.id) {
      // Update existing
      const { data, error } = await supabase
        .from('llm_configurations')
        .update({
          provider_type: body.providerType,
          name: body.name,
          encrypted_config: encryptedConfig,
          priority: body.priority ?? 2,
          is_primary: body.isPrimary ?? false,
          monthly_token_limit: body.monthlyTokenLimit,
          monthly_cost_limit: body.monthlyCostLimit,
          rate_limit_rpm: body.rateLimitRPM,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update configuration:', error);
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration updated successfully',
        configuration: {
          id: data.id,
          providerType: data.provider_type,
          name: data.name,
        },
      });
    } else {
      // Create new
      const { data, error } = await supabase
        .from('llm_configurations')
        .insert({
          user_id: user.id,
          provider_type: body.providerType,
          name: body.name,
          encrypted_config: encryptedConfig,
          priority: body.priority ?? 2,
          is_primary: body.isPrimary ?? false,
          monthly_token_limit: body.monthlyTokenLimit,
          monthly_cost_limit: body.monthlyCostLimit,
          rate_limit_rpm: body.rateLimitRPM ?? 60,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create configuration:', error);
        return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration created successfully',
        configuration: {
          id: data.id,
          providerType: data.provider_type,
          name: data.name,
        },
      }, { status: 201 });
    }
  } catch (error) {
    console.error('POST /api/llm/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Missing configuration ID' },
        { status: 400 }
      );
    }

    // Delete configuration
    const { error } = await supabase
      .from('llm_configurations')
      .delete()
      .eq('id', configId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete configuration:', error);
      return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/llm/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
