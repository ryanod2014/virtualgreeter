# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# Copy package files and turbo config for dependency installation
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/domain ./packages/domain
COPY packages/config ./packages/config
COPY apps/server ./apps/server

# Build packages
RUN pnpm build --filter=@ghost-greeter/domain
RUN pnpm build --filter=@ghost-greeter/server

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for workspace support
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/domain/package.json ./packages/domain/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

WORKDIR /app/apps/server

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "dist/index.js"]

