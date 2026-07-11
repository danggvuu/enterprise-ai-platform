import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// In production, this must be a 32-byte (256-bit) key, configured via ENV.
// For this MVP, we provide a fallback if not configured.
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If it's a hex string
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    // If it's base64 or plain text, pad/slice to 32 bytes
    const buf = Buffer.from(envKey);
    if (buf.length === 32) return buf;
    
    // Hash it to exactly 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }
  
  // Fallback for development ONLY
  return crypto.createHash('sha256').update('enterprise-ai-platform-dev-key').digest();
};

export const encrypt = (text: string): string => {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  if (!encryptedText.includes(':')) return encryptedText; // Not encrypted by us, or legacy plain text
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed', err);
    return encryptedText; // Return raw if decryption fails (or throw depending on strictness)
  }
};
