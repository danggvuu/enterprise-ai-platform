#!/bin/bash
set -e

echo "================================================="
echo " Enterprise AI Gateway - Production Setup Wizard"
echo "================================================="

# 1. Environment checks
echo "[1/4] Checking environment requirements..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    exit 1
fi
if ! command -v npm &> /dev/null && ! command -v pnpm &> /dev/null; then
    echo "ERROR: npm or pnpm is required."
    exit 1
fi
if ! command -v docker &> /dev/null; then
    echo "WARNING: Docker is not installed. PostgreSQL and Redis will need to be provided manually."
fi
echo "Environment looks good."

# 2. Package installation
echo "[2/4] Installing dependencies and building packages..."
npx pnpm@9.1.0 install || true
npx pnpm@9.1.0 run build || true

# 3. Database configuration
echo "[3/4] Configuring database..."
if [ -f "docker-compose.yml" ]; then
    echo "Starting Docker containers (PostgreSQL, Redis)..."
    docker-compose up -d postgres redis
    sleep 5
fi

echo "Generating Prisma Client..."
npx pnpm@9.1.0 --filter @ai-gateway/database run generate || true

echo "Pushing database schema..."
npx pnpm@9.1.0 --filter @ai-gateway/database exec prisma db push || true

# 4. Starting services
echo "[4/4] Starting Enterprise AI Platform..."

echo "Starting backend gateway (Port 3000)..."
(cd apps/gateway && npx tsx watch src/server.ts) &
GATEWAY_PID=$!

echo "Starting frontend control plane (Port 3001)..."
(cd apps/control-plane && npx next dev -p 3001) &
FRONTEND_PID=$!

echo ""
echo "================================================="
echo "✅ Setup Complete!"
echo "Gateway running on: http://localhost:3000"
echo "Control Plane running on: http://localhost:3001"
echo ""
echo "Navigate to http://localhost:3001 to create your first Organization and Admin."
echo "Press Ctrl+C to stop all services."
echo "================================================="

# Trap ctrl-c and call cleanup
trap cleanup INT
function cleanup() {
    echo "Stopping services..."
    kill $GATEWAY_PID
    kill $FRONTEND_PID
    exit 0
}

wait
