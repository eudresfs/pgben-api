<#
.SYNOPSIS
Script para automatizar a configuração de chaves JWT no Kubernetes

.DESCRIPTION
Este script gera as chaves JWT RSA e configura automaticamente os Secrets do Kubernetes,
eliminando a necessidade de passos manuais para configuração em ambiente Kubernetes.

.PARAMETER Namespace
Namespace do Kubernetes onde o Secret será criado (padrão: default)

.PARAMETER SecretName
Nome do Secret que será criado (padrão: pgben-jwt-secrets)

.PARAMETER KeySize
Tamanho da chave RSA em bits (padrão: 2048)

.PARAMETER Force
Força a recriação do Secret se já existir

.EXAMPLE
.\setup-jwt-k8s.ps1
Configura com valores padrão

.EXAMPLE
.\setup-jwt-k8s.ps1 -Namespace "pgben-prod" -KeySize 4096 -Force
Configura no namespace pgben-prod com chave de 4096 bits, forçando recriação

.NOTES
Autor: Sistema SEMTAS - PGBEN
Versão: 1.0.0
Requer: kubectl, Node.js
#>

param(
    [string]$Namespace = "default",
    [string]$SecretName = "pgben-jwt-secrets",
    [ValidateSet("2048", "3072", "4096")]
    [string]$KeySize = "2048",
    [switch]$Force
)

# Configurações
$ErrorActionPreference = "Stop"
$TempDir = Join-Path $env:TEMP "jwt-keys-$(Get-Random)"

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
    
    # Verificar kubectl
    try {
        $null = Get-Command kubectl -ErrorAction Stop
    }
    catch {
        Write-LogError "kubectl não encontrado. Instale o kubectl primeiro."
        exit 1
    }
    
    # Verificar Node.js
    try {
        $null = Get-Command node -ErrorAction Stop
    }
    catch {
        Write-LogError "Node.js não encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    # Verificar conexão com cluster Kubernetes
    try {
        $null = kubectl cluster-info 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Falha na conexão"
        }
    }
    catch {
        Write-LogError "Não foi possível conectar ao cluster Kubernetes."
        exit 1
    }
    
    Write-LogSuccess "Todas as dependências estão disponíveis"
}

# Função para verificar se o namespace existe
function Test-Namespace {
    Write-LogInfo "Verificando namespace '$Namespace'..."
    
    $namespaceExists = kubectl get namespace $Namespace 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-LogWarning "Namespace '$Namespace' não existe. Criando..."
        kubectl create namespace $Namespace
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Namespace '$Namespace' criado"
        } else {
            Write-LogError "Falha ao criar namespace '$Namespace'"
            exit 1
        }
    } else {
        Write-LogSuccess "Namespace '$Namespace' existe"
    }
}

# Função para verificar se o Secret já existe
function Test-ExistingSecret {
    $secretExists = kubectl get secret $SecretName -n $Namespace 2>$null
    if ($LASTEXITCODE -eq 0) {
        if ($Force) {
            Write-LogWarning "Secret '$SecretName' já existe. Removendo devido ao -Force..."
            kubectl delete secret $SecretName -n $Namespace
            if ($LASTEXITCODE -eq 0) {
                Write-LogSuccess "Secret removido"
            } else {
                Write-LogError "Falha ao remover Secret existente"
                exit 1
            }
        } else {
            Write-LogWarning "Secret '$SecretName' já existe no namespace '$Namespace'"
            $response = Read-Host "Deseja sobrescrever? (y/N)"
            if ($response -match '^[Yy]$') {
                kubectl delete secret $SecretName -n $Namespace
                if ($LASTEXITCODE -eq 0) {
                    Write-LogSuccess "Secret removido"
                } else {
                    Write-LogError "Falha ao remover Secret existente"
                    exit 1
                }
            } else {
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
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Push-Location $projectRoot
    
    try {
        # Executar o script de geração com output em base64
        $keysOutput = node scripts/gerar-chaves-jwt.js --output-format=base64 --key-size=$KeySize
        
        # Salvar output em arquivo temporário para análise
        $outputFile = Join-Path $TempDir "keys_output.txt"
        $keysOutput | Out-File -FilePath $outputFile -Encoding UTF8
        
        # Extrair as chaves base64 do output
        $content = Get-Content $outputFile -Raw
        
        # Usar regex para extrair as chaves base64
        if ($content -match 'private\.key:\s*([A-Za-z0-9+/=]+)') {
            $script:PrivateKeyB64 = $matches[1]
        } else {
            throw "Não foi possível extrair a chave privada do output"
        }
        
        if ($content -match 'public\.key:\s*([A-Za-z0-9+/=]+)') {
            $script:PublicKeyB64 = $matches[1]
        } else {
            throw "Não foi possível extrair a chave pública do output"
        }
        
        if ([string]::IsNullOrEmpty($script:PrivateKeyB64) -or [string]::IsNullOrEmpty($script:PublicKeyB64)) {
            throw "Falha ao extrair chaves do output"
        }
        
        Write-LogSuccess "Chaves JWT geradas com sucesso"
    }
    catch {
        Write-LogError "Falha ao gerar chaves JWT: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Função para criar o Secret do Kubernetes
function New-K8sSecret {
    Write-LogInfo "Criando Secret '$SecretName' no namespace '$Namespace'..."
    
    try {
        # Criar o Secret com as chaves
        kubectl create secret generic $SecretName `
            --from-literal=jwt-private-key=$script:PrivateKeyB64 `
            --from-literal=jwt-public-key=$script:PublicKeyB64 `
            --namespace=$Namespace
        
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao criar Secret"
        }
        
        # Adicionar labels para identificação
        kubectl label secret $SecretName `
            app=pgben-server `
            component=jwt-keys `
            managed-by=setup-script `
            --namespace=$Namespace
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Secret '$SecretName' criado com sucesso"
        } else {
            Write-LogWarning "Secret criado, mas falha ao adicionar labels"
        }
    }
    catch {
        Write-LogError "Falha ao criar Secret: $($_.Exception.Message)"
        exit 1
    }
}

# Função para validar o Secret criado
function Test-Secret {
    Write-LogInfo "Validando Secret criado..."
    
    try {
        # Verificar se o Secret existe e tem as chaves
        $privateKeyCheck = kubectl get secret $SecretName -n $Namespace -o jsonpath='{.data.jwt-private-key}' 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($privateKeyCheck)) {
            throw "Chave privada não encontrada no Secret"
        }
        
        $publicKeyCheck = kubectl get secret $SecretName -n $Namespace -o jsonpath='{.data.jwt-public-key}' 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($publicKeyCheck)) {
            throw "Chave pública não encontrada no Secret"
        }
        
        Write-LogSuccess "Secret validado com sucesso"
    }
    catch {
        Write-LogError "Falha na validação do Secret: $($_.Exception.Message)"
        exit 1
    }
}

# Função para exibir instruções de configuração
function Show-ConfigurationInstructions {
    Write-LogInfo "Configuração concluída! Instruções para uso:"
    
    Write-Host ""
    Write-Host "📝 CONFIGURAÇÃO DO DEPLOYMENT:" -ForegroundColor Cyan
    Write-Host "Adicione as seguintes variáveis de ambiente ao seu deployment.yaml:" -ForegroundColor White
    Write-Host ""
    Write-Host "        - name: JWT_PRIVATE_KEY" -ForegroundColor Gray
    Write-Host "          valueFrom:" -ForegroundColor Gray
    Write-Host "            secretKeyRef:" -ForegroundColor Gray
    Write-Host "              name: $SecretName" -ForegroundColor Gray
    Write-Host "              key: jwt-private-key" -ForegroundColor Gray
    Write-Host "        - name: JWT_PUBLIC_KEY" -ForegroundColor Gray
    Write-Host "          valueFrom:" -ForegroundColor Gray
    Write-Host "            secretKeyRef:" -ForegroundColor Gray
    Write-Host "              name: $SecretName" -ForegroundColor Gray
    Write-Host "              key: jwt-public-key" -ForegroundColor Gray
    Write-Host "        - name: JWT_ALGORITHM" -ForegroundColor Gray
    Write-Host "          value: `"RS256`"" -ForegroundColor Gray
    Write-Host "        - name: JWT_ACCESS_TOKEN_EXPIRES_IN" -ForegroundColor Gray
    Write-Host "          value: `"1h`"" -ForegroundColor Gray
    Write-Host "        - name: JWT_REFRESH_TOKEN_EXPIRES_IN" -ForegroundColor Gray
    Write-Host "          value: `"7d`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔍 VERIFICAR SECRET:" -ForegroundColor Cyan
    Write-Host "kubectl get secret $SecretName -n $Namespace -o yaml" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🗑️  REMOVER SECRET (se necessário):" -ForegroundColor Cyan
    Write-Host "kubectl delete secret $SecretName -n $Namespace" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "- As chaves são geradas automaticamente a cada execução" -ForegroundColor White
    Write-Host "- Mantenha backup das chaves se necessário" -ForegroundColor White
    Write-Host "- Considere rotação periódica das chaves" -ForegroundColor White
    Write-Host "- Use RBAC para controlar acesso ao Secret" -ForegroundColor White
}

# Função principal
function Main {
    Write-Host "🔐 Configuração Automática de JWT para Kubernetes" -ForegroundColor Magenta
    Write-Host "=================================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        Test-Dependencies
        Test-Namespace
        Test-ExistingSecret
        New-JwtKeys
        New-K8sSecret
        Test-Secret
        Show-ConfigurationInstructions
        
        Write-Host ""
        Write-LogSuccess "Configuração automática concluída com sucesso!"
    }
    catch {
        Write-LogError "Erro durante a execução: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Cleanup
    }
}

# Executar função principal
Main