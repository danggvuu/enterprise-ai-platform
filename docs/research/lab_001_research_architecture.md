# LAB-001: AI Research Architecture

## 1. Research Motivation

Evaluating new AI models or routing algorithms using standard software engineering practices (like Canary deployments) is fundamentally unsafe in the AI space. An LLM failure is not always a 500 Error; it can be a subtle hallucination or a massive breach of a system prompt that goes unnoticed for hours. We need a dedicated Research Laboratory that leverages real enterprise traffic to statistically prove the safety, cost, and quality of a new AI component _before_ it ever touches the production deployment pipeline.

## 2. Architecture

The Research Architecture is built around absolute isolation.

1. **The Production Tap:** The core Gateway `TelemetryEngine` is modified to asynchronously duplicate a random sample (e.g., 5%) of sanitized AI prompts.
2. **The Message Bus:** These prompts are published to a strictly isolated `Research SQS Queue` in a separate AWS Account.
3. **The Research Cluster:** A dedicated Kubernetes cluster (in the Non-Prod account) runs the `Experiment Scheduler`. It reads from the queue, executes the prompt against the `Control` (e.g., GPT-4) and the `Treatment` (e.g., Llama-3-70B), and records the telemetry to the `Result Store`.

## 3. Trade-off Analysis

- **Shadow Traffic vs Offline Batch Replay:** We chose real-time Shadow Traffic. _Trade-off:_ It requires dedicated compute resources constantly running in the background, incurring continuous API costs. _Advantage:_ It tests the experimental models against the exact same temporal patterns, rate limits, and contextual load as the production system, revealing real-world latency spikes that offline batch testing obscures.

## 4. Mermaid Diagrams

```mermaid
graph TD
    A[Enterprise User] --> B[Production AI Gateway]
    B -->|Synchronous| C[Production LLM (GPT-4)]

    B -.->|Asynchronous 5% Sample| D[Research SQS Queue]

    subgraph Isolated AI Research Laboratory
        D --> E[Experiment Scheduler]
        E -->|Treatment A| F[Experimental Model X]
        E -->|Treatment B| G[Experimental Routing Algo Y]

        F --> H[(Research Result Store)]
        G --> H
    end

    H --> I[LLM-as-a-Judge Evaluator]
    I --> J[Research Dashboard / MLflow]
```

## 5. Experiment Design (Example: Routing)

- **Hypothesis:** Switching 30% of internal coding queries from Claude 3.5 Sonnet to an internal open-weight code model (DeepSeek Coder) will reduce costs by 15% without statistically significant degradation in code acceptance rate.
- **Control Group:** Current Semantic Router targeting Claude.
- **Treatment Group:** Experimental ML-based router classifying requests and delegating to the internal model.

## 6. Evaluation Metrics

For every experiment, the platform automatically calculates:

1. **Quality Win Rate:** Calculated via an offline Judge model comparing Control vs Treatment answers.
2. **Latency Delta:** P50, P90, P99 latency differences (measured in milliseconds).
3. **Financial Delta:** Cost per 1,000 requests (measured in USD).
4. **Safety Score:** Rate of prompt injection vulnerabilities detected by the Red Team scanner.

## 7. Threats to Validity

- **The Open-Loop Problem:** Shadow traffic is strictly open-loop. The user receives the _production_ response. If the _experimental_ model asks a clarifying question, the user will never see it, and thus cannot respond. Therefore, multi-turn conversational evaluation in shadow mode degrades in accuracy after the first turn.
- **Mitigation:** The Research Platform must rely on single-turn offline evaluation datasets (Task 4) to validate multi-turn reasoning capabilities, alongside open-loop shadow traffic.
