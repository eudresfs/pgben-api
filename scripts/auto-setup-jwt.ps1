<#
.SYNOPSIS
Script de inicialização automática para configuração completa de JWT

.DESCRIPTION
Este script detecta automaticamente o ambiente (desenvolvimento, Docker, Kubernetes)
e configura as chaves JWT adequadamente para cada contexto, eliminando completamente
a necessidade de configuração manual.

.PARAMETER Environment
Ambiente alvo (auto, dev, docker, k8s) (padrão: auto)

.PARAMETER KeySize
Tamanho da chave RSA em bits (padrão: 2048)

.PARAMETER Force
Força a regeneração das chaves se já existirem

.PARAMETER Namespace
Namespace do Kubernetes (padrão: default)

.PARAMETER SecretName
Nome do secret no Kubernetes (padrão: pgben-jwt-secrets)

.EXAMPLE
.\auto-setup-jwt.ps1
Detecta automaticamente o ambiente e configura

.EXAMPLE
.\auto-setup-jwt.ps1 -Environment k8s -Namespace production
Configura especificamente para Kubernetes no namespace production

.EXAMPLE
.\auto-setup-jwt.ps1 -Environment docker -Force
Configura para Docker forçando regeneração

.NOTES
Autor: Sistema SEMTAS - PGBEN
Versão: 1.0.0
Requer: Node.js, kubectl (para K8s)
#>

param(
    [ValidateSet("auto", "dev", "docker", "k8s")]
    [string]$Environment = "auto",
    [ValidateSet("2048", "3072", "4096")]
    [string]$KeySize = "2048",
    [switch]$Force,
    [string]$Namespace = "default",
    [string]$SecretName = "pgben-jwt-secrets"
)

# Configurações
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ScriptsDir = $PSScriptRoot

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

# Função para detectar ambiente automaticamente
function Get-TargetEnvironment {
    if ($Environment -ne "auto") {
        return $Environment
    }
    
    Write-LogInfo "Detectando ambiente automaticamente..."
    
    # Verificar se kubectl está disponível e configurado
    try {
        $null = Get-Command kubectl -ErrorAction Stop
        $kubectlContext = kubectl config current-context 2>$null
        if ($kubectlContext) {
            Write-LogInfo "Kubernetes detectado (contexto: $kubectlContext)"
            return "k8s"
        }
    }
    catch {
        # kubectl não disponível
    }
    
    # Verificar se docker-compose.yml existe
    $dockerComposePath = Join-Path $ProjectRoot "docker-compose.yml"
    if (Test-Path $dockerComposePath) {
        Write-LogInfo "Docker Compose detectado"
        return "docker"
    }
    
    # Verificar se Dockerfile existe
    $dockerfilePath = Join-Path $ProjectRoot "Dockerfile"
    if (Test-Path $dockerfilePath) {
        Write-LogInfo "Dockerfile detectado"
        return "docker"
    }
    
    # Padrão para desenvolvimento
    Write-LogInfo "Ambiente de desenvolvimento detectado"
    return "dev"
}

# Função para verificar dependências por ambiente
function Test-EnvironmentDependencies {
    param([string]$TargetEnv)
    
    Write-LogInfo "Verificando dependências para ambiente: $TargetEnv"
    
    # Node.js é sempre necessário
    try {
        $null = Get-Command node -ErrorAction Stop
        $nodeVersion = node --version
        Write-LogInfo "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js não encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    # Verificar kubectl para Kubernetes
    if ($TargetEnv -eq "k8s") {
        try {
            $null = Get-Command kubectl -ErrorAction Stop
            $kubectlVersion = kubectl version --client --short 2>$null
            Write-LogInfo "kubectl encontrado: $kubectlVersion"
            
            # Verificar conectividade com cluster
            $clusterInfo = kubectl cluster-info 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-LogSuccess "Conectado ao cluster Kubernetes"
            }
            else {
                Write-LogWarning "kubectl encontrado mas não conectado a um cluster"
                Write-LogWarning "Verifique sua configuração do Kubernetes"
            }
        }
        catch {
            Write-LogError "kubectl não encontrado. Instale o kubectl para usar com Kubernetes."
            exit 1
        }
    }
    
    # Verificar scripts necessários
    $requiredScripts = @(
        "gerar-chaves-jwt.js"
    )
    
    if ($TargetEnv -eq "k8s") {
        $requiredScripts += "setup-jwt-k8s.ps1"
    }
    elseif ($TargetEnv -eq "docker") {
        $requiredScripts += "setup-jwt-docker.ps1"
    }
    
    foreach ($script in $requiredScripts) {
        $scriptPath = Join-Path $ScriptsDir $script
        if (-not (Test-Path $scriptPath)) {
            Write-LogError "Script necessário não encontrado: $scriptPath"
            exit 1
        }
    }
    
    Write-LogSuccess "Todas as dependências estão disponíveis"
}

# Função para configurar desenvolvimento
function Set-DevelopmentEnvironment {
    Write-LogInfo "Configurando ambiente de desenvolvimento..."
    
    Push-Location $ProjectRoot
    try {
        $args = @(
            "scripts/gerar-chaves-jwt.js",
            "--output-format=files",
            "--key-size=$KeySize"
        )
        
        if ($Force) {
            $args += "--force"
        }
        
        $output = & node @args
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Chaves JWT configuradas para desenvolvimento"
            
            # Verificar se .env existe e sugerir configuração
            $envPath = Join-Path $ProjectRoot ".env"
            if (-not (Test-Path $envPath)) {
                Write-LogWarning "Arquivo .env não encontrado"
                Write-LogInfo "Criando .env com configurações JWT..."
                
                $envContent = @(
                    "# JWT Configuration",
                    "JWT_ALGORITHM=RS256",
                    "JWT_PRIVATE_KEY_PATH=keys/private.key",
                    "JWT_PUBLIC_KEY_PATH=keys/public.key",
                    "JWT_ACCESS_TOKEN_EXPIRES_IN=1h",
                    "JWT_REFRESH_TOKEN_EXPIRES_IN=7d"
                )
                
                $envContent | Out-File -FilePath $envPath -Encoding UTF8
                Write-LogSuccess "Arquivo .env criado com configurações JWT"
            }
            else {
                Write-LogInfo "Verifique se o .env contém as configurações JWT necessárias"
            }
        }
        else {
            Write-LogError "Falha ao configurar chaves para desenvolvimento"
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Função para configurar Docker
function Set-DockerEnvironment {
    Write-LogInfo "Configurando ambiente Docker..."
    
    $dockerScript = Join-Path $ScriptsDir "setup-jwt-docker.ps1"
    
    $args = @(
        "-OutputFormat", "compose",
        "-KeySize", $KeySize
    )
    
    if ($Force) {
        $args += "-Force"
    }
    
    try {
        & $dockerScript @args
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Ambiente Docker configurado com sucesso"
        }
        else {
            Write-LogError "Falha ao configurar ambiente Docker"
            exit 1
        }
    }
    catch {
        Write-LogError "Erro ao executar script Docker: $($_.Exception.Message)"
        exit 1
    }
}

# Função para configurar Kubernetes
function Set-KubernetesEnvironment {
    Write-LogInfo "Configurando ambiente Kubernetes..."
    
    $k8sScript = Join-Path $ScriptsDir "setup-jwt-k8s.ps1"
    
    $args = @(
        "-Namespace", $Namespace,
        "-SecretName", $SecretName,
        "-KeySize", $KeySize
    )
    
    if ($Force) {
        $args += "-Force"
    }
    
    try {
        & $k8sScript @args
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Ambiente Kubernetes configurado com sucesso"
        }
        else {
            Write-LogError "Falha ao configurar ambiente Kubernetes"
            exit 1
        }
    }
    catch {
        Write-LogError "Erro ao executar script Kubernetes: $($_.Exception.Message)"
        exit 1
    }
}

# Função para exibir resumo da configuração
function Show-ConfigurationSummary {
    param([string]$TargetEnv)
    
    Write-Host ""
    Write-Host "📋 RESUMO DA CONFIGURAÇÃO" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host "Ambiente: $TargetEnv" -ForegroundColor White
    Write-Host "Tamanho da chave: $KeySize bits" -ForegroundColor White
    Write-Host "Força regeneração: $Force" -ForegroundColor White
    
    if ($TargetEnv -eq "k8s") {
        Write-Host "Namespace: $Namespace" -ForegroundColor White
        Write-Host "Secret: $SecretName" -ForegroundColor White
    }
    
    Write-Host ""
    
    switch ($TargetEnv) {
        "dev" {
            Write-Host "🔧 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'npm run dev' para iniciar o servidor" -ForegroundColor White
            Write-Host "2. As chaves estão em keys/ e configuradas no .env" -ForegroundColor White
        }
        "docker" {
            Write-Host "🐳 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'docker-compose up -d' para iniciar" -ForegroundColor White
            Write-Host "2. As configurações estão no docker-compose.override.yml" -ForegroundColor White
        }
        "k8s" {
            Write-Host "☸️  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'kubectl apply -f k8s/' para deploy" -ForegroundColor White
            Write-Host "2. O secret $SecretName foi criado no namespace $Namespace" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "⚠️  LEMBRETE DE SEGURANÇA:" -ForegroundColor Red
    Write-Host "- Mantenha as chaves privadas seguras" -ForegroundColor White
    Write-Host "- Não commite chaves no controle de versão" -ForegroundColor White
    Write-Host "- Considere rotação periódica das chaves" -ForegroundColor White
    Write-Host "- Use secrets/volumes apropriados em produção" -ForegroundColor White
}

# Função principal
function Main {
    Write-Host "🚀 Configuração Automática Completa de JWT" -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        # Detectar ambiente
        $targetEnv = Get-TargetEnvironment
        Write-Host "✅ Ambiente detectado: $targetEnv" -ForegroundColor Green
        
        # Verificar dependências
        Test-EnvironmentDependencies -TargetEnv $targetEnv
        
        # Configurar ambiente específico
        switch ($targetEnv) {
            "dev" {
                Set-DevelopmentEnvironment
            }
            "docker" {
                Set-DockerEnvironment
            }
            "k8s" {
                Set-KubernetesEnvironment
            }
        }
        
        # Exibir resumo
        Show-ConfigurationSummary -TargetEnv $targetEnv
        
        Write-Host ""
        Write-Host "✅ 🎉 Configuração automática concluída com sucesso!" -ForegroundColor Green
        Write-Host "ℹ️  Seu ambiente $targetEnv está pronto para uso com JWT configurado" -ForegroundColor Blue
    }
    catch {
        Write-Host "❌ Erro durante a configuração automática: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "❌ Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        exit 1
    }
}

# Executar função principal
Main