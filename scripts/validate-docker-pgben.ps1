# Script de validação do ambiente Docker para PGBen

Write-Host "⚙️ Validando configurações Docker para PGBen..." -ForegroundColor Cyan

# 1. Verificar Docker e Docker Compose
Write-Host "📋 Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version
    docker-compose --version
} catch {
    Write-Host "❌ Docker ou Docker Compose não estão instalados ou acessíveis!" -ForegroundColor Red
    exit 1
}

# 2. Verificar e baixar imagens base
Write-Host "📋 Verificando e baixando imagens Docker necessárias..." -ForegroundColor Yellow
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
    } else {
        Write-Host "✅ Imagem $image baixada com sucesso!" -ForegroundColor Green
    }
}

# 3. Verificar espaço em disco
Write-Host "📋 Verificando espaço em disco..." -ForegroundColor Yellow
Get-PSDrive -PSProvider FileSystem | Format-Table -AutoSize

# 4. Backup de dados (se existentes e se os contêineres estiverem rodando)
Write-Host "📋 Verificando contêineres em execução para possível backup..." -ForegroundColor Yellow
$postgresRunning = docker ps | Select-String -Pattern "pgben_postgres" -Quiet
if ($postgresRunning) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Write-Host "🔄 Realizando backup do PostgreSQL..." -ForegroundColor Cyan
    docker exec pgben_postgres pg_dump -U postgres pgben > "backup_pgben_$timestamp.sql"
    Write-Host "✅ Backup realizado com sucesso em backup_pgben_$timestamp.sql!" -ForegroundColor Green
}

# 5. Verificar arquivo .env (se existir)
Write-Host "📋 Verificando arquivo .env..." -ForegroundColor Yellow
if (Test-Path -Path ".env") {
    Write-Host "✅ Arquivo .env encontrado!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Arquivo .env não encontrado. Serão usados valores padrão!" -ForegroundColor Yellow
}

# 6. Verificar volumes existentes
Write-Host "📋 Verificando volumes Docker..." -ForegroundColor Yellow
docker volume ls | Select-String -Pattern "pgben"

# 7. Verificar redes
Write-Host "📋 Verificando rede pgben_network..." -ForegroundColor Yellow
$networkExists = docker network ls | Select-String -Pattern "pgben_network" -Quiet
if (-not $networkExists) {
    Write-Host "🔄 Criando rede pgben_network..." -ForegroundColor Cyan
    docker network create pgben_network
    Write-Host "✅ Rede criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✅ Rede pgben_network já existe!" -ForegroundColor Green
}

# 8. Verificar portas em uso
Write-Host "📋 Verificando portas necessárias..." -ForegroundColor Yellow
$ports = @(3000, 5432, 6379, 9000, 9001, 1025, 8025)
foreach ($port in $ports) {
    $inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($inUse) {
        Write-Host "⚠️ Porta $port já está em uso!" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Porta $port está disponível!" -ForegroundColor Green
    }
}

Write-Host "`n✅ Validação concluída! Pronto para executar o ambiente Docker." -ForegroundColor Green
Write-Host "Para iniciar o ambiente completo, execute:" -ForegroundColor Cyan
Write-Host "docker-compose up -d" -ForegroundColor White
Write-Host "`nPara iniciar apenas serviços específicos, execute:" -ForegroundColor Cyan
Write-Host "docker-compose up -d postgres redis minio" -ForegroundColor White
