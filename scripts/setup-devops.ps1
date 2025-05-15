# Script de configuração do ambiente DevOps para o PGBen
# Autor: Especialista DevOps
# Data: 14/05/2025

Write-Host "Iniciando configuração do ambiente DevOps para o PGBen..." -ForegroundColor Green

# Verificar se o Docker está instalado
try {
    docker --version
    Write-Host "Docker já está instalado." -ForegroundColor Green
} catch {
    Write-Host "Docker não encontrado. Por favor, instale o Docker Desktop antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar se o Docker Compose está instalado
try {
    docker-compose --version
    Write-Host "Docker Compose já está instalado." -ForegroundColor Green
} catch {
    Write-Host "Docker Compose não encontrado. Por favor, instale o Docker Compose antes de continuar." -ForegroundColor Red
    exit 1
}

# Criar rede Docker se não existir
docker network inspect semtas_network > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Criando rede Docker 'semtas_network'..." -ForegroundColor Yellow
    docker network create semtas_network
} else {
    Write-Host "Rede Docker 'semtas_network' já existe." -ForegroundColor Green
}

# Iniciar serviços básicos
Write-Host "Iniciando serviços básicos (PostgreSQL, Redis, MinIO)..." -ForegroundColor Yellow
docker-compose up -d postgres redis minio createbuckets mailhog

# Aguardar inicialização dos serviços
Write-Host "Aguardando inicialização dos serviços..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Iniciar serviços de monitoramento
Write-Host "Iniciando serviços de monitoramento..." -ForegroundColor Yellow
docker-compose -f docker-compose.monitoring.yml up -d

# Verificar status dos serviços
Write-Host "Verificando status dos serviços..." -ForegroundColor Yellow
docker-compose ps
docker-compose -f docker-compose.monitoring.yml ps

# Informações de acesso
Write-Host "`nAmbiente DevOps configurado com sucesso!" -ForegroundColor Green
Write-Host "`nInformações de acesso:" -ForegroundColor Cyan
Write-Host "- PostgreSQL: localhost:5432 (usuário: postgres, senha: postgres)" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host "- MinIO: http://localhost:9000 (console: http://localhost:9001) (usuário: minioadmin, senha: minioadmin)" -ForegroundColor White
Write-Host "- MailHog: http://localhost:8025" -ForegroundColor White
Write-Host "- Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "- Grafana: http://localhost:3001 (usuário: admin, senha: admin)" -ForegroundColor White
Write-Host "- Elasticsearch: http://localhost:9200" -ForegroundColor White
Write-Host "- Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "- Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "- Alertmanager: http://localhost:9093" -ForegroundColor White

Write-Host "`nPara iniciar a aplicação em modo de desenvolvimento, execute:" -ForegroundColor Yellow
Write-Host "yarn start:dev" -ForegroundColor White

Write-Host "`nPara parar todos os serviços, execute:" -ForegroundColor Yellow
Write-Host "docker-compose down" -ForegroundColor White
Write-Host "docker-compose -f docker-compose.monitoring.yml down" -ForegroundColor White
