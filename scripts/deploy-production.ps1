# Script PowerShell para deploy automatizado em produção
# Sistema PGBEN - SEMTAS

param(
    [switch]$SkipSecrets,
    [switch]$SkipSSL,
    [switch]$Force,
    [switch]$WithNginx,
    [string]$Environment = "production",
    [string]$LogLevel = "info"
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Variáveis globais
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$LogFile = Join-Path $ProjectRoot "logs\deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ComposeFiles = @("docker-compose.prod.yml")

if ($WithNginx) {
    $ComposeFiles += "docker-compose.nginx.yml"
}

# Função para logging colorido
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info",
        [switch]$NoLog
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Type] $Message"
    
    switch ($Type) {
        "Info" { Write-Host "[INFO] $Message" -ForegroundColor Blue }
        "Success" { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
        "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
        "Step" { Write-Host "[STEP] $Message" -ForegroundColor Cyan }
    }
    
    if (-not $NoLog) {
        # Criar diretório de logs se não existir
        $logDir = Split-Path $LogFile -Parent
        if (!(Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        Add-Content -Path $LogFile -Value $logEntry
    }
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-ColorOutput "Verificando pré-requisitos..." "Step"
    
    $errors = @()
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker encontrado: $dockerVersion" "Success"
        } else {
            $errors += "Docker não está instalado ou não está no PATH"
        }
    }
    catch {
        $errors += "Erro ao verificar Docker: $($_.Exception.Message)"
    }
    
    # Verificar Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker Compose encontrado: $composeVersion" "Success"
        } else {
            $errors += "Docker Compose não está instalado ou não está no PATH"
        }
    }
    catch {
        $errors += "Erro ao verificar Docker Compose: $($_.Exception.Message)"
    }
    
    # Verificar arquivos de configuração
    foreach ($file in $ComposeFiles) {
        $filePath = Join-Path $ProjectRoot $file
        if (!(Test-Path $filePath)) {
            $errors += "Arquivo de configuração não encontrado: $file"
        } else {
            Write-ColorOutput "Arquivo encontrado: $file" "Success"
        }
    }
    
    if ($errors.Count -gt 0) {
        Write-ColorOutput "Erros encontrados nos pré-requisitos:" "Error"
        foreach ($error in $errors) {
            Write-ColorOutput "  - $error" "Error"
        }
        throw "Pré-requisitos não atendidos"
    }
    
    Write-ColorOutput "Todos os pré-requisitos foram atendidos." "Success"
}

# Função para verificar Docker Swarm
function Test-DockerSwarm {
    Write-ColorOutput "Verificando Docker Swarm..." "Info"
    
    try {
        $swarmInfo = docker info --format "{{.Swarm.LocalNodeState}}" 2>$null
        if ($swarmInfo -eq "active") {
            Write-ColorOutput "Docker Swarm está ativo." "Success"
            return $true
        } else {
            Write-ColorOutput "Docker Swarm não está ativo." "Warning"
            return $false
        }
    }
    catch {
        Write-ColorOutput "Erro ao verificar Docker Swarm: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Função para configurar Docker Secrets
function Initialize-DockerSecrets {
    if ($SkipSecrets) {
        Write-ColorOutput "Configuração de secrets ignorada (--SkipSecrets)." "Warning"
        return
    }
    
    Write-ColorOutput "Configurando Docker Secrets..." "Step"
    
    $secretsScript = Join-Path $PSScriptRoot "setup-docker-secrets.ps1"
    
    if (!(Test-Path $secretsScript)) {
        Write-ColorOutput "Script de secrets não encontrado: $secretsScript" "Error"
        throw "Script de configuração de secrets não encontrado"
    }
    
    try {
        $params = @()
        if ($Force) { $params += "-Force" }
        
        & $secretsScript @params
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker Secrets configurados com sucesso." "Success"
        } else {
            throw "Erro na configuração de Docker Secrets"
        }
    }
    catch {
        Write-ColorOutput "Erro ao configurar Docker Secrets: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para gerar certificados SSL
function Initialize-SslCertificates {
    if ($SkipSSL) {
        Write-ColorOutput "Geração de certificados SSL ignorada (--SkipSSL)." "Warning"
        return
    }
    
    Write-ColorOutput "Gerando certificados SSL..." "Step"
    
    $sslScript = Join-Path $PSScriptRoot "generate-ssl-certs.ps1"
    
    if (!(Test-Path $sslScript)) {
        Write-ColorOutput "Script de SSL não encontrado: $sslScript" "Error"
        throw "Script de geração de certificados SSL não encontrado"
    }
    
    try {
        & $sslScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Certificados SSL gerados com sucesso." "Success"
        } else {
            throw "Erro na geração de certificados SSL"
        }
    }
    catch {
        Write-ColorOutput "Erro ao gerar certificados SSL: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para parar serviços existentes
function Stop-ExistingServices {
    Write-ColorOutput "Parando serviços existentes..." "Step"
    
    try {
        # Tentar parar com docker-compose primeiro
        $composeArgs = @()
        foreach ($file in $ComposeFiles) {
            $composeArgs += "-f"
            $composeArgs += $file
        }
        $composeArgs += "down"
        
        Set-Location $ProjectRoot
        & docker-compose @composeArgs 2>$null
        
        Write-ColorOutput "Serviços parados com sucesso." "Success"
    }
    catch {
        Write-ColorOutput "Aviso: Erro ao parar serviços existentes: $($_.Exception.Message)" "Warning"
    }
}

# Função para construir imagens
function Build-DockerImages {
    Write-ColorOutput "Construindo imagens Docker..." "Step"
    
    try {
        Set-Location $ProjectRoot
        
        $composeArgs = @()
        foreach ($file in $ComposeFiles) {
            $composeArgs += "-f"
            $composeArgs += $file
        }
        $composeArgs += "build"
        $composeArgs += "--no-cache"
        
        & docker-compose @composeArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Imagens construídas com sucesso." "Success"
        } else {
            throw "Erro na construção das imagens"
        }
    }
    catch {
        Write-ColorOutput "Erro ao construir imagens: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para iniciar serviços
function Start-Services {
    Write-ColorOutput "Iniciando serviços..." "Step"
    
    try {
        Set-Location $ProjectRoot
        
        $composeArgs = @()
        foreach ($file in $ComposeFiles) {
            $composeArgs += "-f"
            $composeArgs += $file
        }
        $composeArgs += "up"
        $composeArgs += "-d"
        
        & docker-compose @composeArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Serviços iniciados com sucesso." "Success"
        } else {
            throw "Erro ao iniciar serviços"
        }
    }
    catch {
        Write-ColorOutput "Erro ao iniciar serviços: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para verificar saúde dos serviços
function Test-ServicesHealth {
    Write-ColorOutput "Verificando saúde dos serviços..." "Step"
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        
        try {
            Set-Location $ProjectRoot
            $status = docker-compose ps --format json | ConvertFrom-Json
            
            $unhealthyServices = @()
            foreach ($service in $status) {
                if ($service.State -ne "running") {
                    $unhealthyServices += "$($service.Service) ($($service.State))"
                }
            }
            
            if ($unhealthyServices.Count -eq 0) {
                Write-ColorOutput "Todos os serviços estão saudáveis." "Success"
                return $true
            } else {
                Write-ColorOutput "Tentativa $attempt/$maxAttempts - Serviços não saudáveis: $($unhealthyServices -join ', ')" "Warning"
            }
        }
        catch {
            Write-ColorOutput "Tentativa $attempt/$maxAttempts - Erro ao verificar status: $($_.Exception.Message)" "Warning"
        }
        
        Start-Sleep -Seconds 10
    }
    
    Write-ColorOutput "Timeout na verificação de saúde dos serviços." "Error"
    return $false
}

# Função para exibir status dos serviços
function Show-ServicesStatus {
    Write-ColorOutput "Status dos serviços:" "Info"
    
    try {
        Set-Location $ProjectRoot
        docker-compose ps
        
        Write-ColorOutput "Logs recentes:" "Info"
        docker-compose logs --tail=10
    }
    catch {
        Write-ColorOutput "Erro ao exibir status: $($_.Exception.Message)" "Error"
    }
}

# Função para exibir URLs de acesso
function Show-AccessUrls {
    Write-ColorOutput "URLs de acesso:" "Info"
    
    if ($WithNginx) {
        Write-Host "  🌐 Aplicação Principal: https://pgben.semtas.local"
        Write-Host "  📊 Grafana: https://grafana.pgben.semtas.local"
        Write-Host "  📈 Prometheus: https://prometheus.pgben.semtas.local"
    } else {
        Write-Host "  🌐 Aplicação Principal: http://localhost:3000"
        Write-Host "  📊 Grafana: http://localhost:3001"
        Write-Host "  📈 Prometheus: http://localhost:9090"
        Write-Host "  🗄️  MinIO Console: http://localhost:9001"
    }
    
    Write-Host ""
    Write-ColorOutput "Credenciais padrão:" "Info"
    Write-Host "  📊 Grafana: admin / [senha gerada nos secrets]"
    Write-Host "  🗄️  MinIO: [access_key gerada nos secrets]"
}

# Função para cleanup em caso de erro
function Invoke-Cleanup {
    param([string]$ErrorMessage)
    
    Write-ColorOutput "Executando cleanup devido a erro: $ErrorMessage" "Warning"
    
    try {
        Set-Location $ProjectRoot
        
        $composeArgs = @()
        foreach ($file in $ComposeFiles) {
            $composeArgs += "-f"
            $composeArgs += $file
        }
        $composeArgs += "down"
        
        & docker-compose @composeArgs 2>$null
        Write-ColorOutput "Cleanup executado." "Info"
    }
    catch {
        Write-ColorOutput "Erro durante cleanup: $($_.Exception.Message)" "Error"
    }
}

# Função para exibir instruções finais
function Show-FinalInstructions {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Deploy Concluído com Sucesso!" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    Show-AccessUrls
    
    Write-Host ""
    Write-ColorOutput "Próximos passos:" "Info"
    Write-Host "1. Acesse a aplicação e verifique o funcionamento"
    Write-Host "2. Configure o SMTP em secrets/smtp_password.txt se necessário"
    Write-Host "3. Configure monitoramento e alertas no Grafana"
    Write-Host "4. Implemente backup regular dos dados"
    
    Write-Host ""
    Write-ColorOutput "Comandos úteis:" "Info"
    Write-Host "  📋 Ver logs: docker-compose logs -f [serviço]"
    Write-Host "  🔄 Reiniciar: docker-compose restart [serviço]"
    Write-Host "  ⏹️  Parar: docker-compose down"
    Write-Host "  🔍 Status: docker-compose ps"
    
    Write-Host ""
    Write-ColorOutput "Log completo salvo em: $LogFile" "Info"
}

# Função principal
function Main {
    $startTime = Get-Date
    
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Deploy Automatizado - Produção" -ForegroundColor Cyan
    Write-Host "  Sistema PGBEN - SEMTAS" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorOutput "Iniciando deploy em produção..." "Info"
    Write-ColorOutput "Ambiente: $Environment" "Info"
    Write-ColorOutput "Nginx: $(if($WithNginx) {'Habilitado'} else {'Desabilitado'})" "Info"
    Write-ColorOutput "Log: $LogFile" "Info"
    Write-Host ""
    
    try {
        # Etapa 1: Verificar pré-requisitos
        Test-Prerequisites
        
        # Etapa 2: Verificar/Inicializar Docker Swarm
        if (-not (Test-DockerSwarm)) {
            Write-ColorOutput "Inicializando Docker Swarm..." "Info"
            docker swarm init 2>$null
            if ($LASTEXITCODE -ne 0) {
                throw "Erro ao inicializar Docker Swarm"
            }
        }
        
        # Etapa 3: Configurar Docker Secrets
        Initialize-DockerSecrets
        
        # Etapa 4: Gerar certificados SSL (se necessário)
        if ($WithNginx) {
            Initialize-SslCertificates
        }
        
        # Etapa 5: Parar serviços existentes
        Stop-ExistingServices
        
        # Etapa 6: Construir imagens
        Build-DockerImages
        
        # Etapa 7: Iniciar serviços
        Start-Services
        
        # Etapa 8: Verificar saúde dos serviços
        if (Test-ServicesHealth) {
            Write-ColorOutput "Deploy concluído com sucesso!" "Success"
            
            # Etapa 9: Exibir status e instruções
            Show-ServicesStatus
            Show-FinalInstructions
            
            $endTime = Get-Date
            $duration = $endTime - $startTime
            Write-ColorOutput "Tempo total de deploy: $($duration.ToString('mm\:ss'))" "Info"
            
        } else {
            throw "Falha na verificação de saúde dos serviços"
        }
    }
    catch {
        Write-ColorOutput "Erro durante o deploy: $($_.Exception.Message)" "Error"
        Invoke-Cleanup -ErrorMessage $_.Exception.Message
        exit 1
    }
}

# Executar função principal
Main