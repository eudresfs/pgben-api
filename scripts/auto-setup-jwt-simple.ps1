<#
.SYNOPSIS
Script simplificado para configuração de JWT

.DESCRIPTION
Script de configuração automática de JWT para o sistema PGBEN

.PARAMETER Environment
Ambiente alvo (auto, dev, docker, k8s)

.PARAMETER KeySize
Tamanho da chave RSA em bits

.PARAMETER Force
Força a regeneração das chaves

.PARAMETER Namespace
Namespace do Kubernetes

.PARAMETER SecretName
Nome do secret no Kubernetes
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

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ScriptsDir = $PSScriptRoot

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

function Get-TargetEnvironment {
    if ($Environment -ne "auto") {
        return $Environment
    }
    
    Write-LogInfo "Detectando ambiente automaticamente..."
    
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
    
    $dockerComposePath = Join-Path $ProjectRoot "docker-compose.yml"
    if (Test-Path $dockerComposePath) {
        Write-LogInfo "Docker Compose detectado"
        return "docker"
    }
    
    $dockerfilePath = Join-Path $ProjectRoot "Dockerfile"
    if (Test-Path $dockerfilePath) {
        Write-LogInfo "Dockerfile detectado"
        return "docker"
    }
    
    Write-LogInfo "Ambiente de desenvolvimento detectado"
    return "dev"
}

function Test-Dependencies {
    param([string]$TargetEnv)
    
    Write-LogInfo "Verificando dependências para ambiente: $TargetEnv"
    
    try {
        $null = Get-Command node -ErrorAction Stop
        $nodeVersion = node --version
        Write-LogInfo "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js não encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    if ($TargetEnv -eq "k8s") {
        try {
            $null = Get-Command kubectl -ErrorAction Stop
            $kubectlVersion = kubectl version --client --short 2>$null
            Write-LogInfo "kubectl encontrado: $kubectlVersion"
        }
        catch {
            Write-LogError "kubectl não encontrado. Instale o kubectl para usar com Kubernetes."
            exit 1
        }
    }
    
    $requiredScripts = @("gerar-chaves-jwt.js")
    
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
        & powershell -ExecutionPolicy Bypass -File $dockerScript @args
        
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
        & powershell -ExecutionPolicy Bypass -File $k8sScript @args
        
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

function Show-Summary {
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
Write-Host "🚀 Configuração Automática Completa de JWT" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

try {
    # Detectar ambiente
    $targetEnv = Get-TargetEnvironment
    Write-Host "✅ Ambiente detectado: $targetEnv" -ForegroundColor Green
    
    # Verificar dependências
    Test-Dependencies -TargetEnv $targetEnv
    
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
    Show-Summary -TargetEnv $targetEnv
    
    Write-Host ""
    Write-Host "✅ 🎉 Configuração automática concluída com sucesso!" -ForegroundColor Green
    Write-Host "ℹ️  Seu ambiente $targetEnv está pronto para uso com JWT configurado" -ForegroundColor Blue
}
catch {
    Write-Host "❌ Erro durante a configuração automática: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}