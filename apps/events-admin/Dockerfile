# ==============================================================================
# Events Admin Frontend Dockerfile - Multi-Stage Build for Vite + React
# ==============================================================================

# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY apps/events-admin/package.json ./apps/events-admin/
COPY packages/proto/package.json ./packages/proto/
COPY packages/config/prettier/package.json ./packages/config/prettier/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/events-admin/node_modules ./apps/events-admin/node_modules

# Copy source files
COPY packages/ ./packages/
COPY apps/events-admin/ ./apps/events-admin/
COPY tsconfig.base.json ./
COPY nx.json ./

# Build proto package first
RUN cd packages/proto && bun run build

# Build the frontend
ARG VITE_API_URL=http://localhost:3000
ARG VITE_KRATOS_PUBLIC_URL=http://localhost:4433
ARG VITE_HYDRA_PUBLIC_URL=http://localhost:4444

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KRATOS_PUBLIC_URL=$VITE_KRATOS_PUBLIC_URL
ENV VITE_HYDRA_PUBLIC_URL=$VITE_HYDRA_PUBLIC_URL

RUN cd apps/events-admin && bun run build

# Stage 3: Runner - Nginx for static files
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/events-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/events-admin/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80 || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
