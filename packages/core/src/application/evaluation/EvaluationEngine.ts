import { DecisionContext } from '../../domain/decision/DecisionContext';
import { MemoryResponse } from '../memory/MemoryPlatformOrchestrator';

/**
 * Breakdown of the Enterprise Quality Score metrics.
 */
export interface EvaluationMetrics {
  readonly correctnessScore: number; // 0.0 to 1.0
  readonly safetyScore: number; // 0.0 to 1.0
  readonly groundednessScore: number; // 0.0 to 1.0
  readonly latencyMs: number;
  readonly costUsd: number;
}

/**
 * The final output of an evaluation run.
 */
export interface EvaluationResult {
  readonly experimentId: string;
  readonly traceId: string;
  readonly metrics: EvaluationMetrics;
  readonly compositeEnterpriseScore: number; // 0.0 to 100.0
  readonly evaluatorComments: string[];
}

/**
 * Port for pluggable evaluators (e.g., LLM-as-a-Judge, Regex Evaluator).
 */
export interface IEvaluator {
  evaluate(
    prompt: string,
    response: string,
    context: DecisionContext,
  ): Promise<Partial<EvaluationMetrics> & { comments?: string[] }>;
}

/**
 * Request payload for the Evaluation Engine.
 */
export interface EvaluationRequest {
  readonly experimentId: string;
  readonly traceId: string;
  readonly prompt: string;
  readonly generatedResponse: string;
  readonly context: DecisionContext;
  readonly memoryContext?: MemoryResponse;
}

/**
 * EVAL-001: Enterprise Evaluation Architecture Engine
 *
 * Architecture:
 * Functions as an asynchronous background orchestrator. It receives a trace of an LLM
 * execution (Shadow Traffic, Offline Dataset, or A/B test) and runs it through a pipeline
 * of independent Evaluators.
 *
 * Trade-off:
 * This process is decoupled from the main Gateway hot-path to ensure Evaluation (which
 * often requires calling heavy LLMs to judge responses) never impacts user-facing latency.
 */
export class EvaluationEngine {
  constructor(
    private readonly evaluators: IEvaluator[],
    // Weights for composite score (Task 11)
    private readonly weights = {
      correctness: 0.4,
      safety: 0.3,
      groundedness: 0.2,
      latency: 0.05,
      cost: 0.05,
    },
  ) {}

  /**
   * Executes the evaluation pipeline asynchronously.
   */
  public async evaluateRequest(request: EvaluationRequest): Promise<EvaluationResult> {
    // Run all evaluators in parallel (e.g., Correctness LLM-Judge, Cost Calculator)
    const results = await Promise.all(
      this.evaluators.map((evaluator) =>
        evaluator.evaluate(request.prompt, request.generatedResponse, request.context),
      ),
    );

    // Aggregate metrics
    const metrics: EvaluationMetrics = {
      correctnessScore: this.extractAverage(results, 'correctnessScore', 0.5),
      safetyScore: this.extractAverage(results, 'safetyScore', 1.0), // Default safe
      groundednessScore: this.extractAverage(results, 'groundednessScore', 0.5),
      latencyMs: request.memoryContext?.latencyMs || 0,
      costUsd: 0, // Ideally passed from FinOps context, mocked here
    };

    const comments = results.flatMap((r) => r.comments || []);

    const compositeEnterpriseScore = this.calculateCompositeScore(metrics);

    const evaluationResult: EvaluationResult = {
      experimentId: request.experimentId,
      traceId: request.traceId,
      metrics,
      compositeEnterpriseScore,
      evaluatorComments: comments,
    };

    // In a real system, this result is emitted to Kafka/ClickHouse for the
    // Regression Detection Engine (Task 6) to analyze in bulk.
    this.emitToAnalytics(evaluationResult);

    return evaluationResult;
  }

  private calculateCompositeScore(metrics: EvaluationMetrics): number {
    // Normalization logic: Latency and Cost are inversely penalized
    // Assume max acceptable latency is 10s, max cost is $0.05 for this normalization
    const normalizedLatency = Math.max(0, 1 - metrics.latencyMs / 10000);
    const normalizedCost = Math.max(0, 1 - metrics.costUsd / 0.05);

    const score =
      metrics.correctnessScore * this.weights.correctness +
      metrics.safetyScore * this.weights.safety +
      metrics.groundednessScore * this.weights.groundedness +
      normalizedLatency * this.weights.latency +
      normalizedCost * this.weights.cost;

    return score * 100; // 0-100 scale
  }

  private extractAverage(results: any[], key: string, defaultValue: number): number {
    const valid = results.filter((r) => r[key] !== undefined).map((r) => r[key] as number);
    if (valid.length === 0) return defaultValue;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  private emitToAnalytics(result: EvaluationResult): void {
    // e.g., process.stdout.write or kafka.produce()
    // console.log(`[EVALUATION] Trace: ${result.traceId} | Score: ${result.compositeEnterpriseScore.toFixed(2)}`);
  }
}
