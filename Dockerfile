# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl and wget for healthcheck
RUN apk add --no-cache curl wget

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy JWT keys
COPY keys/ ./keys/

# Portas expostas
EXPOSE 3000

# Verificação de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/v1/health || exit 1

# Comando de inicialização direto
CMD ["node", "dist/main"]
