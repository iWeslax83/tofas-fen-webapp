# Multi-stage build for production.
# docker-compose sets context: ./server, so the build context IS the server
# workspace — don't nest under /app/server, just build in /app directly.
FROM node:20-alpine AS base

# Install production deps only
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Build stage — full deps + TS compile
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs uploads thumbnails && \
    chown -R nodejs:nodejs logs uploads thumbnails

# Switch to non-root user
USER nodejs

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]