import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * BYOK key encryption — AES-256-GCM with a per-key random IV.
 *
 * Format of the stored blob:  iv_hex:ciphertext_hex:auth_tag_hex
 *
 * The encryption key lives in BYOK_ENCRYPTION_KEY as 32 bytes hex (64 chars).
 * Rotating it invalidates all stored keys — the operator has to wipe and ask
 * users to re-enter, since old ciphertexts can't be decrypted with a new key.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits — GCM standard

function getKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'BYOK_ENCRYPTION_KEY is not set. Generate one with `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"` and add it to .env.local.'
    );
  }
  if (raw.length !== 64) {
    throw new Error(
      `BYOK_ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes). Got ${raw.length} chars.`
    );
  }
  return Buffer.from(raw, 'hex');
}

export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

export function decryptApiKey(blob: string): string {
  const key = getKey();
  const parts = blob.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted blob — expected iv:ciphertext:tag.');
  }
  const [ivHex, ctHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ctHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * UI-safe preview — "sk-...XXXX" style. Never store/return more than this
 * to the client; the full plaintext only exists during encrypt/decrypt.
 */
export function keyPreview(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 6) return '••••';
  const tail = trimmed.slice(-4);
  return `••••${tail}`;
}
