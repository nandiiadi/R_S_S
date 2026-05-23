# =========================================================
# Stage 1: Build the React application
# =========================================================
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

# Install git (some dependencies still expect git binaries)
RUN apk add --no-cache git

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy dependency manifests first (better Docker layer caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy application source
COPY . .

# =========================================================
# Vite build-time environment
# =========================================================

# Mercury proxy path routed through Caddy
# Override with:
# --build-arg VITE_MERCURY_PROXY_URL=...
ARG VITE_MERCURY_PROXY_URL=/mercury

ENV VITE_MERCURY_PROXY_URL=$VITE_MERCURY_PROXY_URL

# =========================================================
# Disable git-hook tooling inside Docker
# =========================================================

ENV HUSKY=0
ENV LEFTHOOK=0
ENV CI=1

# Remove prepare hook to prevent lefthook/git failures
RUN npm pkg delete scripts.prepare || true

# =========================================================
# Build ReactFlux
# =========================================================

RUN HUSKY=0 LEFTHOOK=0 CI=1 pnpm run build

# =========================================================
# Stage 2: Runtime image using Caddy
# =========================================================
FROM caddy:2

# Copy built frontend assets
COPY --from=build /app/build /srv

# Copy Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Expose HTTP port
EXPOSE 2000

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]