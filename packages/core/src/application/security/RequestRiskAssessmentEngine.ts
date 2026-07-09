import { DecisionContext } from '../../domain/decision/DecisionContext';

/**
 * Categorized level of risk for an incoming AI request.
 */
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Standardized Safety Modules available in the Enterprise AI Safety Platform.
 */
export type SafetyModule =
  | 'VIETNAMESE_PII_DETECTION'
  | 'PII_MASKING'
  | 'PROMPT_INJECTION_HEURISTICS'
  | 'PROMPT_INJECTION_SEMANTIC'
  | 'PROMPT_INJECTION_LLM_JUDGE'
  | 'SENSITIVE_DATA_CLASSIFICATION'
  | 'RESPONSE_VALIDATION_EGRESS';

/**
 * The output of the Risk Assessment phase, dictating the exact
 * safety pipeline the request must traverse.
 */
export interface RiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly requiredModules: SafetyModule[];
  readonly assessmentReason: string;
  readonly dropRequestImmediately: boolean;
}

/**
 * Inbound port for Risk Assessment operations.
 */
export interface IRequestRiskAssessmentEngine {
  evaluateRisk(context: DecisionContext): RiskAssessment;
}

/**
 * SAFETY-001: Request Risk Assessment Engine
 *
 * This engine acts as the first line of defense. It analyzes the context of the request
 * (User Role, Compliance Level, Prompt Metadata) to assign a risk score.
 *
 * To optimize performance, low-risk internal requests bypass heavy LLM-based security checks,
 * while high-risk public or highly-privileged requests are subjected to the maximum security pipeline.
 */
export class RequestRiskAssessmentEngine implements IRequestRiskAssessmentEngine {
  public evaluateRisk(context: DecisionContext): RiskAssessment {
    // 1. Hard Kill Switches (Critical Risk)
    if (context.policy.dataResidencyRequired && context.complianceLevel === 'FedRAMP') {
      // Example: We might drop immediately if routing outside allowed zones isn't handled here
      // But purely from a safety perspective, let's assess the payload risk.
    }

    // 2. Determine Base Risk Level based on Security & Compliance Context
    const riskLevel = this.calculateRiskLevel(context);

    // 3. Determine Required Safety Pipeline
    const requiredModules = this.determineSafetyPipeline(riskLevel, context);

    // 4. Construct Assessment
    return {
      riskLevel,
      requiredModules,
      assessmentReason: `Assessed as ${riskLevel} due to SecurityLevel: ${context.securityLevel} and Role: ${context.user.role}`,
      dropRequestImmediately: false,
    };
  }

  private calculateRiskLevel(context: DecisionContext): RiskLevel {
    // Highly Confidential data or strictly regulated compliance boundaries inherently carry High/Critical risk
    if (
      context.securityLevel === 'StrictlyConfidential' ||
      context.complianceLevel === 'SOC2' ||
      context.complianceLevel === 'HIPAA'
    ) {
      return 'Critical';
    }

    if (context.securityLevel === 'Confidential' || context.complianceLevel === 'GDPR') {
      return 'High';
    }

    // External users or external data
    if (context.user.role === 'BusinessUser' && context.securityLevel === 'Public') {
      return 'Medium';
    }

    // Default for trusted internal dev environments with non-sensitive data
    if (context.tenant.environment === 'dev' || context.tenant.environment === 'test') {
      return 'Low';
    }

    return 'Medium';
  }

  private determineSafetyPipeline(riskLevel: RiskLevel, context: DecisionContext): SafetyModule[] {
    const pipeline: SafetyModule[] = [
      // Standard checks run on ALL requests
      'VIETNAMESE_PII_DETECTION',
      'PII_MASKING',
      'PROMPT_INJECTION_HEURISTICS',
      'RESPONSE_VALIDATION_EGRESS',
    ];

    if (riskLevel === 'Medium' || riskLevel === 'High' || riskLevel === 'Critical') {
      // Add semantic detection for non-low risk
      pipeline.push('PROMPT_INJECTION_SEMANTIC');
      pipeline.push('SENSITIVE_DATA_CLASSIFICATION');
    }

    if (riskLevel === 'Critical') {
      // The most expensive and slowest checks are reserved for Critical risk
      pipeline.push('PROMPT_INJECTION_LLM_JUDGE');
    }

    return pipeline;
  }
}
