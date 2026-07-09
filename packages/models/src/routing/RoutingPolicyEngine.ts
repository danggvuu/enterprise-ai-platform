import { RouteRequest } from './types';

export class RoutingPolicyEngine {
  
  public evaluatePolicies(request: RouteRequest, context: { containsPII?: boolean; budgetExceeded?: boolean }): RouteRequest {
    const evaluatedRequest = { ...request };

    // Initialize arrays if missing
    evaluatedRequest.requiredCompliance = evaluatedRequest.requiredCompliance || [];
    evaluatedRequest.requiredFeatures = evaluatedRequest.requiredFeatures || [];

    // Policy 1: If request contains Vietnamese PII -> Require high compliance (e.g. fedramp or gdpr)
    if (context.containsPII) {
      if (!evaluatedRequest.requiredCompliance.includes('gdpr')) {
        evaluatedRequest.requiredCompliance.push('gdpr');
      }
    }

    // Policy 2: If company budget exceeded -> Downgrade model automatically or force cost-optimized strategy
    if (context.budgetExceeded) {
      evaluatedRequest.strategy = 'cost-optimized';
      evaluatedRequest.budgetCapUsd = 0.001; // Strict cap
    }

    // Policy 3: Vision requirements
    // If the request format implies images, force vision feature
    if (evaluatedRequest.customData?.hasImages) {
      if (!evaluatedRequest.requiredFeatures.includes('vision')) {
        evaluatedRequest.requiredFeatures.push('vision');
      }
    }

    return evaluatedRequest;
  }
}
