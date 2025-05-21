# Script de configuração completa do ambiente Docker para PGBen
# Este script automatiza o processo de configuração do ambiente Docker
# para o sistema PGBen, garantindo que todas as dependências estejam
# corretamente configuradas e disponíveis.

# Definir codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Iniciando configuração do ambiente Docker para PGBen..." -ForegroundColor Cyan

# 1. Verificar Docker e Docker Compose
Write-Host "`n📋 Verificando Docker e Docker Compose..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    $composeVersion = docker-compose --version
    Write-Host "✅ $dockerVersion" -ForegroundColor Green
    Write-Host "✅ $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker ou Docker Compose não estão instalados ou acessíveis!" -ForegroundColor Red
    exit 1
}

# 2. Remover todos os contêineres e volumes existentes (opcional, com confirmação)
$removerAntigos = Read-Host "🔄 Deseja remover contêineres e volumes existentes? (s/N)"
if ($removerAntigos -eq "s" -or $removerAntigos -eq "S") {
    Write-Host "`n🧹 Removendo contêineres existentes..." -ForegroundColor Yellow
    docker-compose down -v
    
    # Verificar se há dados importantes para backup antes de remover volumes
    $fazerBackup = Read-Host "📦 Deseja fazer backup dos dados antes de remover volumes? (S/n)"
    if ($fazerBackup -ne "n" -and $fazerBackup -ne "N") {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupDir = "backups_$timestamp"
        
        # Criar diretório de backup
        if (-not (Test-Path $backupDir)) {
            New-Item -Path $backupDir -ItemType Directory | Out-Null
        }
        
        Write-Host "📂 Realizando backups em $backupDir..." -ForegroundColor Cyan
        
        # Tentar fazer backup do PostgreSQL se estiver rodando
        try {
            Write-Host "🔄 Tentando backup do PostgreSQL..." -ForegroundColor Yellow
            docker-compose exec -T postgres pg_dump -U postgres pgben > "$backupDir/pgben_db_$timestamp.sql"
            Write-Host "✅ Backup do PostgreSQL realizado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Não foi possível fazer backup do PostgreSQL. Contêiner pode não estar em execução." -ForegroundColor Yellow
        }
    }
    
    # Remover volumes
    Write-Host "🗑️ Removendo volumes..." -ForegroundColor Yellow
    docker volume rm pgben_postgres_data pgben_redis_data pgben_minio_data 2>$null
    Write-Host "✅ Volumes removidos!" -ForegroundColor Green
}

# 3. Baixar imagens necessárias
Write-Host "`n📥 Baixando imagens Docker necessárias..." -ForegroundColor Yellow
$requiredImages = @(
    "postgres:14-alpine",
    "redis:alpine",
    "minio/minio",
    "minio/mc",
    "mailhog/mailhog"
)

foreach ($image in $requiredImages) {
    Write-Host "🔄 Baixando $image..." -ForegroundColor Cyan
    docker pull $image
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Erro ao baixar $image. Verifique sua conexão com a internet." -ForegroundColor Red
        Write-Host "⚠️ Tentando continuar com o resto do setup..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Imagem $image baixada com sucesso!" -ForegroundColor Green
    }
}

# 4. Verificar rede Docker
Write-Host "`n🔄 Verificando rede Docker..." -ForegroundColor Yellow
$networkExists = docker network ls | Select-String -Pattern "pgben_network" -Quiet
if (-not $networkExists) {
    Write-Host "🔄 Criando rede pgben_network..." -ForegroundColor Cyan
    docker network create pgben_network
    Write-Host "✅ Rede criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✅ Rede pgben_network já existe!" -ForegroundColor Green
}

# 5. Verificar arquivo .env
Write-Host "`n📋 Verificando arquivo .env..." -ForegroundColor Yellow
if (Test-Path -Path ".env") {
    Write-Host "✅ Arquivo .env encontrado!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Arquivo .env não encontrado. Serão usados valores padrão!" -ForegroundColor Yellow
    
    $criarEnv = Read-Host "🔄 Deseja criar um arquivo .env com configurações básicas? (S/n)"
    if ($criarEnv -ne "n" -and $criarEnv -ne "N") {
        # Criar arquivo .env básico
        Write-Host "🔄 Criando arquivo .env básico..." -ForegroundColor Cyan
        $envContent = @"
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=pgben
DB_POOL_SIZE=10
DB_SSL=false

# Configurações JWT
JWT_SECRET=chave_secreta_jwt_desenvolvimento_apenas
JWT_REFRESH_SECRET=chave_secreta_refresh_desenvolvimento_apenas
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Configurações de Email
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=user
EMAIL_PASSWORD=password
EMAIL_FROM=noreply@semtas.gov.br

# Configurações MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=documents

# Configurações da Aplicação
APP_PORT=3000
API_PREFIX=/api
NODE_ENV=development
APP_NAME=pgben
FRONTEND_URL=http://localhost:4200

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configurações de Serviços
DISABLE_REDIS=false
ENABLE_SWAGGER=true

# Configurações de Segurança
DEFAULT_ADMIN_USER_PASSWORD=PGBen@2025
"@
        $envContent | Out-File -FilePath ".env" -Encoding utf8
        Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
    }
}

# 6. Verificar Dockerfile
Write-Host "`n📋 Verificando Dockerfile..." -ForegroundColor Yellow
if (Test-Path -Path "Dockerfile") {
    Write-Host "✅ Dockerfile encontrado!" -ForegroundColor Green
} else {
    Write-Host "❌ Dockerfile não encontrado! O build da aplicação pode falhar." -ForegroundColor Red
    exit 1
}

# 7. Verificar se o arquivo docker-entrypoint.sh está com permissões de execução
Write-Host "`n📋 Verificando docker-entrypoint.sh..." -ForegroundColor Yellow
if (Test-Path -Path "docker-entrypoint.sh") {
    Write-Host "✅ docker-entrypoint.sh encontrado!" -ForegroundColor Green
    # No Windows não é possível verificar as permissões de execução diretamente
    Write-Host "⚠️ Não é possível verificar permissões de execução no Windows. O Docker irá lidar com isso durante o build." -ForegroundColor Yellow
} else {
    Write-Host "❌ docker-entrypoint.sh não encontrado! A aplicação não iniciará corretamente." -ForegroundColor Red
    exit 1
}

# 8. Construir e iniciar os serviços
Write-Host "`n🏗️ Pronto para construir e iniciar os serviços..." -ForegroundColor Cyan
$iniciarServicos = Read-Host "🔄 Deseja construir e iniciar os serviços agora? (S/n)"
if ($iniciarServicos -ne "n" -and $iniciarServicos -ne "N") {
    # Construir imagens
    Write-Host "`n🏗️ Construindo imagens Docker..." -ForegroundColor Yellow
    docker-compose build --no-cache
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha na construção das imagens!" -ForegroundColor Red
        exit 1
    }
    
    # Iniciar serviços
    Write-Host "`n🚀 Iniciando serviços..." -ForegroundColor Yellow
    
    # Iniciar primeiro apenas os serviços de infraestrutura
    Write-Host "🔄 Iniciando serviços de infraestrutura (postgres, redis, minio)..." -ForegroundColor Cyan
    docker-compose up -d postgres redis minio
    
    # Aguardar que os serviços estejam prontos
    Write-Host "⏳ Aguardando serviços estarem prontos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Iniciar o resto dos serviços
    Write-Host "🔄 Iniciando serviços restantes..." -ForegroundColor Cyan
    docker-compose up -d
    
    # Verificar status dos serviços
    Write-Host "`n📊 Status dos serviços:" -ForegroundColor Yellow
    docker-compose ps
    
    # Exibir instruções para verificar logs
    Write-Host "`n📋 Para verificar logs da aplicação, execute:" -ForegroundColor Cyan
    Write-Host "docker-compose logs -f api" -ForegroundColor White
    
    # Exibir URL da aplicação
    Write-Host "`n🌐 Aplicação disponível em:" -ForegroundColor Cyan
    Write-Host "http://localhost:3000/api/v1" -ForegroundColor White
    
    # Exibir URL do Swagger (se habilitado)
    Write-Host "`n📚 Documentação Swagger disponível em:" -ForegroundColor Cyan
    Write-Host "http://localhost:3000/api/v1/docs" -ForegroundColor White
    
    # Exibir URL do MinIO Console
    Write-Host "`n💾 Console do MinIO disponível em:" -ForegroundColor Cyan
    Write-Host "http://localhost:9001" -ForegroundColor White
    Write-Host "   Usuário: minioadmin" -ForegroundColor White
    Write-Host "   Senha: minioadmin" -ForegroundColor White
    
    # Exibir URL do MailHog
    Write-Host "`n📧 Interface do MailHog disponível em:" -ForegroundColor Cyan
    Write-Host "http://localhost:8025" -ForegroundColor White
}

Write-Host "`n✅ Configuração do ambiente Docker para PGBen concluída!" -ForegroundColor Green
Write-Host "🛠️ Para gerenciar os serviços, use os comandos docker-compose:" -ForegroundColor Cyan
Write-Host "   - Iniciar: docker-compose up -d" -ForegroundColor White
Write-Host "   - Parar: docker-compose down" -ForegroundColor White
Write-Host "   - Logs: docker-compose logs -f [serviço]" -ForegroundColor White
Write-Host "   - Status: docker-compose ps" -ForegroundColor White
