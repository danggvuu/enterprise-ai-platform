# Project Branding & Identity Guidelines

## 1. Project Name

**Aegis AI**
_(Pronunciation: EE-jis)_

**Origin:** In Greek mythology, the Aegis is the shield carried by Athena and Zeus, symbolizing protection and authority.
**Rationale:** It directly communicates the core value proposition of the platform: Enterprise-grade security, PII protection, and robust control over unpredictable Generative AI models.

## 2. Tagline

_Short (Website Hero):_

> "The Operating System for Enterprise AI."

_Medium (GitHub Description):_

> "Aegis AI is an open-source, production-grade AI Gateway and Agent Control Plane. It provides zero-trust security, dynamic routing, and FinOps observability for enterprises scaling Large Language Models."

## 3. Mission & Vision

**Mission Statement:**

> "To empower every enterprise to adopt and scale Artificial Intelligence securely, transparently, and cost-effectively, without vendor lock-in."

**Vision Statement:**

> "To become the global standard routing and governance layer for the internet's AI traffic, enabling a future where autonomous agents and human workflows collaborate seamlessly and safely."

## 4. Competitive Positioning

Why choose Aegis AI over competitors?

| Feature                 | Aegis AI                            | API Gateways (Kong/Apigee)   | LLM Proxies (LiteLLM)            |
| :---------------------- | :---------------------------------- | :--------------------------- | :------------------------------- |
| **Primary Focus**       | AI Governance & Agent Orchestration | High-throughput REST routing | Unified API format               |
| **Agent Support (MCP)** | First-class (Built-in Tool Auth)    | None                         | None                             |
| **Security**            | Deep Payload PII Masking            | Header/Token only            | Basic filtering                  |
| **FinOps**              | Ledger-backed Token Accounting      | Rate limiting only           | Basic cost tracking              |
| **Target Audience**     | Enterprise Platform Engineers       | DevOps / API Teams           | Indie Hackers / Fast Prototyping |

## 5. Core Values

1. **Security is a Prerequisite, Not a Feature.**
   We operate under Zero-Trust. No prompt leaves the enterprise boundary without passing the Vault.
2. **Mathematically Proven Quality.**
   We do not rely on "vibes." Every routing decision and prompt change must be validated by the Evaluation Engine.
3. **Agnostic & Un-opinionated.**
   We do not lock users into AWS, OpenAI, or LangChain. Aegis sits neutrally between the application and the intelligence provider.
4. **Resilience Over Speed.**
   We will gladly sacrifice 5 milliseconds of latency to ensure a transaction is accurately recorded in the Ledger and traced in the Observability platform.

## 6. Architecture Identity (Visual Language)

_For use in slide decks and UI (Task 15 Design System)_

- **Primary Color:** Obsidian Dark (`#0F172A`) - Conveys enterprise seriousness, stability, and developer-friendliness (Dark Mode).
- **Security Accent:** Aegis Blue (`#3B82F6`) - Used for Vault, Auth, and Policy boundaries.
- **Intelligence Accent:** Vertex Purple (`#8B5CF6`) - Used for LLM interactions, Prompts, and Embeddings.
- **Success Accent:** Emerald Green (`#10B981`) - Used for Cache Hits (Cost Savings) and successful validations.
- **Typography:** `Inter` (UI/Dashboards) and `Fira Code` (Code Snippets).

## 7. Review Checklist (DOC-001)

- [x] Clear, pronounceable project name.
- [x] Tagline that instantly explains the value proposition.
- [x] Positioning statement comparing against alternatives.
- [x] Core values aligned with the architecture decisions made in Prompts 01-18.
