# Enterprise AI Gateway (v1.0.0 Production Release)

The Enterprise AI Gateway is a secure, high-performance API routing layer and management control plane designed for enterprises to orchestrate, monitor, and enforce compliance across multiple Large Language Models (LLMs).

## Core Capabilities

*   **Dynamic Intelligent Routing**: Routes requests to optimal providers (OpenAI, AWS Bedrock, Local Ollama) based on live latency, availability, and cost constraints.
*   **Enterprise Security Guardrails**: Built-in PII shielding (GDPR/HIPAA compliance), prompt injection detection, and full audit logging for every token.
*   **Cost Control & FinOps**: Tracks token usage by department and user, enforces routing limits, and heavily leverages Semantic Caching for massive cost savings.
*   **Admin Control Plane**: A centralized dashboard to visualize live operational metrics, configure active providers, and set routing policies.
*   **Employee Portal**: A secure chat interface for internal teams, featuring document uploads and a persistent history layer.

## Architecture

This is a modern monorepo built for extreme performance and enterprise scale.

```text
├── apps/
│   ├── control-plane/       # Next.js 15 UI for Admins and Employees
│   └── gateway/             # Fastify REST & SSE API Server
└── packages/
    ├── database/            # Prisma ORM & PostgreSQL Schema
    ├── auth/                # JWT & RBAC Authentication
    ├── cache/               # Redis Semantic Caching Layer
    ├── finops/              # Cost estimation Engine
    ├── models/              # Provider SDKs (OpenAI, Bedrock, Ollama)
    └── safety/              # PII and Prompt Injection Scanners
```

## Quick Start (Installation Wizard)

We provide a frictionless setup experience for evaluating the platform.

### Prerequisites
*   Node.js v20+
*   PostgreSQL 15+ (Local or via Docker)
*   Redis (Local or via Docker)
*   Docker & Docker Compose (Optional, for 1-click DB setup)

### 1-Click Setup

1. Run the setup wizard:
   ```bash
   ./setup.sh
   ```
2. The wizard will automatically:
   * Validate environment dependencies.
   * Install all npm packages.
   * Provision the database schema (`npm run db:push`).
   * Boot the Gateway Server on `http://localhost:3000`.
   * Boot the Control Plane UI on `http://localhost:3001`.

3. Open your browser to `http://localhost:3001` to initialize the first Organization Admin account.

## Documentation

*   [System Architecture & Design](./docs/architecture.md)
*   [Provider Configuration Guide](./docs/providers.md)
*   [API Documentation (Swagger)](#api)

## Technology Stack

*   **API Gateway**: Fastify, TypeScript
*   **Frontend**: Next.js 15, React 19, TailwindCSS, Shadcn/UI, React Query, Recharts, Lucide Icons
*   **Data Layer**: PostgreSQL, Prisma ORM
*   **Caching**: Redis, ioredis
*   **Authentication**: Custom Enterprise Auth Module (Argon2, JWT)

## API Documentation

The Gateway provides an OpenAPI 3.0 Swagger interface. Once the server is running, navigate to:

```text
http://localhost:3000/docs
```

## License
Enterprise Proprietary
