#!/bin/bash
set -e

echo "============================================="
echo "   Enterprise AI Platform - Dev Startup      "
echo "============================================="

# 1. Start Docker containers (Postgres, Redis)
echo "[1/4] Starting PostgreSQL and Redis..."
docker-compose up -d

# 2. Wait for DB to be ready
echo "Waiting for PostgreSQL to accept connections..."
until docker exec $(docker-compose ps -q postgres) pg_isready -U postgres; do
  sleep 1
done

# 3. Database migrations and generation
echo "[2/4] Initializing Database..."
npx pnpm@9.1.0 --filter @ai-gateway/database run generate
npx pnpm@9.1.0 --filter @ai-gateway/database run push
npx pnpm@9.1.0 --filter @ai-gateway/database run seed

# 4. Start applications
echo "[3/4] Starting API Gateway and Control Plane..."
npx pnpm@9.1.0 run dev:turbo

echo "============================================="
echo "   Platform Started Successfully!            "
echo "   Gateway: http://localhost:8080            "
echo "   Control Plane: http://localhost:3000      "
echo "============================================="
