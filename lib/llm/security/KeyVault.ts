/**
 * KeyVault - Enterprise-grade API Key Encryption
 *
 * Provides AES-256-GCM encryption for securely storing user API keys.
 * Based on enterprise security architecture from appboardguru2.
 *
 * Features:
 * - AES-256-GCM encryption algorithm
 * - PBKDF2 key derivation (100,000 iterations)
 * - Automatic IV generation per encryption
 * - Authentication tags for integrity
 * - Timing-safe comparison functions
 *
 * Environment Variables Required:
 * - LLM_MASTER_KEY: 64-character hex string (32 bytes) for encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

export class KeyVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyVaultError';
  }
}

export class KeyVault {
  private masterKey: Buffer;

  constructor() {
    const masterKeyHex = process.env.LLM_MASTER_KEY;

    if (!masterKeyHex) {
      throw new KeyVaultError(
        'LLM_MASTER_KEY environment variable is required for key encryption. ' +
        'Generate one with: openssl rand -hex 32'
      );
    }

    if (masterKeyHex.length !== 64) {
      throw new KeyVaultError(
        'LLM_MASTER_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32'
      );
    }

    try {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    } catch (error) {
      throw new KeyVaultError('Invalid LLM_MASTER_KEY format. Must be a hex string.');
    }
  }

  /**
   * Encrypt an API key
   *
   * @param apiKey - The plain text API key to encrypt
   * @returns Encrypted string in format: salt:iv:tag:encrypted
   */
  encrypt(apiKey: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);

      // Derive encryption key from master key using PBKDF2
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        DIGEST
      );

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      // Encrypt the API key
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt:iv:tag:encrypted
      const result = [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
      ].join(':');

      return result;
    } catch (error) {
      throw new KeyVaultError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt an API key
   *
   * @param encryptedKey - Encrypted string in format: salt:iv:tag:encrypted
   * @returns Decrypted API key
   */
  decrypt(encryptedKey: string): string {
    try {
      // Split encrypted string into components
      const parts = encryptedKey.split(':');

      if (parts.length !== 4) {
        throw new KeyVaultError('Invalid encrypted key format');
      }

      const [saltHex, ivHex, tagHex, encrypted] = parts;

      // Convert from hex to buffers
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // Validate lengths
      if (salt.length !== SALT_LENGTH) {
        throw new KeyVaultError('Invalid salt length');
      }
      if (iv.length !== IV_LENGTH) {
        throw new KeyVaultError('Invalid IV length');
      }
      if (tag.length !== TAG_LENGTH) {
        throw new KeyVaultError('Invalid tag length');
      }

      // Derive encryption key from master key using PBKDF2
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        DIGEST
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new KeyVaultError(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate if a string is properly encrypted
   *
   * @param encryptedKey - String to validate
   * @returns true if valid format, false otherwise
   */
  isValidEncryptedKey(encryptedKey: string): boolean {
    try {
      const parts = encryptedKey.split(':');
      if (parts.length !== 4) return false;

      const [saltHex, ivHex, tagHex] = parts;

      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      return (
        salt.length === SALT_LENGTH &&
        iv.length === IV_LENGTH &&
        tag.length === TAG_LENGTH
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random token
   *
   * @param length - Length of token in bytes (default: 32)
   * @returns Hex-encoded random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create a hash of an API key for comparison/lookup
   *
   * @param apiKey - API key to hash
   * @returns SHA-256 hash of the key
   */
  hashKey(apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
  }

  /**
   * Timing-safe comparison of two strings
   *
   * @param a - First string
   * @param b - Second string
   * @returns true if strings are equal
   */
  timingSafeEqual(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);

      if (bufA.length !== bufB.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize an API key for display (show first/last 4 characters)
   *
   * @param apiKey - API key to sanitize
   * @returns Sanitized key like "sk-ab...xyz"
   */
  sanitizeKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '***';
    }

    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);

    return `${start}...${end}`;
  }

  /**
   * Rotate an encrypted key (decrypt and re-encrypt with new salt/IV)
   *
   * @param encryptedKey - Current encrypted key
   * @returns Newly encrypted key
   */
  rotateKey(encryptedKey: string): string {
    const decrypted = this.decrypt(encryptedKey);
    return this.encrypt(decrypted);
  }

  /**
   * Generate a secure password reset token with expiration
   *
   * @param expiresInSeconds - Expiration time in seconds (default: 1 hour)
   * @returns Object with token and expiration timestamp
   */
  generateSecureToken(expiresInSeconds: number = 3600): {
    token: string;
    expiresAt: Date;
  } {
    const token = this.generateToken(32);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return { token, expiresAt };
  }
}

/**
 * Singleton instance of KeyVault
 */
let keyVaultInstance: KeyVault | null = null;

/**
 * Get or create the KeyVault singleton instance
 */
export function getKeyVault(): KeyVault {
  if (!keyVaultInstance) {
    keyVaultInstance = new KeyVault();
  }
  return keyVaultInstance;
}

/**
 * Test if KeyVault is properly configured
 */
export function isKeyVaultConfigured(): boolean {
  try {
    const masterKeyHex = process.env.LLM_MASTER_KEY;
    return !!(masterKeyHex && masterKeyHex.length === 64);
  } catch {
    return false;
  }
}
