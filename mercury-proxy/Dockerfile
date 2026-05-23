FROM node:22-alpine

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy application
COPY server.js .

USER app

EXPOSE 3001

ENV PORT=3001 \
    TIMEOUT_MS=15000 \
    CORS_ORIGIN=*

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
