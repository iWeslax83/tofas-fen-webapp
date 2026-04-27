# Multi-stage build for production.
# docker-compose sets context: ./server, so the build context IS the server
# workspace — don't nest under /app/server, just build in /app directly.
#
# I-C7: pin to a specific minor + alpine patch version instead of the
# floating `node:20-alpine` tag, so an upstream re-tag can't silently
# change our base layer. Dependabot (.github/dependabot.yml) tracks the
# `docker` ecosystem and will open PRs when a newer pinned version is
# available. Promote to a digest pin (`@sha256:...`) on first prod cut.
FROM node:20.19-alpine3.20 AS base
WORKDIR /app
COPY package*.json ./

# Build stage — full deps + TS compile. We mount the npm cache so the
# install layer doesn't redownload tarballs every rebuild.
FROM base AS builder
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build && \
    # I-H22: prune dev deps in-place rather than maintaining a separate
    # `deps` stage that does a second `npm ci`. Halves install I/O.
    npm prune --omit=dev

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application — node_modules is now the post-prune set from
# the builder stage, so production gets only runtime deps.
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
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