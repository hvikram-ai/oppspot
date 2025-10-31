/**
 * Key Rotation Utilities
 *
 * Manages API key rotation lifecycle, tracking, and auditing.
 */

import { KeyVault, getKeyVault } from './KeyVault';
import { createClient } from '@/lib/supabase/server';

export interface RotationReason {
  type: 'scheduled' | 'compromised' | 'expired' | 'manual' | 'policy';
  description: string;
}

export interface RotationResult {
  success: boolean;
  configId: string;
  oldKeyHash: string;
  newKeyHash: string;
  rotatedAt: Date;
  error?: string;
}

export class KeyRotationService {
  private keyVault: KeyVault;

  constructor() {
    this.keyVault = getKeyVault();
  }

  /**
   * Rotate an API key for a provider configuration
   *
   * @param configId - Configuration ID
   * @param newApiKey - New API key (plain text)
   * @param userId - User performing the rotation
   * @param reason - Reason for rotation
   * @returns Rotation result
   */
  async rotateProviderKey(
    configId: string,
    newApiKey: string,
    userId: string,
    reason: RotationReason
  ): Promise<RotationResult> {
    const supabase = await createClient();

    try {
      // Get current configuration
      const { data: config, error: fetchError } = await supabase
        .from('llm_configurations')
        .select('encrypted_config')
        .eq('id', configId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !config) {
        return {
          success: false,
          configId,
          oldKeyHash: '',
          newKeyHash: '',
          rotatedAt: new Date(),
          error: 'Configuration not found or access denied'
        };
      }

      // Decrypt current config
      const currentConfig = JSON.parse(
        this.keyVault.decrypt(config.encrypted_config)
      );

      // Hash old key for audit trail
      const oldKeyHash = currentConfig.apiKey
        ? this.keyVault.hashKey(currentConfig.apiKey)
        : '';

      // Update with new API key
      currentConfig.apiKey = newApiKey;

      // Encrypt new config
      const newEncryptedConfig = this.keyVault.encrypt(
        JSON.stringify(currentConfig)
      );

      // Hash new key
      const newKeyHash = this.keyVault.hashKey(newApiKey);

      // Update configuration
      const { error: updateError } = await supabase
        .from('llm_configurations')
        .update({
          encrypted_config: newEncryptedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          configId,
          oldKeyHash,
          newKeyHash,
          rotatedAt: new Date(),
          error: `Update failed: ${updateError.message}`
        };
      }

      // Log rotation in audit table
      await this.logRotation(
        configId,
        userId,
        oldKeyHash,
        newKeyHash,
        reason,
        userId
      );

      return {
        success: true,
        configId,
        oldKeyHash,
        newKeyHash,
        rotatedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        configId,
        oldKeyHash: '',
        newKeyHash: '',
        rotatedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Re-encrypt all configurations (e.g., after master key change)
   *
   * @param userId - User ID to re-encrypt configs for
   * @param newMasterKey - New master key (for migration scenarios)
   * @returns Number of configurations re-encrypted
   */
  async reencryptUserConfigs(userId: string): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const supabase = await createClient();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get all user configurations
      const { data: configs, error } = await supabase
        .from('llm_configurations')
        .select('id, encrypted_config, provider_type')
        .eq('user_id', userId);

      if (error || !configs) {
        results.errors.push('Failed to fetch configurations');
        return results;
      }

      for (const config of configs) {
        try {
          // Decrypt with current master key
          const decryptedConfig = this.keyVault.decrypt(config.encrypted_config);

          // Re-encrypt with new salt/IV
          const newEncryptedConfig = this.keyVault.encrypt(decryptedConfig);

          // Update in database
          const { error: updateError } = await supabase
            .from('llm_configurations')
            .update({
              encrypted_config: newEncryptedConfig,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.id)
            .eq('user_id', userId);

          if (updateError) {
            results.failed++;
            results.errors.push(`Config ${config.id}: ${updateError.message}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Config ${config.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return results;
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return results;
    }
  }

  /**
   * Log a key rotation event
   */
  private async logRotation(
    configId: string,
    userId: string,
    oldKeyHash: string,
    newKeyHash: string,
    reason: RotationReason,
    rotatedBy: string
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('llm_key_rotations').insert({
      user_id: userId,
      config_id: configId,
      old_key_hash: oldKeyHash,
      new_key_hash: newKeyHash,
      rotation_reason: `${reason.type}: ${reason.description}`,
      rotated_by: rotatedBy,
      rotated_at: new Date().toISOString()
    });
  }

  /**
   * Get rotation history for a configuration
   *
   * @param configId - Configuration ID
   * @param limit - Number of records to retrieve
   * @returns Rotation history
   */
  async getRotationHistory(
    configId: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    oldKeyHash: string;
    newKeyHash: string;
    rotationReason: string;
    rotatedBy: string;
    rotatedAt: Date;
  }>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('llm_key_rotations')
      .select('*')
      .eq('config_id', configId)
      .order('rotated_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      oldKeyHash: row.old_key_hash,
      newKeyHash: row.new_key_hash,
      rotationReason: row.rotation_reason,
      rotatedBy: row.rotated_by,
      rotatedAt: new Date(row.rotated_at)
    }));
  }

  /**
   * Check if a key should be rotated based on age
   *
   * @param lastRotatedAt - Last rotation date
   * @param maxAgeDays - Maximum age in days before rotation recommended
   * @returns true if rotation is recommended
   */
  shouldRotate(lastRotatedAt: Date, maxAgeDays: number = 90): boolean {
    const ageMs = Date.now() - lastRotatedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays >= maxAgeDays;
  }

  /**
   * Validate a new API key format for a provider
   *
   * @param providerType - Provider type
   * @param apiKey - API key to validate
   * @returns Validation result
   */
  validateKeyFormat(
    providerType: string,
    apiKey: string
  ): { valid: boolean; error?: string } {
    // OpenAI keys
    if (providerType === 'openai') {
      if (!apiKey.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI keys must start with "sk-"' };
      }
      if (apiKey.length < 20) {
        return { valid: false, error: 'OpenAI key appears too short' };
      }
    }

    // Anthropic keys
    if (providerType === 'anthropic') {
      if (!apiKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic keys must start with "sk-ant-"' };
      }
    }

    // OpenRouter keys
    if (providerType === 'openrouter') {
      if (!apiKey.startsWith('sk-or-')) {
        return { valid: false, error: 'OpenRouter keys must start with "sk-or-"' };
      }
    }

    // General validation
    if (apiKey.length < 10) {
      return { valid: false, error: 'API key appears too short' };
    }

    if (apiKey.includes(' ')) {
      return { valid: false, error: 'API key should not contain spaces' };
    }

    return { valid: true };
  }
}

/**
 * Singleton instance
 */
let rotationServiceInstance: KeyRotationService | null = null;

export function getKeyRotationService(): KeyRotationService {
  if (!rotationServiceInstance) {
    rotationServiceInstance = new KeyRotationService();
  }
  return rotationServiceInstance;
}
