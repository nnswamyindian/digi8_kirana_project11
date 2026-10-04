# ==============================================================================
# Multi-Stage Production Dockerfile for Kirana SaaS Platform
# ==============================================================================

# Stage 1: Build the React + Vite Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Backend Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_CLIENT=mysql

# Install production backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --prefer-offline

# Copy backend source code and built frontend distribution
WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/platform/health || exit 1

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "index.js"]
