<#
.SYNOPSIS
Script para automatizar a configuração de chaves JWT no Docker/Docker Compose

.DESCRIPTION
Este script gera as chaves JWT RSA e configura automaticamente as variáveis de ambiente
para uso com Docker e Docker Compose, eliminando a necessidade de configuração manual.

.PARAMETER OutputFormat
Formato de saída das chaves (files, env, compose) (padrão: files)

.PARAMETER KeySize
Tamanho da chave RSA em bits (padrão: 2048)

.PARAMETER EnvFile
Caminho para o arquivo .env (padrão: .env)

.PARAMETER Force
Força a regeneração das chaves se já existirem

.EXAMPLE
.\setup-jwt-docker.ps1
Configura com valores padrão, salvando chaves em arquivos

.EXAMPLE
.\setup-jwt-docker.ps1 -OutputFormat env -EnvFile .env.production
Gera chaves e adiciona ao arquivo .env.production

.EXAMPLE
.\setup-jwt-docker.ps1 -OutputFormat compose -KeySize 4096 -Force
Gera chaves de 4096 bits para Docker Compose, forçando regeneração

.NOTES
Autor: Sistema SEMTAS - PGBEN
Versão: 1.0.0
Requer: Node.js
#>

param(
    [ValidateSet("files", "env", "compose")]
    [string]$OutputFormat = "files",
    [ValidateSet("2048", "3072", "4096")]
    [string]$KeySize = "2048",
    [string]$EnvFile = ".env",
    [switch]$Force
)

# Configurações
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$KeysDir = Join-Path $ProjectRoot "keys"
$TempDir = Join-Path $env:TEMP "jwt-keys-docker-$(Get-Random)"

# Função para logging colorido
function Write-LogInfo {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Função para limpeza
function Cleanup {
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-LogInfo "Diretório temporário removido"
    }
}

# Configurar limpeza automática
trap { Cleanup }

# Função para verificar dependências
function Test-Dependencies {
    Write-LogInfo "Verificando dependências..."
    
    # Verificar Node.js
    try {
        $null = Get-Command node -ErrorAction Stop
        $nodeVersion = node --version
        Write-LogInfo "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js não encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    # Verificar se estamos no diretório correto do projeto
    $scriptPath = Join-Path $ProjectRoot "scripts\gerar-chaves-jwt.js"
    if (-not (Test-Path $scriptPath)) {
        Write-LogError "Script gerar-chaves-jwt.js não encontrado em: $scriptPath"
        Write-LogError "Execute este script a partir do diretório raiz do projeto."
        exit 1
    }
    
    Write-LogSuccess "Todas as dependências estão disponíveis"
}

# Função para verificar chaves existentes
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
                Write-LogWarning "Chaves existentes serão sobrescritas devido ao -Force"
                return
            }
            
            Write-LogWarning "Chaves JWT já existem:"
            if (Test-Path $privateKeyPath) { Write-Host "   $privateKeyPath" }
            if (Test-Path $publicKeyPath) { Write-Host "   $publicKeyPath" }
            if (Test-Path $privateKeyPemPath) { Write-Host "   $privateKeyPemPath" }
            if (Test-Path $publicKeyPemPath) { Write-Host "   $publicKeyPemPath" }
            
            $response = Read-Host "Deseja sobrescrever? (y/N)"
            if ($response -notmatch '^[Yy]$') {
                Write-LogInfo "Operação cancelada"
                exit 0
            }
        }
    }
}

# Função para gerar chaves JWT
function New-JwtKeys {
    Write-LogInfo "Gerando chaves JWT RSA de $KeySize bits..."
    
    # Criar diretório temporário
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    # Navegar para o diretório do projeto
    Push-Location $ProjectRoot
    
    try {
        # Executar o script de geração
        switch ($OutputFormat) {
            "files" {
                $output = node scripts/gerar-chaves-jwt.js --output-format=files --key-size=$KeySize
                Write-LogSuccess "Chaves salvas em arquivos no diretório keys/"
            }
            "env" {
                $output = node scripts/gerar-chaves-jwt.js --output-format=env --key-size=$KeySize
                $script:EnvOutput = $output
                Write-LogSuccess "Chaves geradas em formato de variáveis de ambiente"
            }
            "compose" {
                $output = node scripts/gerar-chaves-jwt.js --output-format=env --key-size=$KeySize
                $script:EnvOutput = $output
                Write-LogSuccess "Chaves geradas para Docker Compose"
            }
        }
        
        # Salvar output completo para referência
        $outputFile = Join-Path $TempDir "generation_output.txt"
        $output | Out-File -FilePath $outputFile -Encoding UTF8
        
    }
    catch {
        Write-LogError "Falha ao gerar chaves JWT: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Função para processar output de variáveis de ambiente
function Get-EnvVariables {
    param([string[]]$Output)
    
    $envVars = @{}
    $inEnvSection = $false
    
    foreach ($line in $Output) {
        if ($line -match "VARIÁVEIS DE AMBIENTE:") {
            $inEnvSection = $true
            continue
        }
        
        if ($inEnvSection -and $line -match "^([A-Z_]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            # Remover aspas se existirem
            $value = $value -replace '^"(.*)"$', '$1'
            $envVars[$key] = $value
        }
        
        if ($inEnvSection -and $line -match "IMPORTANTE:") {
            break
        }
    }
    
    return $envVars
}

# Função para atualizar arquivo .env
function Update-EnvFile {
    param([hashtable]$EnvVars)
    
    $envFilePath = Join-Path $ProjectRoot $EnvFile
    Write-LogInfo "Atualizando arquivo $EnvFile..."
    
    # Backup do arquivo existente
    if (Test-Path $envFilePath) {
        $backupPath = "$envFilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $envFilePath $backupPath
        Write-LogInfo "Backup criado: $backupPath"
    }
    
    # Ler conteúdo existente
    $existingContent = @()
    if (Test-Path $envFilePath) {
        $existingContent = Get-Content $envFilePath
    }
    
    # Remover linhas JWT existentes
    $filteredContent = $existingContent | Where-Object {
        $_ -notmatch '^JWT_' -and $_ -notmatch '^# JWT'
    }
    
    # Adicionar seção JWT
    $jwtSection = @(
        "",
        "# JWT Configuration - Generated automatically",
        "# Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    )
    
    foreach ($key in $EnvVars.Keys | Sort-Object) {
        $value = $EnvVars[$key]
        $jwtSection += "$key=$value"
    }
    
    # Combinar conteúdo
    $newContent = $filteredContent + $jwtSection
    
    # Salvar arquivo
    $newContent | Out-File -FilePath $envFilePath -Encoding UTF8
    
    Write-LogSuccess "Arquivo $EnvFile atualizado com configurações JWT"
}

# Função para criar arquivo docker-compose.override.yml
function New-DockerComposeOverride {
    param([hashtable]$EnvVars)
    
    $overridePath = Join-Path $ProjectRoot "docker-compose.override.yml"
    Write-LogInfo "Criando docker-compose.override.yml..."
    
    # Backup se existir
    if (Test-Path $overridePath) {
        $backupPath = "$overridePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $overridePath $backupPath
        Write-LogInfo "Backup criado: $backupPath"
    }
    
    # Criar conteúdo do override
    $overrideContent = @(
        "# Docker Compose Override - JWT Configuration",
        "# Generated automatically on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "version: '3.8'",
        "",
        "services:",
        "  pgben-server:",
        "    environment:"
    )
    
    foreach ($key in $EnvVars.Keys | Sort-Object) {
        $value = $EnvVars[$key]
        # Escapar aspas duplas no valor
        $value = $value -replace '"', '\"'
        $overrideContent += "      $key: `"$value`""
    }
    
    # Salvar arquivo
    $overrideContent | Out-File -FilePath $overridePath -Encoding UTF8
    
    Write-LogSuccess "Arquivo docker-compose.override.yml criado"
}

# Função para exibir instruções
function Show-Instructions {
    Write-LogInfo "Configuração concluída! Instruções para uso:"
    
    Write-Host ""
    
    switch ($OutputFormat) {
        "files" {
            Write-Host "ARQUIVOS DE CHAVES:" -ForegroundColor Cyan
            Write-Host "As chaves foram salvas no diretório keys/:" -ForegroundColor White
            Write-Host "- keys/private.key (chave privada)" -ForegroundColor Gray
            Write-Host "- keys/public.key (chave pública)" -ForegroundColor Gray
            Write-Host "- keys/private.pem (chave privada PEM)" -ForegroundColor Gray
            Write-Host "- keys/public.pem (chave pública PEM)" -ForegroundColor Gray
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
            Write-Host "O arquivo $EnvFile foi atualizado com as configurações JWT" -ForegroundColor White
            Write-Host "Um backup foi criado automaticamente" -ForegroundColor Gray
        }
        "compose" {
            Write-Host "DOCKER COMPOSE CONFIGURADO:" -ForegroundColor Cyan
            Write-Host "Arquivos criados/atualizados:" -ForegroundColor White
            Write-Host "- $EnvFile (variáveis de ambiente)" -ForegroundColor Gray
            Write-Host "- docker-compose.override.yml (configuração específica)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Para usar:" -ForegroundColor White
            Write-Host "docker-compose up -d" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "- Mantenha as chaves privadas seguras" -ForegroundColor White
    Write-Host "- Não commite chaves no Git (já adicionado ao .gitignore)" -ForegroundColor White
    Write-Host "- Considere rotação periódica das chaves" -ForegroundColor White
    Write-Host "- Use volumes para persistir chaves em produção" -ForegroundColor White
}

# Função principal
function Main {
    Write-Host "Configuracao Automatica de JWT para Docker" -ForegroundColor Magenta
    Write-Host "============================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        Test-Dependencies
        Test-ExistingKeys
        New-JwtKeys
        
        if ($OutputFormat -in @("env", "compose")) {
            $envVars = Get-EnvVariables -Output $script:EnvOutput
            
            if ($envVars.Count -eq 0) {
                Write-LogError "Não foi possível extrair variáveis de ambiente do output"
                exit 1
            }
            
            Update-EnvFile -EnvVars $envVars
            
            if ($OutputFormat -eq "compose") {
                New-DockerComposeOverride -EnvVars $envVars
            }
        }
        
        Show-Instructions
        
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

# Executar função principal
Main