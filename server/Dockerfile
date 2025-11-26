# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production && \
    cd server && npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies
RUN npm ci && \
    cd server && npm ci

# Copy source code
COPY . .

# Build the application
RUN cd server && npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/server/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server/package*.json ./

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