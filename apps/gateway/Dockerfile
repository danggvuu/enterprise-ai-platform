FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.1.0
RUN apk add --no-cache libc6-compat

# Create app directory
WORKDIR /app

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/gateway ./apps/gateway

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm -r run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g pnpm@9.1.0

# Copy everything from base to preserve pnpm symlinks
COPY --from=base /app ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@enterprise/gateway", "start"]
