import { SecurityViolationError } from '@enterprise/errors';

export interface SafetyResult {
  isSafe: boolean;
  cleanText?: string;
  violations?: string[];
}

// Vietnamese PII Regex patterns
const VN_PHONE_REGEX = /(0[3|5|7|8|9])+([0-9]{8})\b/g;
const VN_CCCD_REGEX = /\b([0-9]{12})\b/g; // 12-digit Citizen ID
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export class SafetyScanner {
  
  /**
   * Masks Personally Identifiable Information (PII) from text.
   * Specific to Vietnamese contexts where applicable.
   */
  public maskPii(text: string): string {
    if (!text) return text;
    
    let clean = text;
    // Mask Phone numbers
    clean = clean.replace(VN_PHONE_REGEX, '[PHONE_REDACTED]');
    // Mask CCCD (Citizen ID)
    clean = clean.replace(VN_CCCD_REGEX, '[CCCD_REDACTED]');
    // Mask Emails
    clean = clean.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');

    return clean;
  }

  /**
   * Detects basic Prompt Injection patterns.
   */
  public detectInjection(text: string): SafetyResult {
    if (!text) return { isSafe: true };

    const lowerText = text.toLowerCase();
    
    // Basic heuristic patterns for prompt injection
    const injectionPatterns = [
      'ignore all previous instructions',
      'ignore previous instructions',
      'disregard previous instructions',
      'you are now',
      'system prompt:',
      'forget everything',
      'bypass safety'
    ];

    const violations: string[] = [];
    
    for (const pattern of injectionPatterns) {
      if (lowerText.includes(pattern)) {
        violations.push(`Detected prompt injection pattern: "${pattern}"`);
      }
    }

    return {
      isSafe: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined,
    };
  }

  /**
   * Pre-flight check combining PII masking and injection detection
   */
  public scanInput(text: string): { text: string } {
    const injectionResult = this.detectInjection(text);
    
    if (!injectionResult.isSafe) {
      throw new SecurityViolationError(
        `Prompt injection detected: ${injectionResult.violations?.join(', ')}`
      );
    }

    const maskedText = this.maskPii(text);
    return { text: maskedText };
  }

  /**
   * Post-flight check for model output
   */
  public scanOutput(text: string): { text: string } {
    // In a real scenario we might check for hallucinated sensitive data, toxicity, etc.
    // For now, we will at least ensure no PII leaked out
    const maskedText = this.maskPii(text);
    return { text: maskedText };
  }
}
