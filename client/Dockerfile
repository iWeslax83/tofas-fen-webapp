# Multi-stage build for production.
#
# Builder stage uses node:22-bookworm-slim (Debian/glibc) instead of alpine
# (musl) so Tailwind's @tailwindcss/oxide native binding — which ships only
# glibc binaries — can load. The production stage is still nginx:alpine (it
# only serves pre-built static files, no native deps needed).
#
# I-C7: both base images are pinned by digest in addition to the minor
# version tag. The `tag@sha256:...` form makes Docker verify that the
# digest matches what we audited; an upstream re-tag of `node:22.22-bookworm-slim`
# can no longer silently change our base layer. Dependabot's docker
# updater understands this format and will open PRs to bump both the tag
# and the digest atomically.
FROM node:26.4-bookworm-slim@sha256:b16ca7b4dcfb20184e1c70f9ee30c6a75ed1da669cfafd6d2add4761b123d79f AS base

# Install dependencies only when needed.
# We copy only package.json (NOT package-lock.json) and run `npm install`
# so npm re-resolves optional platform-specific deps (notably
# @tailwindcss/oxide's native binding) for the container's libc instead of
# inheriting whatever the host build machine wrote into the lock. This is
# the documented workaround for https://github.com/npm/cli/issues/4828.
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit

# Build stage
FROM base AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_WS_URL

# Build the application
RUN npm run build

# Production stage - serve with nginx as non-root on an unprivileged port.
# The stock nginx master runs as root so it can bind :80 and then drops
# workers to the 'nginx' user. We instead run the entire process as the
# unprivileged 'nginx' user on :8080; any platform-level Service/Ingress
# maps the public port to 8080.
# I-C7: pinned by digest as well as the mainline + alpine version tag.
FROM nginx:1.31-alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a AS production

# Copy custom nginx config (listens on 8080 via the override below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Drop the top-level `user nginx;` directive (meaningless when we're already
# running as nginx) and move the PID file to a writable location. The PID
# directive must be matched by its leading `pid` keyword (not by the path):
# nginx 1.27 shipped `pid /var/run/nginx.pid;`, 1.29 ships `pid /run/nginx.pid;`,
# so a path-specific sed silently no-ops on bumps and the unprivileged nginx
# user then can't open the original location.
RUN sed -i '/^user  *nginx;/d' /etc/nginx/nginx.conf \
    && sed -i 's|^pid .*;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
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
