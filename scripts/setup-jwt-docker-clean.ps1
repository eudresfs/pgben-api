<#
.SYNOPSIS
Script de configuracao automatica de JWT para Docker

.DESCRIPTION
Configura automaticamente as chaves JWT para uso com Docker

.PARAMETER OutputFormat
Formato de saida: files, env, compose

.PARAMETER KeySize
Tamanho da chave RSA: 2048, 3072, 4096

.PARAMETER Force
Forca regeneracao das chaves

.PARAMETER EnvFile
Caminho do arquivo .env
#>

param(
    [ValidateSet("files", "env", "compose")]
    [string]$OutputFormat = "compose",
    [ValidateSet("2048", "3072", "4096")]
    [string]$KeySize = "2048",
    [switch]$Force,
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ScriptsDir = $PSScriptRoot
$KeysDir = Join-Path $ProjectRoot "keys"
$TempDir = Join-Path $env:TEMP "pgben-jwt-setup"

# Criar diretorio temporario
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Cleanup {
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Cleanup ao sair
trap { Cleanup }

function Test-Dependencies {
    Write-LogInfo "Verificando dependencias..."
    
    # Verificar Node.js
    try {
        $nodeVersion = node --version
        Write-LogInfo "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js nao encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    # Verificar script de geracao
    $scriptPath = Join-Path $ScriptsDir "gerar-chaves-jwt.js"
    if (-not (Test-Path $scriptPath)) {
        Write-LogError "Script gerar-chaves-jwt.js nao encontrado em: $scriptPath"
        exit 1
    }
    
    Write-LogSuccess "Todas as dependencias estao disponiveis"
}

function Test-ExistingKeys {
    if ($OutputFormat -eq "files") {
        $privateKeyPath = Join-Path $KeysDir "private.key"
        $publicKeyPath = Join-Path $KeysDir "public.key"
        $privateKeyPemPath = Join-Path $KeysDir "private.pem"
        $publicKeyPemPath = Join-Path $KeysDir "public.pem"
        
        $keyFilesExist = (Test-Path $privateKeyPath) -or (Test-Path $publicKeyPath)
        $pemFilesExist = (Test-Path $privateKeyPemPath) -or (Test-Path $publicKeyPemPath)
        
        if ($keyFilesExist -or $pemFilesExist) {
            if ($Force) {
                Write-LogWarning "Forcando regeneracao das chaves existentes..."
            } else {
                Write-LogWarning "Chaves JWT ja existem:"
                if (Test-Path $privateKeyPath) { Write-Host "   $privateKeyPath" }
                if (Test-Path $publicKeyPath) { Write-Host "   $publicKeyPath" }
                if (Test-Path $privateKeyPemPath) { Write-Host "   $privateKeyPemPath" }
                if (Test-Path $publicKeyPemPath) { Write-Host "   $publicKeyPemPath" }
                
                $response = Read-Host "Deseja sobrescrever? (y/N)"
                if ($response -notmatch '^[Yy]$') {
                    Write-LogInfo "Operacao cancelada pelo usuario"
                    exit 0
                }
            }
        }
    }
}

function New-JwtKeys {
    Write-LogInfo "Gerando chaves JWT..."
    
    $outputPath = Join-Path $TempDir "jwt-output.txt"
    
    Push-Location $ProjectRoot
    try {
        $args = @("scripts/gerar-chaves-jwt.js")
        
        switch ($OutputFormat) {
            "files" {
                $args += "--output-format=files"
            }
            "env" {
                $args += "--output-format=env"
                $args += "--env-file=$EnvFile"
            }
            "compose" {
                $args += "--output-format=env"
                $args += "--env-file=$EnvFile"
            }
        }
        
        $args += "--key-size=$KeySize"
        if ($Force) {
            $args += "--force"
        }
        
        $script:Output = & node @args 2>&1
        
        Write-LogSuccess "Chaves JWT geradas com sucesso"
    }
    catch {
        Write-LogError "Erro ao gerar chaves JWT: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Pop-Location
    }
}

function Get-EnvVariables {
    param([string[]]$Output)
    
    $envVars = @{}
    
    foreach ($line in $Output) {
        # Procurar por linhas que contenham variáveis de ambiente JWT
        if ($line -match "^(JWT_[A-Z_]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            $envVars[$key] = $value
            Write-LogInfo "Encontrada variável: $key"
        }
    }
    
    return $envVars
}

function Update-EnvFile {
    param(
        [hashtable]$EnvVars,
        [string]$FilePath
    )
    
    $envFilePath = Join-Path $ProjectRoot $FilePath
    
    if (Test-Path $envFilePath) {
        $backupPath = "$envFilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $envFilePath $backupPath
        Write-LogInfo "Backup criado: $backupPath"
    }
    
    $existingContent = @()
    if (Test-Path $envFilePath) {
        $existingContent = Get-Content $envFilePath
    }
    
    # Remover linhas JWT existentes
    $filteredContent = $existingContent | Where-Object {
        $_ -notmatch '^JWT_'
    }
    
    # Adicionar novas configuracoes JWT
    $newContent = @()
    $newContent += $filteredContent
    $newContent += ""
    $newContent += "# JWT Configuration - Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    foreach ($key in $EnvVars.Keys | Sort-Object) {
        $value = $EnvVars[$key]
        $newContent += "$key=$value"
    }
    
    $newContent | Out-File -FilePath $envFilePath -Encoding UTF8
    Write-LogSuccess "Arquivo $FilePath atualizado com configuracoes JWT"
}

function New-DockerComposeOverride {
    param([hashtable]$EnvVars)
    
    $overridePath = Join-Path $ProjectRoot "docker-compose.override.yml"
    
    if (Test-Path $overridePath) {
        $backupPath = "$overridePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $overridePath $backupPath
        Write-LogInfo "Backup do override criado: $backupPath"
    }
    
    $overrideContent = @(
        "version: '3.8'",
        "",
        "services:",
        "  app:",
        "    environment:"
    )
    
    foreach ($key in $EnvVars.Keys | Sort-Object) {
        $value = $EnvVars[$key]
        $overrideContent += "      - $key=$value"
    }
    
    $overrideContent | Out-File -FilePath $overridePath -Encoding UTF8
    Write-LogSuccess "Arquivo docker-compose.override.yml criado"
}

function Show-Instructions {
    param([string]$OutputFormat)
    
    Write-LogInfo "Configuracao concluida! Instrucoes para uso:"
    
    Write-Host ""
    
    switch ($OutputFormat) {
        "files" {
            Write-Host "ARQUIVOS DE CHAVES:" -ForegroundColor Cyan
            Write-Host "As chaves foram salvas no diretorio keys/:" -ForegroundColor White
            Write-Host "- keys/private.key (chave privada)" -ForegroundColor Gray
            Write-Host "- keys/public.key (chave publica)" -ForegroundColor Gray
            Write-Host "- keys/private.pem (chave privada PEM)" -ForegroundColor Gray
            Write-Host "- keys/public.pem (chave publica PEM)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "CONFIGURACAO .ENV:" -ForegroundColor Cyan
            Write-Host "Adicione ao seu .env:" -ForegroundColor White
            Write-Host "JWT_ALGORITHM=RS256" -ForegroundColor Gray
            Write-Host "JWT_PRIVATE_KEY_PATH=keys/private.key" -ForegroundColor Gray
            Write-Host "JWT_PUBLIC_KEY_PATH=keys/public.key" -ForegroundColor Gray
            Write-Host "JWT_ACCESS_TOKEN_EXPIRES_IN=1h" -ForegroundColor Gray
            Write-Host "JWT_REFRESH_TOKEN_EXPIRES_IN=7d" -ForegroundColor Gray
        }
        "env" {
            Write-Host "ARQUIVO .ENV ATUALIZADO:" -ForegroundColor Cyan
            Write-Host "O arquivo $EnvFile foi atualizado com as configuracoes JWT" -ForegroundColor White
            Write-Host "Um backup foi criado automaticamente" -ForegroundColor Gray
        }
        "compose" {
            Write-Host "DOCKER COMPOSE CONFIGURADO:" -ForegroundColor Cyan
            Write-Host "Arquivos criados/atualizados:" -ForegroundColor White
            Write-Host "- $EnvFile (variaveis de ambiente)" -ForegroundColor Gray
            Write-Host "- docker-compose.override.yml (configuracao especifica)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Para usar:" -ForegroundColor White
            Write-Host "docker-compose up -d" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "- Mantenha as chaves privadas seguras" -ForegroundColor White
    Write-Host "- Nao commite chaves no Git (ja adicionado ao .gitignore)" -ForegroundColor White
    Write-Host "- Considere rotacao periodica das chaves" -ForegroundColor White
    Write-Host "- Use volumes para persistir chaves em producao" -ForegroundColor White
}

# Funcao principal
function Main {
    Write-Host "Configuracao Automatica de JWT para Docker" -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        Test-Dependencies
        Test-ExistingKeys
        New-JwtKeys
        
        if ($OutputFormat -in @("env", "compose")) {
            $envVars = Get-EnvVariables -Output $script:Output
            if ($envVars.Count -eq 0) {
                Write-LogError "Nao foi possivel extrair variaveis de ambiente"
                exit 1
            }
            
            Update-EnvFile -EnvVars $envVars -FilePath $EnvFile
            
            if ($OutputFormat -eq "compose") {
                New-DockerComposeOverride -EnvVars $envVars
            }
        }
        
        Show-Instructions -OutputFormat $OutputFormat
        
        Write-Host ""
        Write-LogSuccess "Configuracao automatica concluida com sucesso!"
    }
    catch {
        Write-LogError "Erro durante a execucao: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Cleanup
    }
}

# Executar funcao principal
Main