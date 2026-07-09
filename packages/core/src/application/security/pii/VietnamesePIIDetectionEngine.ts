export type PIIType =
  | 'FULL_NAME'
  | 'PHONE_VN'
  | 'EMAIL'
  | 'ADDRESS_VN'
  | 'CCCD' // 12-digit Citizen ID
  | 'CMND' // 9-digit Old ID
  | 'PASSPORT'
  | 'MST' // Tax Code
  | 'BANK_ACCOUNT'
  | 'LICENSE_PLATE_VN'
  | 'INTERNAL_PROJECT_CODE';

export interface DetectedPII {
  readonly type: PIIType;
  readonly value: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly confidence: number; // 0.0 to 1.0
  readonly source: 'REGEX' | 'NER' | 'HYBRID';
}

/**
 * Port for a specific PII detection strategy.
 */
export interface IPIIDetector {
  detect(text: string): Promise<DetectedPII[]>;
}

/**
 * SAFETY-002: Vietnamese PII Detection Engine
 *
 * Hybrid Architecture:
 * 1. Executes deterministic Regex rules for structured Vietnamese PII (CCCD, MST, Phone).
 * 2. Delegates to an external NER (Named Entity Recognition) service for unstructured
 *    contextual PII (Names, Addresses) using models like PhoBERT.
 * 3. Merges and deduplicates overlapping detections.
 */
export class VietnamesePIIDetectionEngine implements IPIIDetector {
  // Deterministic Regex Rules highly optimized for Vietnamese formats
  private readonly regexRules: Array<{ type: PIIType; pattern: RegExp; minConfidence: number }> = [
    {
      // VN Phone: +84, 84, or 0 followed by 9 digits
      type: 'PHONE_VN',
      pattern: /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/g,
      minConfidence: 1.0,
    },
    {
      // CCCD (Căn cước công dân): Exactly 12 digits
      type: 'CCCD',
      pattern: /\b[0-9]{12}\b/g,
      minConfidence: 0.95,
    },
    {
      // CMND (Chứng minh nhân dân): Exactly 9 digits
      type: 'CMND',
      pattern: /\b[0-9]{9}\b/g,
      minConfidence: 0.9,
    },
    {
      // MST (Mã số thuế): 10 digits, optionally followed by a hyphen and 3 digits
      type: 'MST',
      pattern: /\b[0-9]{10}(-[0-9]{3})?\b/g,
      minConfidence: 0.85,
    },
    {
      // VN License Plate: e.g., 29A-123.45 or 29A1-12345
      type: 'LICENSE_PLATE_VN',
      pattern: /\b[1-9][0-9][A-Z][0-9]?-(?:\d{4}|\d{3}\.\d{2})\b/gi,
      minConfidence: 0.9,
    },
    {
      // Standard Email Validation
      type: 'EMAIL',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      minConfidence: 1.0,
    },
  ];

  constructor(
    private readonly nerDetector?: IPIIDetector, // Optional: Pluggable PhoBERT NER service
  ) {}

  public async detect(text: string): Promise<DetectedPII[]> {
    if (!text || text.trim() === '') {
      return [];
    }

    const detections: DetectedPII[] = [];

    // Phase 1: Deterministic Regex Execution (O(N) extremely fast)
    for (const rule of this.regexRules) {
      const matches = text.matchAll(rule.pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          detections.push({
            type: rule.type,
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: rule.minConfidence,
            source: 'REGEX',
          });
        }
      }
    }

    // Phase 2: Contextual NER Execution (Network/GPU bound)
    if (this.nerDetector) {
      try {
        const nerDetections = await this.nerDetector.detect(text);
        detections.push(...nerDetections);
      } catch (error) {
        // Fallback: Log NER failure but return Regex results to guarantee availability
        console.warn('NER Detector failed, degrading to Regex-only detection', error);
      }
    }

    // Phase 3: Deduplication and Conflict Resolution
    return this.resolveOverlaps(detections);
  }

  /**
   * Resolves overlapping PII bounds.
   * Example: A 12-digit CCCD might accidentally trigger a phone number match inside a larger string.
   * Strategy: Prioritize higher confidence, then longer length.
   */
  private resolveOverlaps(detections: DetectedPII[]): DetectedPII[] {
    if (detections.length <= 1) return detections;

    // Sort by starting index (ascending), then by length (descending)
    const sorted = [...detections].sort((a, b) => {
      if (a.startIndex === b.startIndex) {
        return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
      }
      return a.startIndex - b.startIndex;
    });

    const resolved: DetectedPII[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // If they overlap
      if (next.startIndex < current.endIndex) {
        // Keep the one with higher confidence
        if (next.confidence > current.confidence) {
          current = next;
        }
      } else {
        // No overlap, push current and advance
        resolved.push(current);
        current = next;
      }
    }
    resolved.push(current);

    return resolved;
  }
}
