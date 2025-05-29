# =============================================================================
# SCRIPT DE CONFIGURAÇÃO DE RESILIÊNCIA - SISTEMA SEMTAS
# =============================================================================
# Este script automatiza a configuração das estratégias de resiliência,
# incluindo cache híbrido, auditoria resiliente e monitoramento.
#
# Uso:
#   .\scripts\setup-resilience.ps1 -Environment dev|prod|test
#   .\scripts\setup-resilience.ps1 -Environment dev -SkipRedis
#   .\scripts\setup-resilience.ps1 -Environment prod -ConfigureMonitoring
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod', 'test')]
    [string]$Environment,
    
    [switch]$SkipRedis,
    [switch]$ConfigureMonitoring,
    [switch]$Force,
    [switch]$Verbose
)

# Configurações
$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Cores para output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $colors = @{
        "Red" = [ConsoleColor]::Red
        "Green" = [ConsoleColor]::Green
        "Yellow" = [ConsoleColor]::Yellow
        "Blue" = [ConsoleColor]::Blue
        "Cyan" = [ConsoleColor]::Cyan
        "White" = [ConsoleColor]::White
    }
    
    Write-Host $Message -ForegroundColor $colors[$Color]
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-ColorOutput "🔍 Verificando pré-requisitos..." "Blue"
    
    # Verificar Node.js
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✅ Node.js encontrado: $nodeVersion" "Green"
    } catch {
        Write-ColorOutput "❌ Node.js não encontrado. Instale Node.js 18+ antes de continuar." "Red"
        exit 1
    }
    
    # Verificar npm/yarn
    try {
        $npmVersion = npm --version
        Write-ColorOutput "✅ npm encontrado: $npmVersion" "Green"
    } catch {
        Write-ColorOutput "❌ npm não encontrado." "Red"
        exit 1
    }
    
    # Verificar se estamos no diretório correto
    if (-not (Test-Path "package.json")) {
        Write-ColorOutput "❌ package.json não encontrado. Execute o script na raiz do projeto." "Red"
        exit 1
    }
    
    Write-ColorOutput "✅ Todos os pré-requisitos atendidos" "Green"
}

# Função para configurar variáveis de ambiente
function Set-EnvironmentVariables {
    param([string]$Env)
    
    Write-ColorOutput "🔧 Configurando variáveis de ambiente para: $Env" "Blue"
    
    $envFile = ".env.$Env"
    $exampleFile = ".env.resilience.example"
    
    if (-not (Test-Path $exampleFile)) {
        Write-ColorOutput "❌ Arquivo $exampleFile não encontrado." "Red"
        exit 1
    }
    
    # Criar arquivo de ambiente se não existir
    if (-not (Test-Path $envFile) -or $Force) {
        Write-ColorOutput "📝 Criando arquivo $envFile..." "Yellow"
        Copy-Item $exampleFile $envFile
        
        # Configurações específicas por ambiente
        switch ($Env) {
            "dev" {
                (Get-Content $envFile) -replace 'RESILIENCE_MODE=production', 'RESILIENCE_MODE=development' |
                Set-Content $envFile
                (Get-Content $envFile) -replace 'CACHE_L1_MAX_SIZE=1000', 'CACHE_L1_MAX_SIZE=100' |
                Set-Content $envFile
                (Get-Content $envFile) -replace 'PRODUCTION_MODE=false', 'PRODUCTION_MODE=false' |
                Set-Content $envFile
            }
            "test" {
                (Get-Content $envFile) -replace 'RESILIENCE_MODE=production', 'RESILIENCE_MODE=test' |
                Set-Content $envFile
                (Get-Content $envFile) -replace 'CACHE_DEFAULT_TTL=3600000', 'CACHE_DEFAULT_TTL=1000' |
                Set-Content $envFile
                (Get-Content $envFile) -replace 'TEST_CLEANUP_ON_EXIT=true', 'TEST_CLEANUP_ON_EXIT=true' |
                Set-Content $envFile
            }
            "prod" {
                (Get-Content $envFile) -replace 'PRODUCTION_MODE=false', 'PRODUCTION_MODE=true' |
                Set-Content $envFile
                (Get-Content $envFile) -replace 'RESILIENCE_LOG_LEVEL=info', 'RESILIENCE_LOG_LEVEL=warn' |
                Set-Content $envFile
            }
        }
        
        Write-ColorOutput "✅ Arquivo $envFile configurado" "Green"
    } else {
        Write-ColorOutput "ℹ️ Arquivo $envFile já existe. Use -Force para sobrescrever." "Yellow"
    }
}

# Função para verificar/instalar dependências
function Install-Dependencies {
    Write-ColorOutput "📦 Verificando dependências..." "Blue"
    
    # Dependências necessárias para resiliência
    $requiredDeps = @(
        "@nestjs/bull",
        "@nestjs/schedule",
        "@nestjs/config",
        "bull",
        "ioredis",
        "node-cron"
    )
    
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $dependencies = $packageJson.dependencies
    $devDependencies = $packageJson.devDependencies
    
    $missingDeps = @()
    
    foreach ($dep in $requiredDeps) {
        if (-not $dependencies.$dep -and -not $devDependencies.$dep) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-ColorOutput "📥 Instalando dependências faltantes: $($missingDeps -join ', ')" "Yellow"
        npm install $missingDeps
        Write-ColorOutput "✅ Dependências instaladas" "Green"
    } else {
        Write-ColorOutput "✅ Todas as dependências estão instaladas" "Green"
    }
}

# Função para configurar Redis (se necessário)
function Set-RedisConfiguration {
    if ($SkipRedis) {
        Write-ColorOutput "⏭️ Configuração do Redis ignorada" "Yellow"
        return
    }
    
    Write-ColorOutput "🔴 Configurando Redis..." "Blue"
    
    # Verificar se Redis está rodando
    try {
        $redisTest = redis-cli ping 2>$null
        if ($redisTest -eq "PONG") {
            Write-ColorOutput "✅ Redis está rodando" "Green"
        }
    } catch {
        Write-ColorOutput "⚠️ Redis não encontrado. Configurando para usar cache em memória apenas." "Yellow"
        
        # Atualizar configuração para desabilitar Redis
        $envFile = ".env.$Environment"
        if (Test-Path $envFile) {
            (Get-Content $envFile) -replace 'CACHE_L2_ENABLED=true', 'CACHE_L2_ENABLED=false' |
            Set-Content $envFile
            (Get-Content $envFile) -replace 'AUDITORIA_QUEUE_ENABLED=true', 'AUDITORIA_QUEUE_ENABLED=false' |
            Set-Content $envFile
        }
    }
}

# Função para criar diretórios necessários
function New-RequiredDirectories {
    Write-ColorOutput "📁 Criando diretórios necessários..." "Blue"
    
    $directories = @(
        "logs",
        "logs/auditoria-backup",
        "backups",
        "temp",
        "uploads"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Verbose "Criado diretório: $dir"
        }
    }
    
    Write-ColorOutput "✅ Diretórios criados" "Green"
}

# Função para configurar monitoramento
function Set-MonitoringConfiguration {
    if (-not $ConfigureMonitoring) {
        Write-ColorOutput "⏭️ Configuração de monitoramento ignorada" "Yellow"
        return
    }
    
    Write-ColorOutput "📊 Configurando monitoramento..." "Blue"
    
    # Verificar se docker-compose.monitoring.yml existe
    if (Test-Path "docker-compose.monitoring.yml") {
        Write-ColorOutput "📋 Arquivo de monitoramento encontrado" "Green"
        
        # Perguntar se deve iniciar serviços de monitoramento
        $response = Read-Host "Deseja iniciar os serviços de monitoramento? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            try {
                docker-compose -f docker-compose.monitoring.yml up -d
                Write-ColorOutput "✅ Serviços de monitoramento iniciados" "Green"
                Write-ColorOutput "📊 Grafana: http://localhost:3001" "Cyan"
                Write-ColorOutput "📈 Prometheus: http://localhost:9090" "Cyan"
            } catch {
                Write-ColorOutput "❌ Erro ao iniciar serviços de monitoramento: $($_.Exception.Message)" "Red"
            }
        }
    } else {
        Write-ColorOutput "⚠️ Arquivo docker-compose.monitoring.yml não encontrado" "Yellow"
    }
}

# Função para executar testes de resiliência
function Invoke-ResilienceTests {
    Write-ColorOutput "🧪 Executando testes de resiliência..." "Blue"
    
    try {
        # Executar testes específicos de resiliência
        npm test -- --testPathPattern="resilience|hybrid-cache|resilient-auditoria" --verbose
        Write-ColorOutput "✅ Testes de resiliência concluídos" "Green"
    } catch {
        Write-ColorOutput "⚠️ Alguns testes falharam. Verifique os logs acima." "Yellow"
    }
}

# Função para validar configuração
function Test-ResilienceConfiguration {
    Write-ColorOutput "🔍 Validando configuração de resiliência..." "Blue"
    
    $envFile = ".env.$Environment"
    
    if (-not (Test-Path $envFile)) {
        Write-ColorOutput "❌ Arquivo de ambiente $envFile não encontrado" "Red"
        return $false
    }
    
    # Verificar configurações críticas
    $content = Get-Content $envFile
    $criticalConfigs = @(
        "RESILIENCE_ENABLED",
        "CACHE_L1_ENABLED",
        "AUDITORIA_QUEUE_ENABLED"
    )
    
    $missingConfigs = @()
    foreach ($config in $criticalConfigs) {
        if (-not ($content | Select-String $config)) {
            $missingConfigs += $config
        }
    }
    
    if ($missingConfigs.Count -gt 0) {
        Write-ColorOutput "❌ Configurações faltantes: $($missingConfigs -join ', ')" "Red"
        return $false
    }
    
    Write-ColorOutput "✅ Configuração validada" "Green"
    return $true
}

# Função para gerar relatório de configuração
function New-ConfigurationReport {
    Write-ColorOutput "📋 Gerando relatório de configuração..." "Blue"
    
    $reportPath = "resilience-setup-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    
    $report = @"
=============================================================================
RELATÓRIO DE CONFIGURAÇÃO DE RESILIÊNCIA - SISTEMA SEMTAS
=============================================================================
Data: $(Get-Date)
Ambiente: $Environment
Usuário: $env:USERNAME
Computador: $env:COMPUTERNAME

CONFIGURAÇÕES APLICADAS:
- Ambiente: $Environment
- Redis: $(if ($SkipRedis) { 'Desabilitado' } else { 'Habilitado' })
- Monitoramento: $(if ($ConfigureMonitoring) { 'Configurado' } else { 'Não configurado' })

ARQUIVOS CRIADOS/MODIFICADOS:
- .env.$Environment
- logs/ (diretório)
- logs/auditoria-backup/ (diretório)
- backups/ (diretório)

PRÓXIMOS PASSOS:
1. Revisar configurações em .env.$Environment
2. Configurar Redis se necessário
3. Executar testes: npm test
4. Iniciar aplicação: npm run start:$Environment
5. Verificar endpoints de monitoramento:
   - GET /api/v1/resilience/status
   - GET /api/v1/resilience/metrics/cache
   - GET /api/v1/resilience/metrics/auditoria

DOCUMENTAÇÃO:
- Estratégia de Resiliência: docs/resilience-strategy.md
- Configurações: .env.resilience.example
- Testes: src/shared/services/*.spec.ts

=============================================================================
"@
    
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-ColorOutput "📄 Relatório salvo em: $reportPath" "Green"
}

# Função principal
function Main {
    Write-ColorOutput "🚀 Iniciando configuração de resiliência para ambiente: $Environment" "Cyan"
    Write-ColorOutput "" "White"
    
    try {
        # 1. Verificar pré-requisitos
        Test-Prerequisites
        
        # 2. Configurar variáveis de ambiente
        Set-EnvironmentVariables -Env $Environment
        
        # 3. Instalar dependências
        Install-Dependencies
        
        # 4. Configurar Redis
        Set-RedisConfiguration
        
        # 5. Criar diretórios
        New-RequiredDirectories
        
        # 6. Configurar monitoramento
        Set-MonitoringConfiguration
        
        # 7. Validar configuração
        $isValid = Test-ResilienceConfiguration
        
        if ($isValid) {
            # 8. Executar testes (opcional)
            if ($Environment -eq "dev" -or $Environment -eq "test") {
                $runTests = Read-Host "Deseja executar testes de resiliência? (y/N)"
                if ($runTests -eq "y" -or $runTests -eq "Y") {
                    Invoke-ResilienceTests
                }
            }
            
            # 9. Gerar relatório
            New-ConfigurationReport
            
            Write-ColorOutput "" "White"
            Write-ColorOutput "🎉 Configuração de resiliência concluída com sucesso!" "Green"
            Write-ColorOutput "" "White"
            Write-ColorOutput "📋 Próximos passos:" "Cyan"
            Write-ColorOutput "   1. Revisar configurações em .env.$Environment" "White"
            Write-ColorOutput "   2. Iniciar aplicação: npm run start:$Environment" "White"
            Write-ColorOutput "   3. Testar endpoints de resiliência" "White"
            Write-ColorOutput "   4. Monitorar logs e métricas" "White"
        } else {
            Write-ColorOutput "❌ Configuração inválida. Verifique os erros acima." "Red"
            exit 1
        }
        
    } catch {
        Write-ColorOutput "❌ Erro durante a configuração: $($_.Exception.Message)" "Red"
        Write-ColorOutput "📋 Stack trace: $($_.ScriptStackTrace)" "Red"
        exit 1
    }
}

# Executar função principal
Main

# =============================================================================
# FIM DO SCRIPT
# =============================================================================