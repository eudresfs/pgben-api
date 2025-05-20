# Script para iniciar apenas o Redis
# Útil quando você precisa apenas do serviço Redis sem subir todo o ambiente

# Configurar codificação para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "Verificando status do Redis..." -ForegroundColor Cyan

# Verificar se o Docker está em execução
$dockerRunning = $false
try {
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "Docker está em execução" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "Docker não está em execução. Por favor, inicie o Docker Desktop antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar se o contêiner do Redis está rodando
$redisRunning = $false
try {
    $redisStatus = docker ps --filter "name=pgben_redis" --format "{{.Names}}" 2>&1
    if ($redisStatus -eq "pgben_redis") {
        $redisRunning = $true
        Write-Host "O contêiner Redis já está em execução" -ForegroundColor Green
    }
} catch {
    $redisRunning = $false
}

if (-not $redisRunning) {
    Write-Host "Iniciando contêiner Redis..." -ForegroundColor Yellow
    docker-compose up -d redis

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha ao iniciar o contêiner Redis. Verifique o erro acima." -ForegroundColor Red
        exit 1
    }

    Write-Host "Contêiner Redis iniciado com sucesso" -ForegroundColor Green
} else {
    Write-Host "Redis já está em execução" -ForegroundColor Green
}

# Verificar a conectividade do Redis
Write-Host "Testando conectividade com Redis..." -ForegroundColor Cyan

try {
    $pingResult = docker exec pgben_redis redis-cli ping 2>&1
    if ($pingResult -eq "PONG") {
        Write-Host "Conexão com Redis testada com sucesso (PONG)" -ForegroundColor Green
    } else {
        Write-Host "Conexão com Redis falhou. Resposta inesperada: $pingResult" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Não foi possível testar a conexão com Redis: $_" -ForegroundColor Red
}

# Exibir informações de conexão
Write-Host "`nInformações de conexão do Redis:" -ForegroundColor Magenta
Write-Host "Host: localhost ou 127.0.0.1" -ForegroundColor White
Write-Host "Porta: 6379" -ForegroundColor White
Write-Host "Senha: <nenhuma>" -ForegroundColor White

Write-Host "`nVariáveis de ambiente para configuração:" -ForegroundColor Magenta
Write-Host "REDIS_HOST=localhost" -ForegroundColor White
Write-Host "REDIS_PORT=6379" -ForegroundColor White
Write-Host "REDIS_PASSWORD=" -ForegroundColor White

Write-Host "`nPara desabilitar o Redis (modo desenvolvimento sem fila):" -ForegroundColor Magenta
Write-Host "DISABLE_REDIS=true" -ForegroundColor White

Write-Host "`nPara parar o contêiner Redis, execute:" -ForegroundColor Yellow
Write-Host "docker-compose stop redis" -ForegroundColor Gray
