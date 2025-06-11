# Build stage
FROM node:20-alpine AS build

# Metadata labels
LABEL maintainer="PGBen DevOps Team"
LABEL version="1.0.0"
LABEL description="Plataforma de Gestão de Benefícios Eventuais - PGBen"

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Metadata labels
LABEL maintainer="PGBen DevOps Team"
LABEL version="1.0.0"
LABEL description="Plataforma de Gestão de Benefícios Eventuais - PGBen"

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache curl wget dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# Copy built application from build stage
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist

# Copy scripts directory for JWT key generation
COPY --chown=nextjs:nodejs scripts/ ./scripts/

# Copy docker entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check with improved configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application using entrypoint script
CMD ["./docker-entrypoint.sh"]
