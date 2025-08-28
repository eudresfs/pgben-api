# =====================================================
# SCRIPT DE CONFIGURAÇÃO DOS FILTROS AVANÇADOS
# =====================================================
# Arquivo: setup-filtros-avancados.ps1
# Descrição: Script PowerShell para configurar o ambiente completo
#            dos filtros avançados do PGBEN
# Data: 2024-01-20
# Versão: 1.0
# =====================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipRedis,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDatabase,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# =====================================================
# CONFIGURAÇÕES GLOBAIS
# =====================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Cores para output
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"
$ColorInfo = "Cyan"

# Caminhos
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DatabasePath = Join-Path $ProjectRoot "database"
$ConfigPath = Join-Path $ProjectRoot "config"
$RedisConfigPath = Join-Path $ConfigPath "redis"

# =====================================================
# FUNÇÕES AUXILIARES
# =====================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "[STEP] $Message" $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" $ColorSuccess
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" $ColorWarning
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" $ColorError
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Wait-ForService {
    param(
        [string]$ServiceName,
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )
    
    Write-Step "Aguardando $ServiceName na porta $Port..."
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    
    do {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                Write-Success "$ServiceName está respondendo na porta $Port"
                return $true
            }
        }
        catch {
            # Ignorar erros de conexão
        }
        
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $timeout)
    
    Write-Warning "Timeout aguardando $ServiceName na porta $Port"
    return $false
}

# =====================================================
# VERIFICAÇÕES INICIAIS
# =====================================================

function Test-Prerequisites {
    Write-Step "Verificando pré-requisitos..."
    
    $missing = @()
    
    # Node.js
    if (-not (Test-Command "node")) {
        $missing += "Node.js"
    }
    
    # npm
    if (-not (Test-Command "npm")) {
        $missing += "npm"
    }
    
    # PostgreSQL (psql)
    if (-not (Test-Command "psql")) {
        $missing += "PostgreSQL (psql)"
    }
    
    # Redis (se não for pular)
    if (-not $SkipRedis -and -not (Test-Command "redis-server")) {
        $missing += "Redis"
    }
    
    if ($missing.Count -gt 0) {
        Write-Error "Pré-requisitos faltando: $($missing -join ', ')"
        Write-ColorOutput "Instale os componentes faltando e execute novamente." $ColorWarning
        exit 1
    }
    
    Write-Success "Todos os pré-requisitos estão instalados"
}

# =====================================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# =====================================================

function Setup-Database {
    if ($SkipDatabase) {
        Write-Warning "Pulando configuração do banco de dados"
        return
    }
    
    Write-Step "Configurando banco de dados..."
    
    # Verificar se o PostgreSQL está rodando
    if (-not (Wait-ForService "PostgreSQL" 5432 10)) {
        Write-Error "PostgreSQL não está rodando. Inicie o serviço e tente novamente."
        return
    }
    
    # Executar migrations
    $migrationFiles = @(
        "001-create-filtros-avancados-indexes.sql",
        "002-cache-performance-optimization.sql"
    )
    
    foreach ($file in $migrationFiles) {
        $migrationPath = Join-Path $DatabasePath "migrations" $file
        
        if (Test-Path $migrationPath) {
            Write-Step "Executando migration: $file"
            
            try {
                # Assumindo que as variáveis de ambiente estão configuradas
                $env:PGPASSWORD = $env:DB_PASSWORD
                psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USERNAME -d $env:DB_DATABASE -f $migrationPath
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Migration $file executada com sucesso"
                } else {
                    Write-Error "Erro ao executar migration $file"
                }
            }
            catch {
                Write-Error "Erro ao executar migration $file: $($_.Exception.Message)"
            }
        } else {
            Write-Warning "Migration não encontrada: $migrationPath"
        }
    }
}

# =====================================================
# CONFIGURAÇÃO DO REDIS
# =====================================================

function Setup-Redis {
    if ($SkipRedis) {
        Write-Warning "Pulando configuração do Redis"
        return
    }
    
    Write-Step "Configurando Redis..."
    
    $redisConfig = Join-Path $RedisConfigPath "redis-filtros-avancados.conf"
    
    if (-not (Test-Path $redisConfig)) {
        Write-Error "Arquivo de configuração do Redis não encontrado: $redisConfig"
        return
    }
    
    # Verificar se Redis está rodando
    $redisRunning = Wait-ForService "Redis" 6379 5
    
    if (-not $redisRunning) {
        Write-Step "Iniciando Redis com configuração personalizada..."
        
        try {
            # Iniciar Redis em background
            Start-Process -FilePath "redis-server" -ArgumentList $redisConfig -WindowStyle Hidden
            
            if (Wait-ForService "Redis" 6379 15) {
                Write-Success "Redis iniciado com sucesso"
            } else {
                Write-Error "Falha ao iniciar Redis"
            }
        }
        catch {
            Write-Error "Erro ao iniciar Redis: $($_.Exception.Message)"
        }
    } else {
        Write-Success "Redis já está rodando"
    }
}

# =====================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# =====================================================

function Install-Dependencies {
    Write-Step "Instalando dependências do Node.js..."
    
    Push-Location $ProjectRoot
    
    try {
        # Verificar se package.json existe
        if (-not (Test-Path "package.json")) {
            Write-Error "package.json não encontrado no diretório raiz"
            return
        }
        
        # Instalar dependências
        Write-Step "Executando npm install..."
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependências instaladas com sucesso"
        } else {
            Write-Error "Erro ao instalar dependências"
        }
        
        # Verificar dependências específicas do cache
        $cachePackages = @("redis", "ioredis", "cache-manager")
        
        foreach ($package in $cachePackages) {
            Write-Step "Verificando pacote: $package"
            $packageInfo = npm list $package --depth=0 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Pacote $package está instalado"
            } else {
                Write-Warning "Pacote $package não encontrado - pode ser necessário instalar"
            }
        }
    }
    finally {
        Pop-Location
    }
}

# =====================================================
# EXECUÇÃO DE TESTES
# =====================================================

function Run-Tests {
    if ($SkipTests) {
        Write-Warning "Pulando execução de testes"
        return
    }
    
    Write-Step "Executando testes dos filtros avançados..."
    
    Push-Location $ProjectRoot
    
    try {
        # Executar testes específicos dos filtros avançados
        Write-Step "Executando testes unitários..."
        npm test -- --testPathPattern="filtros-avancados" --verbose
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Testes executados com sucesso"
        } else {
            Write-Warning "Alguns testes falharam - verifique os logs"
        }
    }
    catch {
        Write-Error "Erro ao executar testes: $($_.Exception.Message)"
    }
    finally {
        Pop-Location
    }
}

# =====================================================
# VALIDAÇÃO DA CONFIGURAÇÃO
# =====================================================

function Test-Configuration {
    Write-Step "Validando configuração..."
    
    $issues = @()
    
    # Verificar variáveis de ambiente
    $requiredEnvVars = @(
        "DB_HOST", "DB_PORT", "DB_USERNAME", "DB_PASSWORD", "DB_DATABASE"
    )
    
    foreach ($var in $requiredEnvVars) {
        if (-not (Get-ChildItem Env: | Where-Object Name -eq $var)) {
            $issues += "Variável de ambiente faltando: $var"
        }
    }
    
    # Verificar arquivos de configuração
    $configFiles = @(
        (Join-Path $RedisConfigPath "redis-filtros-avancados.conf"),
        (Join-Path $ProjectRoot "package.json")
    )
    
    foreach ($file in $configFiles) {
        if (-not (Test-Path $file)) {
            $issues += "Arquivo de configuração faltando: $file"
        }
    }
    
    if ($issues.Count -gt 0) {
        Write-Error "Problemas de configuração encontrados:"
        foreach ($issue in $issues) {
            Write-ColorOutput "  - $issue" $ColorError
        }
        return $false
    }
    
    Write-Success "Configuração validada com sucesso"
    return $true
}

# =====================================================
# FUNÇÃO PRINCIPAL
# =====================================================

function Main {
    Write-ColorOutput "" 
    Write-ColorOutput "=====================================================" $ColorInfo
    Write-ColorOutput "    SETUP FILTROS AVANÇADOS - PGBEN" $ColorInfo
    Write-ColorOutput "    Ambiente: $Environment" $ColorInfo
    Write-ColorOutput "=====================================================" $ColorInfo
    Write-ColorOutput ""
    
    try {
        # Verificar pré-requisitos
        Test-Prerequisites
        
        # Validar configuração
        if (-not (Test-Configuration)) {
            Write-Error "Configuração inválida. Corrija os problemas e tente novamente."
            exit 1
        }
        
        # Instalar dependências
        Install-Dependencies
        
        # Configurar banco de dados
        Setup-Database
        
        # Configurar Redis
        Setup-Redis
        
        # Executar testes
        Run-Tests
        
        Write-ColorOutput "" 
        Write-ColorOutput "=====================================================" $ColorSuccess
        Write-ColorOutput "    SETUP CONCLUÍDO COM SUCESSO!" $ColorSuccess
        Write-ColorOutput "=====================================================" $ColorSuccess
        Write-ColorOutput ""
        
        Write-ColorOutput "Próximos passos:" $ColorInfo
        Write-ColorOutput "1. Verifique os logs para possíveis warnings" $ColorInfo
        Write-ColorOutput "2. Execute 'npm run start:dev' para iniciar o servidor" $ColorInfo
        Write-ColorOutput "3. Teste os endpoints de filtros avançados" $ColorInfo
        Write-ColorOutput "4. Monitore as métricas de cache e performance" $ColorInfo
        
    }
    catch {
        Write-Error "Erro durante o setup: $($_.Exception.Message)"
        Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" $ColorError
        exit 1
    }
}

# =====================================================
# EXECUÇÃO
# =====================================================

if ($MyInvocation.InvocationName -ne '.') {
    Main
}

# =====================================================
# FIM DO SCRIPT
# =====================================================