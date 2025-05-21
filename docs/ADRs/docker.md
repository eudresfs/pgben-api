# Estratégia Docker para o PGBen

## Objetivo

Implementar uma solução Docker completa para o PGBen que garanta:

* **Ambiente de desenvolvimento** com hot reload e depuração facilitada
* **Ambiente de produção** seguro, escalável e em conformidade com LGPD
* **Isolamento de ambientes** para evitar conflitos
* **Monitoramento e observabilidade** integrados
* **Segurança reforçada** para dados sensíveis
* **Conformidade** com as políticas de segurança e LGPD do projeto

## 🧱 Estrutura de Arquivos para o PGBen

```
/
├── src/                            # Código-fonte da aplicação
├── docker/
│   ├── config/                     # Configurações de serviços
│   │   ├── prometheus/             # Configurações do Prometheus
│   │   ├── grafana/                # Dashboards e configurações do Grafana
│   │   ├── nginx/                  # Configurações de proxy reverso
│   │   └── ssl/                    # Certificados SSL (não versionado)
│   ├── scripts/                    # Scripts auxiliares
│   │   ├── entrypoint.sh           # Script de inicialização produção
│   │   ├── entrypoint.dev.sh       # Script de inicialização desenvolvimento
│   │   └── wait-for-it.sh          # Script para aguardar serviços
│   └── volumes/                    # Volumes persistentes
│       ├── postgres/               # Dados do PostgreSQL
│       ├── minio/                  # Dados do MinIO
│       └── prometheus/             # Dados do Prometheus
├── docker-compose.yml              # Configuração base (comum)
├── docker-compose.override.yml     # Configurações específicas para desenvolvimento
├── docker-compose.prod.yml         # Configurações específicas para produção
├── docker-compose.monitoring.yml   # Configuração de monitoramento
├── Dockerfile                      # Build para produção
├── Dockerfile.dev                  # Build para desenvolvimento com hot reload
├── .dockerignore                   # Arquivos a serem ignorados no build
├── .env                            # Variáveis de ambiente base
├── .env.dev                        # Variáveis de ambiente para desenvolvimento
├── .env.prod                       # Variáveis de ambiente para produção
├── .env.monitoring                 # Variáveis para monitoramento
├── docker-entrypoint.sh            # Script de inicialização para produção
├── docker-entrypoint.dev.sh        # Script de inicialização para desenvolvimento
├── package.json
└── tsconfig.json
```

## ⚙️ Implementação dos Arquivos

### 1. 📄 `Dockerfile` (Produção para PGBen)

```dockerfile
# Estágio de build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências de build
RUN apk add --no-cache python3 make g++

# Copia arquivos de dependência
COPY package*.json tsconfig*.json ./

# Instala dependências de produção
RUN npm ci --only=production

# Copia o código fonte
COPY . .

# Compila o TypeScript
RUN npm run build

# Remove arquivos desnecessários após o build
RUN find . -name "*.test.*" -delete && \
    find . -name "*.spec.*" -delete && \
    find . -name "*.d.ts" -delete && \
    rm -rf src test coverage

# Estágio final
FROM node:20-alpine

WORKDIR /app

# Instala dependências de runtime
RUN apk add --no-cache curl wget tzdata

# Configura o fuso horário
ENV TZ=America/Sao_Paulo

# Copia o node_modules e arquivos compilados do estágio de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Copia scripts de inicialização
COPY docker/scripts/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Cria usuário não-root para execução segura
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Expõe a porta da aplicação
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["/docker-entrypoint.sh"]
```

### 2. 📄 `Dockerfile.dev` (Desenvolvimento para PGBen)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instala dependências de desenvolvimento
RUN apk add --no-cache curl wget git python3 make g++ tzdata \
    && npm install -g nodemon ts-node typescript @nestjs/cli

# Configura o fuso horário
ENV TZ=America/Sao_Paulo

# Copia o package.json e instala as dependências
COPY package*.json tsconfig*.json ./
RUN npm install

# Copia scripts de inicialização
COPY docker/scripts/entrypoint.dev.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Cria usuário não-root para execução segura
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Expõe a porta da aplicação
EXPOSE 3000

# Healthcheck para desenvolvimento
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização para desenvolvimento
CMD ["/docker-entrypoint.sh"]
```

### 3. 📄 `docker-compose.yml` (Base para PGBen)

```yaml
version: '3.8'

# Redes para isolar ambientes
networks:
  pgben_network:
    driver: bridge
    name: pgben_network

# Volumes para persistência de dados
volumes:
  pgben_postgres_data:
    name: pgben_postgres_data
  pgben_redis_data:
    name: pgben_redis_data
  pgben_minio_data:
    name: pgben_minio_data
  pgben_prometheus_data:
    name: pgben_prometheus_data
  pgben_grafana_data:
    name: pgben_grafana_data

# Serviços compartilhados
services:
  # Aplicação principal
  api:
    build:
      context: .
      dockerfile: Dockerfile
    image: pgben-api:latest
    container_name: pgben_api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - TZ=America/Sao_Paulo
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - pgben_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Banco de dados PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: pgben_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER:-postgres}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-postgres}
      - POSTGRES_DB=${DB_NAME:-pgben}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - pgben_postgres_data:/var/lib/postgresql/data
      - ./docker/scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    networks:
      - pgben_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-pgben}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Cache Redis
  redis:
    image: redis:7-alpine
    container_name: pgben_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-your_secure_redis_password}
    volumes:
      - pgben_redis_data:/data
    networks:
      - pgben_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Armazenamento de objetos MinIO
  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: pgben_minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY:-minioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY:-minioadmin}
      - MINIO_DEFAULT_BUCKETS=pgben-documents,pgben-backups
    volumes:
      - pgben_minio_data:/data
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    networks:
      - pgben_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 📄 `docker-compose.override.yml` (Desenvolvimento PGBen)

```yaml
version: '3.8'

# Serviços de desenvolvimento
services:
  # Aplicação principal em modo desenvolvimento
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: pgben_api_dev
    command: npm run start:dev
    ports:
      - "3001:3000"  # Porta diferente da produção
    volumes:
      - .:/app
      # Ignora node_modules do host, usando o do container
      - /app/node_modules
      # Habilita depuração
      - /app/dist
    env_file:
      - .env.dev
    environment:
      - NODE_ENV=development
      - DEBUG=pgben:*,nest:*
      # Configurações específicas para desenvolvimento
      - TYPEORM_LOGGING=true
      - TYPEORM_SYNCHRONIZE=false
    networks:
      - pgben_network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    # Configuração para hot-reload
    extra_hosts:
      - "host.docker.internal:host-gateway"

  # Serviços adicionais para desenvolvimento
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pgben_pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@pgben.local
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD:-admin123}
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - pgben_network
    depends_on:
      - postgres

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: pgben_redis_commander
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    networks:
      - pgben_network
    depends_on:
      - redis

  # Exposição de portas para serviços em desenvolvimento
  postgres:
    ports:
      - "5433:5432"  # Porta diferente da produção
    environment:
      - POSTGRES_USER=${DB_DEV_USER:-devuser}
      - POSTGRES_PASSWORD=${DB_DEV_PASSWORD:-devpass}
      - POSTGRES_DB=${DB_DEV_NAME:-pgben_dev}
    volumes:
      - ./docker/scripts/init-dev-db.sh:/docker-entrypoint-initdb.d/init-dev-db.sh

  redis:
    ports:
      - "6380:6379"  # Porta diferente da produção

  minio:
    ports:
      - "9001:9000"  # API - Porta diferente da produção
      - "9091:9001"  # Console - Porta diferente da produção
    environment:
      - MINIO_ROOT_USER=${MINIO_DEV_ACCESS_KEY:-devminioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_DEV_SECRET_KEY:-devminioadmin}

# Volumes adicionais para desenvolvimento
volumes:
  pgadmin_data:
    name: pgben_pgadmin_data
```

### 5. 📄 `docker-compose.prod.yml` (Produção PGBen)

```yaml
version: '3.8'

# Serviços de produção
services:
  # Aplicação principal em produção
  api:
    build:
      context: .
      dockerfile: Dockerfile
    image: pgben-api:${APP_VERSION:-latest}
    container_name: pgben_api_prod
    restart: always
    env_file:
      - .env.prod
    environment:
      - NODE_ENV=production
      - TZ=America/Sao_Paulo
      # Configurações de segurança
      - NODE_OPTIONS=--max-http-header-size=16384
      - NODE_ENV=production
      # Configurações de log
      - LOG_LEVEL=info
      - LOG_FORMAT=json
    ports:
      - "3000:3000"
    networks:
      - pgben_network
      - pgben_proxy_network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
        compress: "true"
    secrets:
      - db_password
      - redis_password
      - jwt_secret
      - minio_access_key
      - minio_secret_key
    configs:
      - source: app_config
        target: /app/config/production.json

  # Serviços de banco de dados em produção
  postgres:
    image: postgres:15-alpine
    container_name: pgben_postgres_prod
    restart: always
    environment:
      - POSTGRES_USER_FILE=/run/secrets/db_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
      - POSTGRES_DB=${DB_NAME:-pgben_prod}
      - PGDATA=/var/lib/postgresql/data/pgdata
      - POSTGRES_INITDB_ARGS=--data-checksums
    volumes:
      - pgben_postgres_data_prod:/var/lib/postgresql/data
      - pgben_postgres_backup:/backups
      - ./docker/scripts/backup-db.sh:/docker-entrypoint-initdb.d/backup-db.sh
    networks:
      - pgben_network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 2G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-pgben_prod}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    secrets:
      - db_user
      - db_password
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
        compress: "true"

  # Redis em produção
  redis:
    image: redis:7-alpine
    container_name: pgben_redis_prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - pgben_redis_data_prod:/data
    networks:
      - pgben_network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    secrets:
      - redis_password
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # MinIO em produção
  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: pgben_minio_prod
    restart: always
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER_FILE=/run/secrets/minio_access_key
      - MINIO_ROOT_PASSWORD_FILE=/run/secrets/minio_secret_key
      - MINIO_REGION=us-east-1
      - MINIO_BROWSER_REDIRECT_URL=https://minio.pgben.local
    volumes:
      - pgben_minio_data_prod:/data
      - pgben_minio_config:/root/.minio
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    networks:
      - pgben_network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    secrets:
      - minio_access_key
      - minio_secret_key
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
        compress: "true"

# Redes adicionais para produção
networks:
  pgben_network:
    driver: bridge
    name: pgben_network
  pgben_proxy_network:
    external: true
    name: proxy_network

# Volumes para persistência em produção
volumes:
  pgben_postgres_data_prod:
    name: pgben_postgres_data_prod
  pgben_postgres_backup:
    name: pgben_postgres_backup
  pgben_redis_data_prod:
    name: pgben_redis_data_prod
  pgben_minio_data_prod:
    name: pgben_minio_data_prod
  pgben_minio_config:
    name: pgben_minio_config

# Secrets para configurações sensíveis
secrets:
  db_user:
    file: ./secrets/db_user.txt
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  minio_access_key:
    file: ./secrets/minio_access_key.txt
  minio_secret_key:
    file: ./secrets/minio_secret_key.txt

# Configurações da aplicação
configs:
  app_config:
    file: ./config/production.json
```

### 6. 📄 `docker/scripts/entrypoint.sh` (Produção PGBen)

```bash
#!/bin/sh
set -e

# Função para log formatado
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Aguarda serviço estar disponível
wait_for_service() {
  local host=$1
  local port=$2
  local service=$3
  local max_retries=30
  local retry_interval=5
  local counter=0

  log "🔍 Aguardando serviço $service em $host:$port..."
  
  until nc -z $host $port; do
    counter=$((counter+1))
    if [ $counter -ge $max_retries ]; then
      log "❌ Falha ao conectar ao $service após $max_retries tentativas"
      exit 1
    fi
    log "⏳ Tentativa $counter/$max_retries - $service ainda não está disponível, aguardando $retry_interval segundos..."
    sleep $retry_interval
  done
  
  log "✅ $service está pronto!"
}

# Verifica se as variáveis de ambiente necessárias estão definidas
check_required_vars() {
  local required_vars=(
    "DB_HOST" "DB_PORT" "DB_USERNAME" "DB_PASSWORD" "DB_DATABASE"
    "REDIS_HOST" "REDIS_PORT" "REDIS_PASSWORD"
    "MINIO_ENDPOINT" "MINIO_PORT" "MINIO_ACCESS_KEY" "MINIO_SECRET_KEY"
    "JWT_SECRET"
  )
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      log "❌ Variável de ambiente obrigatória não definida: $var"
      exit 1
    fi
  done
}

# Executa migrações do banco de dados
run_migrations() {
  log "🔄 Executando migrações do banco de dados..."
  npx typeorm migration:run || {
    log "❌ Falha ao executar migrações"
    exit 1
  }
  log "✅ Migrações executadas com sucesso"
}

# Inicializa buckets padrão no MinIO
init_minio_buckets() {
  log "🔄 Verificando buckets no MinIO..."
  
  # Instala o cliente MinIO se não estiver instalado
  if ! command -v mc &> /dev/null; then
    log "📥 Instalando cliente MinIO (mc)..."
    wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc
  fi
  
  # Configura o cliente MinIO
  mc alias set minio http://${MINIO_ENDPOINT}:${MINIO_PORT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} --api S3v4 > /dev/null
  
  # Cria buckets padrão se não existirem
  declare -a buckets=("pgben-documents" "pgben-backups" "pgben-temp")
  
  for bucket in "${buckets[@]}"; do
    if ! mc ls minio | grep -q "$bucket"; then
      log "📦 Criando bucket $bucket no MinIO..."
      mc mb minio/$bucket
      
      # Aplica políticas de acesso
      if [ "$bucket" == "pgben-documents" ]; then
        mc policy set download minio/$bucket
      else
        mc policy set private minio/$bucket
      fi
    else
      log "ℹ️  Bucket $bucket já existe"
    fi
  done
  
  log "✅ Configuração do MinIO concluída"
}

# Função principal
main() {
  log "🚀 Iniciando inicialização do PGBen..."
  
  # Verifica variáveis de ambiente
  check_required_vars
  
  # Aguarda serviços dependentes
  wait_for_service "$DB_HOST" "$DB_PORT" "PostgreSQL"
  wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"
  wait_for_service "$MINIO_ENDPOINT" "$MINIO_PORT" "MinIO"
  
  # Executa migrações
  run_migrations
  
  # Configura buckets no MinIO
  init_minio_buckets
  
  # Inicia a aplicação
  log "🚀 Iniciando aplicação PGBen..."
  exec node dist/main.js "$@"
}

# Executa a função principal
main "$@"
```

### 7. 📄 `docker/scripts/entrypoint.dev.sh` (Desenvolvimento PGBen)

```bash
#!/bin/sh
set -e

# Função para log formatado
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEV] $1"
}

# Aguarda serviço estar disponível
wait_for_service() {
  local host=$1
  local port=$2
  local service=$3
  
  log "🔍 Aguardando $service em $host:$port..."
  until nc -z $host $port; do
    sleep 2
  done
  log "✅ $service está pronto!"
}

# Verifica se o diretório node_modules existe
check_node_modules() {
  if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependências..."
    npm install
  fi
}

# Configura ambiente de desenvolvimento
setup_dev_environment() {
  log "⚙️  Configurando ambiente de desenvolvimento..."
  
  # Cria arquivo .env se não existir
  if [ ! -f ".env" ]; then
    log "📄 Criando arquivo .env a partir de .env.example..."
    cp .env.example .env
  fi
  
  # Verifica se as variáveis necessárias estão definidas
  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_DATABASE" ]; then
    log "⚠️  Variáveis de banco de dados não definidas. Verifique seu arquivo .env"
    exit 1
  fi
}

# Função principal
main() {
  log "🚀 Iniciando ambiente de desenvolvimento do PGBen..."
  
  # Configura ambiente
  setup_dev_environment
  
  # Verifica dependências
  check_node_modules
  
  # Aguarda serviços dependentes
  wait_for_service "${DB_HOST:-postgres}" "${DB_PORT:-5432}" "PostgreSQL"
  wait_for_service "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" "Redis"
  wait_for_service "${MINIO_ENDPOINT:-minio}" "${MINIO_PORT:-9000}" "MinIO"
  
  # Executa migrações
  log "🔄 Executando migrações do banco de dados..."
  npx typeorm migration:run || {
    log "❌ Falha ao executar migrações"
    exit 1
  }
  
  # Inicia a aplicação com hot-reload
  log "🚀 Iniciando aplicação em modo desenvolvimento com hot-reload..."
  exec npm run start:debug
}

# Executa a função principal
main "$@"

### 8. 📄 `.dockerignore`

```
# Dependências
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log
package-lock.json
yarn.lock

# Ambiente
.env
.env.*
!.env.example

# Build
dist/
build/
coverage/

# Testes
*.test.ts
*.spec.ts
coverage/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Editor
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Sistema operacional
.DS_Store
Thumbs.db

# Docker
Dockerfile
Dockerfile.*
docker-compose.*.yml
.dockerignore

# Documentação
docs/
*.md

# Configurações
.eslintrc.js
.prettierrc
.prettierignore
.tsconfig.json

# Pasta temporária
tmp/
temp/

# Arquivos de configuração local
*.local

# Arquivos de desenvolvimento
.vercel
.netlify
.next
.nuxt
.cache
```

### 9. 📄 Configuração no `package.json`

```json
{{ ... }}

# Parar ambiente de produção
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### 🚀 Como Usar no PGBen

### 🔧 Desenvolvimento

```bash
# Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Reconstruir e reiniciar um serviço específico
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build api

# Ver logs da aplicação
docker-compose logs -f api

# Acessar o container da API
docker-compose exec api sh

# Executar testes
docker-compose exec api npm test

# Executar migrações manualmente
docker-compose exec api npx typeorm migration:run

# Acessar o banco de dados via psql
docker-compose exec postgres psql -U ${DB_DEV_USER:-devuser} -d ${DB_DEV_NAME:-pgben_dev}

# Acessar o MinIO Console
# Disponível em: http://localhost:9091
# Usuário: devminioadmin
# Senha: devminioadmin

# Acessar o PGAdmin
# Disponível em: http://localhost:5050
# Email: admin@pgben.local
# Senha: admin123 (ou a senha definida em PGADMIN_PASSWORD)

# Acessar o Redis Commander
# Disponível em: http://localhost:8081
```

### 🚀 Produção

```bash
# 1. Configurar as variáveis de ambiente
cp .env.example .env.prod
# Editar o arquivo .env.prod com as configurações de produção

# 2. Criar diretório para secrets
mkdir -p secrets

# 3. Gerar secrets (execute e preencha os arquivos)
echo -n "postgres" > secrets/db_user.txt
echo -n "sua_senha_segura" > secrets/db_password.txt
echo -n "sua_senha_redis" > secrets/redis_password.txt
echo -n "sua_chave_jwt" > secrets/jwt_secret.txt
echo -n "minioaccesskey" > secrets/minio_access_key.txt
echo -n "miniosecretkey" > secrets/minio_secret_key.txt

# 4. Tornar os scripts executáveis
chmod +x docker/scripts/*.sh

# 5. Construir e iniciar em produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 6. Verificar se todos os serviços estão saudáveis
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 7. Ver logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# 8. Parar ambiente de produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# 9. Fazer backup do banco de dados
docker exec -t pgben_postgres_prod pg_dump -U ${DB_USER:-postgres} ${DB_NAME:-pgben_prod} > backup_$(date +%Y%m%d).sql

# 10. Restaurar backup
cat backup_20231101.sql | docker exec -i pgben_postgres_prod psql -U ${DB_USER:-postgres} ${DB_NAME:-pgben_prod}
```

### 🛠️ Comandos Úteis

```bash
# Limpar recursos não utilizados
docker system prune -a --volumes

# Ver uso de recursos dos containers
docker stats

# Acompanhar logs em tempo real
docker-compose logs -f --tail=100

# Ver variáveis de ambiente de um container
docker exec pgben_api_prod env

# Fazer backup de um volume
docker run --rm -v pgben_postgres_data_prod:/source -v $(pwd):/backup busybox tar czf /backup/pgben_postgres_backup_$(date +%Y%m%d).tar.gz -C /source .

# Restaurar volume a partir de um backup
docker run --rm -v pgben_postgres_data_prod:/target -v $(pwd):/backup busybox sh -c "cd /target && tar xzf /backup/pgben_postgres_backup_20231101.tar.gz"
```

## 🔒 Boas Práticas de Segurança para o PGBen

1. **Segurança de Contêineres**
   - Use usuários não-root nos containers
   - Aplique políticas de segurança com AppArmor ou SELinux
   - Limite recursos de CPU/memória por container
   - Use `--read-only` para sistemas de arquivos quando possível

2. **Gerenciamento de Segredos**
   - Use Docker Secrets ou volumes criptografados para credenciais
   - Nunca faça commit de arquivos .env ou credenciais no controle de versão
   - Gere chaves JWT fortes e as armazene com segurança
   - Renove regularmente as credenciais de banco de dados e chaves de API

3. **Monitoramento e Logging**
   - Configure o Docker para rotação de logs
   - Implemente monitoramento centralizado
   - Monitore tentativas de acesso não autorizado
   - Configure alertas para comportamentos suspeitos

4. **Rede**
   - Use redes internas do Docker para comunicação entre serviços
   - Exponha apenas as portas necessárias
   - Implemente um WAF (Web Application Firewall) na frente da API
   - Use HTTPS para todas as comunicações

5. **Conformidade LGPD**
   - Criptografe dados sensíveis em trânsito e em repouso
   - Implemente políticas de retenção de logs
   - Mantenha registros de acesso a dados sensíveis
   - Certifique-se de que os backups estejam criptografados

6. **Atualizações**
   - Mantenha o Docker e as imagens base atualizadas
   - Escaneie imagens em busca de vulnerabilidades
   - Aplique patches de segurança prontamente
   - Mantenha um inventário de todas as dependências

7. **Backup e Recuperação**
   - Automatize backups regulares
   - Teste regularmente os procedimentos de recuperação
   - Armazene backups em local seguro e separado
   - Documente os procedimentos de recuperação de desastres

### 🧹 Comandos de Limpeza

```bash
# Parar todos os containers
docker stop $(docker ps -aq)

# Remover todos os containers
docker rm $(docker ps -aq)

# Remover todos os volumes não utilizados
docker volume prune

# Remover todas as imagens não utilizadas
docker image prune -a

# Remover redes não utilizadas
docker network prune

# Remover todos os recursos não utilizados (containers, redes, imagens, caches)
docker system prune -a --volumes

# Limpar o builder cache
docker builder prune -a
```

## 🏁 Conclusão

A estratégia de Docker implementada para o PGBen foi projetada para atender às necessidades específicas do projeto, fornecendo:

1. **Desenvolvimento Ágil**
   - Hot-reload para desenvolvimento
   - Ferramentas de desenvolvimento integradas
   - Ambiente consistente entre desenvolvedores

2. **Produção Robusta**
   - Alta disponibilidade
   - Escalabilidade horizontal
   - Monitoramento integrado
   - Segurança reforçada

3. **Conformidade e Segurança**
   - Práticas recomendadas de segurança
   - Conformidade com LGPD
   - Gerenciamento seguro de segredos
   - Isolamento de ambientes

4. **Manutenção Simplificada**
   - Documentação abrangente
   - Scripts automatizados
   - Procedimentos padronizados
   - Monitoramento e logging

### Próximos Passos

1. Configurar CI/CD para deploy automatizado
2. Implementar monitoramento avançado com Prometheus e Grafana
3. Configurar backup automatizado dos bancos de dados
4. Implementar testes de carga e desempenho
5. Revisar e atualizar regularmente as imagens base

## 📚 Recursos Adicionais

- [Documentação Oficial do Docker](https://docs.docker.com/)
- [Melhores Práticas de Docker](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Segurança em Contêineres](https://snyk.io/learn/docker-security/)
- [Padrões de Projeto para Aplicações Node.js em Contêineres](https://github.com/goldbergyoni/nodebestpractices)

---

*Documentação atualizada em: 01/11/2023*

## 🔍 Solução de Problemas Comuns

1. **Erro de permissão no volume do PostgreSQL**
   ```bash
   sudo chown -R 70:70 ./postgres-data
   ```

2. **Limpar cache do Docker**
   ```bash
   docker builder prune
   docker system prune
   ```

3. **Verificar logs de um serviço específico**
   ```bash
   docker-compose logs -f nome_do_servico
   ```

4. **Forçar reconstrução de uma imagem**
   ```bash
   docker-compose build --no-cache nome_do_servico
   ```

5. **Verificar uso de recursos**
   ```bash
   # Verificar estatísticas em tempo real
   docker stats
   
   # Verificar uso de disco
   docker system df
   
   # Verificar processos em execução em um container
   docker top nome_do_container
   ```

6. **Problemas de rede**
   ```bash
   # Verificar redes disponíveis
   docker network ls
   
   # Inspecionar uma rede específica
   docker network inspect nome_da_rede
   
   # Testar conectividade entre containers
   docker run --rm --network nome_da_rede busybox ping -c 3 nome_do_servico
   ```

7. **Gerenciamento de volumes**
   ```bash
   # Listar volumes
   docker volume ls
   
   # Inspecionar um volume
   docker volume inspect nome_do_volume
   
   # Fazer backup de um volume
   docker run --rm -v nome_do_volume:/volume -v $(pwd):/backup busybox tar czf /backup/backup.tar.gz -C /volume ./
   
   # Restaurar um volume a partir de um backup
   docker run --rm -v nome_do_volume:/volume -v $(pwd):/backup busybox sh -c "rm -rf /volume/* /volume/..?* /volume/.[!.]* ; tar xzf /backup/backup.tar.gz -C /volume"
   ```

## 📝 Notas de Atualização

### Versão 1.0.0 (01/11/2023)
- Versão inicial da documentação de Docker para o PGBen
- Configurações para desenvolvimento e produção
- Estratégia de segurança e conformidade com LGPD
- Scripts de inicialização e gerenciamento

### Próximas Atualizações Previstas
- [ ] Adicionar configuração de CI/CD
- [ ] Incluir monitoramento com Prometheus e Grafana
- [ ] Adicionar testes de carga
- [ ] Documentar procedimentos de recuperação de desastre

## 🤝 Contribuição

Contribuições são bem-vindas! Siga estes passos:

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Adicione suas mudanças (`git add .`)
4. Comite suas mudanças (`git commit -m 'Add some AmazingFeature'`)
5. Faça o Push da Branch (`git push origin feature/AmazingFeature`)
6. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Equipe PGBen**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kemosoft-team/pgben-server)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)

## 📌 Resumo

Esta documentação fornece uma solução completa para conteinerização do PGBen, incluindo:

- 🏗️ Estrutura de arquivos e configurações otimizadas
- 🔒 Práticas de segurança e conformidade com LGPD
- 🚀 Fluxos de desenvolvimento e produção bem definidos
- 🛠️ Ferramentas e scripts para facilitar o desenvolvimento
- 📊 Monitoramento e manutenção simplificados

## 📞 Suporte

Para suporte, abra uma issue no repositório do projeto:
[Issues do PGBen Server](https://github.com/kemosoft-team/pgben-server/issues)

---

📅 **Última Atualização**: Novembro de 2023  
🔗 **Repositório**: [github.com/kemosoft-team/pgben-server](https://github.com/kemosoft-team/pgben-server)

> ℹ️ Documentação mantida pela equipe de desenvolvimento do PGBen.