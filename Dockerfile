# ==============================================================================
# PharmaScreen AI - Production Multi-Stage Dockerfile
# Optimized for minimal footprint, non-root security, and high reliability.
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install security patches
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy package manifests
COPY package.json package-lock.json ./

# Install production dependencies only (clean install, skip dev dependencies)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Labels for container metadata
LABEL org.opencontainers.image.title="PharmaScreen AI" \
      org.opencontainers.image.description="In-Silico Drug Candidate Screening and Prediction Platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="PharmaScreen AI Team" \
      org.opencontainers.image.licenses="MIT"

# Set runtime environment variables
ENV NODE_ENV=production \
    PORT=3000

# Copy installed node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source directories and manifests
COPY package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY data ./data
COPY assets ./assets

# Ensure data directory has proper ownership for non-root user
RUN chown -R node:node /app/data

# Run as non-root user for container security
USER node

# Expose HTTP port
EXPOSE 3000

# Container healthcheck testing /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application with PID 1 signal propagation
CMD ["node", "backend/server.js"]
