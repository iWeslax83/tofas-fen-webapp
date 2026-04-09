# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_WS_URL

# Build the application
RUN npm run build

# Production stage - serve with nginx as non-root on an unprivileged port.
# The stock nginx:alpine master runs as root so it can bind :80 and then drops
# workers to the 'nginx' user. We instead run the entire process as the
# unprivileged 'nginx' user on :8080; any platform-level Service/Ingress
# maps the public port to 8080.
FROM nginx:alpine AS production

# Copy custom nginx config (listens on 8080 via the override below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Drop the top-level `user nginx;` directive (meaningless when we're already
# running as nginx) and move the PID file to a writable location. Then chown
# the runtime dirs so the nginx user can write caches, logs, and the PID file.
RUN sed -i '/^user  *nginx;/d' /etc/nginx/nginx.conf \
    && sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf.d /var/log/nginx \
    && touch /tmp/nginx.pid \
    && chown nginx:nginx /tmp/nginx.pid

USER nginx

# Health check (wget ships with nginx:alpine's BusyBox)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Expose the unprivileged port
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
