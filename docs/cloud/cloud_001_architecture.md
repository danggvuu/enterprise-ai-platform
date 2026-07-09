# CLOUD-001: Platform Architecture

## 1. Business Motivation

The AI Operating System has proven successful for single-tenant enterprise deployments. However, self-hosting is a massive operational burden for most companies. The market demands a fully managed, globally distributed AI Cloud. By transforming into a multi-tenant Cloud Platform, we can onboard thousands of organizations instantly, aggregate compute demand to negotiate bulk GPU discounts, and launch the world's first true B2B AI Agent Marketplace.

## 2. Architecture

The Global AI Cloud abandons the monolithic "Gateway" pattern in favor of a strictly decoupled **Global Control Plane (GCP)** and **Regional Data Planes (RDP)**.

- **Global Control Plane (GCP):**
  - Hosted in a highly available region (e.g., AWS us-east-1).
  - Handles "slow-moving" administrative traffic: Tenant Creation, Identity Management (SSO), Billing Aggregation, and Marketplace catalog management.
  - Generates routing configurations, RBAC policies, and rate-limit quotas.
- **Global Event Bus:**
  - A globally replicated Kafka or Kinesis stream.
  - Broadcasts configuration changes from the GCP to all Regional Data Planes in near real-time.
- **Regional Data Planes (RDP):**
  - Hosted globally (us-east, us-west, eu-central, ap-northeast).
  - Handles the "hot-path" AI API traffic and Agent Execution loops.
  - RDPs are stateless edge nodes that operate completely independently. If the GCP goes down, the RDPs continue routing AI traffic based on their last cached configuration.

## 3. Trade-off Analysis

- **Eventual Consistency vs Strict Consistency:** We chose Eventual Consistency for tenant configuration via the Global Event Bus.
  - _Trade-off:_ If an administrator updates a Safety Policy in the GCP, it may take 1-3 seconds to propagate to the Tokyo RDP. During this window, an agent might execute using the old policy.
  - _Advantage:_ Absolute Reliability and Latency. The Tokyo RDP does not need to perform a cross-globe synchronous database lookup to the US before processing an AI request.

## 4. Mermaid Diagrams

```mermaid
graph TD
    subgraph Global Control Plane (US-East)
        A[API Management UI]
        B[Identity & Billing]
        C[Marketplace Engine]
    end

    subgraph Global Event Bus (Kafka)
        D((Configuration Sync))
    end

    subgraph Regional Data Plane (EU-Central)
        E[Edge Gateway]
        F[Agent Runtime]
        G[Local Cache]
    end

    subgraph Regional Data Plane (AP-Northeast)
        H[Edge Gateway]
        I[Agent Runtime]
        J[Local Cache]
    end

    A & B & C --> D
    D -.->|Push Config| E
    D -.->|Push Config| H

    K[Enterprise User EU] --> E
    L[Enterprise User Asia] --> H

    E -->|Invoke| M[EU AI Models]
    H -->|Invoke| N[Asia AI Models]
```

## 5. Domain Model

- `Cloud Platform` -> contains many `Regions`
- `Region` -> contains many `Cells` (independent fault domains)
- `Tenant` (Customer Organization) -> assigned to specific `Regions` based on Data Residency.
- `Tenant` -> has many `Marketplace Subscriptions`
- `Tenant` -> has many `Global API Keys`

## 6. API Contracts (Internal Synchronization)

When a tenant creates a new Agent Policy in the GCP, the GCP emits:

```json
{
  "eventId": "evt_987654",
  "eventType": "POLICY_UPDATED",
  "tenantId": "org_123",
  "payload": {
    "policyId": "pol_456",
    "status": "ACTIVE",
    "rules": [...]
  },
  "timestamp": "2026-07-09T21:58:30Z"
}
```

All active RDPs consume this event and update their local highly-available memory grids (e.g., Redis).

## 7. Operational Model

The platform is operated by a dedicated SRE team using a **Cell-Based Deployment Strategy**. When pushing a new version of the Gateway code, it is never deployed globally at once. It is deployed to `Cell 1` in `us-east-1`, soaked for 10 minutes, and progressively rolled out across global cells, automatically rolling back if the error rate exceeds 0.1%.
