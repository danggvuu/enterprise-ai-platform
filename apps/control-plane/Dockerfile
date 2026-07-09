FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.1.0
RUN apk add --no-cache libc6-compat

# Create app directory
WORKDIR /app

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./

# Copy packages and control plane app
COPY packages ./packages
COPY apps/control-plane ./apps/control-plane

# Install dependencies and build
RUN pnpm install --ignore-scripts
RUN pnpm --filter control-plane run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g pnpm@9.1.0

# Copy everything from base to preserve pnpm symlinks
COPY --from=base /app ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["pnpm", "--filter", "control-plane", "start"]
