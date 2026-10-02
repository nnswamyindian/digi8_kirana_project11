# ==============================================================================
# Multi-Stage Production Dockerfile for Kirana SaaS Platform
# ==============================================================================

# Stage 1: Build the React + Vite Frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline

# Copy built frontend assets and backend application
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY database ./database
COPY public ./public
COPY shared ./shared

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/platform/health || exit 1

EXPOSE 5000

CMD ["node", "server/index.js"]
