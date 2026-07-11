# ADR 001: Monorepo Foundation and Shared Utilities

## Status
Accepted

## Context
The Enterprise AI Platform requires a scalable workspace to house the Gateway API, Control Plane, SDKs, and CDK Infrastructure in a unified TypeScript environment.

## Decision
1. We chose **NPM Workspaces** (over PNPM) to guarantee broad compatibility without requiring developers to install global package managers or configure strict build approval flags.
2. We chose **Turborepo** to orchestrate the monorepo build graph and cache TypeScript compilations.
3. Core utilities (`@enterprise/logger`, `@enterprise/errors`) are strictly isolated as internal npm packages.
4. The Logger wraps `pino` for zero-allocation structured JSON logging, exposing a Hexagonal `ILogger` port to the domain.

## Consequences
- **Positive:** Domain logic has zero coupling to external observability libraries.
- **Positive:** Monorepo ensures that all microservices share the exact same `tsconfig.base.json` and Error classes.
- **Negative:** A single root package lockfile must be maintained.
