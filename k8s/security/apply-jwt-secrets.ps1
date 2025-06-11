#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script para aplicar os secrets JWT no cluster Kubernetes

.DESCRIPTION
    Este script aplica os secrets JWT configurados no arquivo jwt-secrets.yaml
    e no arquivo secrets.yaml principal no cluster Kubernetes.

.PARAMETER Namespace
    Namespace onde os secrets serão aplicados (padrão: consigmais)

.PARAMETER DryRun
    Executa em modo dry-run para validar os manifests sem aplicar

.EXAMPLE
    .\apply-jwt-secrets.ps1
    .\apply-jwt-secrets.ps1 -Namespace "production" -DryRun
#>

param(
    [string]$Namespace = "consigmais",
    [switch]$DryRun
)

# Configurações
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$JwtSecretsFile = Join-Path $ScriptDir "jwt-secrets.yaml"
$MainSecretsFile = Join-Path $ScriptDir "secrets.yaml"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(if($Level -eq "ERROR") {"Red"} elseif($Level -eq "WARN") {"Yellow"} else {"Green"})
}

# Verificar se kubectl está disponível
try {
    kubectl version --client --short | Out-Null
    Write-Log "kubectl encontrado e funcional"
} catch {
    Write-Log "kubectl não encontrado ou não funcional. Instale o kubectl primeiro." "ERROR"
    exit 1
}

# Verificar se os arquivos existem
if (-not (Test-Path $JwtSecretsFile)) {
    Write-Log "Arquivo jwt-secrets.yaml não encontrado: $JwtSecretsFile" "ERROR"
    exit 1
}

if (-not (Test-Path $MainSecretsFile)) {
    Write-Log "Arquivo secrets.yaml não encontrado: $MainSecretsFile" "ERROR"
    exit 1
}

# Verificar se o namespace existe
try {
    kubectl get namespace $Namespace | Out-Null
    Write-Log "Namespace '$Namespace' encontrado"
} catch {
    Write-Log "Namespace '$Namespace' não encontrado. Criando..." "WARN"
    if ($DryRun) {
        Write-Log "[DRY-RUN] kubectl create namespace $Namespace"
    } else {
        kubectl create namespace $Namespace
        Write-Log "Namespace '$Namespace' criado com sucesso"
    }
}

# Aplicar os secrets
Write-Log "Aplicando secrets JWT..."

if ($DryRun) {
    Write-Log "[DRY-RUN] Validando jwt-secrets.yaml..."
    kubectl apply -f $JwtSecretsFile --dry-run=client --validate=true
    
    Write-Log "[DRY-RUN] Validando secrets.yaml..."
    kubectl apply -f $MainSecretsFile --dry-run=client --validate=true
    
    Write-Log "[DRY-RUN] Validação concluída com sucesso!"
} else {
    try {
        # Aplicar jwt-secrets.yaml
        Write-Log "Aplicando $JwtSecretsFile..."
        kubectl apply -f $JwtSecretsFile
        
        # Aplicar secrets.yaml principal (apenas o secret JWT será atualizado)
        Write-Log "Aplicando $MainSecretsFile..."
        kubectl apply -f $MainSecretsFile
        
        Write-Log "Secrets aplicados com sucesso!"
        
        # Verificar se os secrets foram criados
        Write-Log "Verificando secrets criados..."
        kubectl get secrets -n $Namespace | Where-Object { $_ -match "pgben-jwt-secrets" }
        
        Write-Log "Configuração de secrets JWT concluída com sucesso!" "INFO"
        
    } catch {
        Write-Log "Erro ao aplicar secrets: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

Write-Log "Script concluído!"