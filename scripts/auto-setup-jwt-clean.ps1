<#
.SYNOPSIS
Script de configuracao automatica de JWT para PGBEN

.DESCRIPTION
Configura automaticamente as chaves JWT para diferentes ambientes

.PARAMETER Environment
Ambiente alvo: auto, dev, docker, k8s

.PARAMETER KeySize
Tamanho da chave RSA: 2048, 3072, 4096

.PARAMETER Force
Forca regeneracao das chaves

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
        # kubectl nao disponivel
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
    
    Write-LogInfo "Verificando dependencias para ambiente: $TargetEnv"
    
    try {
        $null = Get-Command node -ErrorAction Stop
        $nodeVersion = node --version
        Write-LogInfo "Node.js encontrado: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js nao encontrado. Instale o Node.js primeiro."
        exit 1
    }
    
    if ($TargetEnv -eq "k8s") {
        try {
            $null = Get-Command kubectl -ErrorAction Stop
            $kubectlVersion = kubectl version --client --short 2>$null
            Write-LogInfo "kubectl encontrado: $kubectlVersion"
        }
        catch {
            Write-LogError "kubectl nao encontrado. Instale o kubectl para usar com Kubernetes."
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
            Write-LogError "Script necessario nao encontrado: $scriptPath"
            exit 1
        }
    }
    
    Write-LogSuccess "Todas as dependencias estao disponiveis"
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
        
        & node @args | Out-Host
        
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "Chaves JWT configuradas para desenvolvimento"
            
            $envPath = Join-Path $ProjectRoot ".env"
            if (-not (Test-Path $envPath)) {
                Write-LogWarning "Arquivo .env nao encontrado"
                Write-LogInfo "Criando .env com configuracoes JWT..."
                
                $envContent = @(
                    "# JWT Configuration",
                    "JWT_ALGORITHM=RS256",
                    "JWT_PRIVATE_KEY_PATH=keys/private.key",
                    "JWT_PUBLIC_KEY_PATH=keys/public.key",
                    "JWT_ACCESS_TOKEN_EXPIRES_IN=1h",
                    "JWT_REFRESH_TOKEN_EXPIRES_IN=7d"
                )
                
                $envContent | Out-File -FilePath $envPath -Encoding UTF8
                Write-LogSuccess "Arquivo .env criado com configuracoes JWT"
            }
            else {
                Write-LogInfo "Verifique se o .env contem as configuracoes JWT necessarias"
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
    Write-Host "RESUMO DA CONFIGURACAO" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    Write-Host "Ambiente: $TargetEnv" -ForegroundColor White
    Write-Host "Tamanho da chave: $KeySize bits" -ForegroundColor White
    Write-Host "Forca regeneracao: $Force" -ForegroundColor White
    
    if ($TargetEnv -eq "k8s") {
        Write-Host "Namespace: $Namespace" -ForegroundColor White
        Write-Host "Secret: $SecretName" -ForegroundColor White
    }
    
    Write-Host ""
    
    switch ($TargetEnv) {
        "dev" {
            Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'npm run dev' para iniciar o servidor" -ForegroundColor White
            Write-Host "2. As chaves estao em keys/ e configuradas no .env" -ForegroundColor White
        }
        "docker" {
            Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'docker-compose up -d' para iniciar" -ForegroundColor White
            Write-Host "2. As configuracoes estao no docker-compose.override.yml" -ForegroundColor White
        }
        "k8s" {
            Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Execute 'kubectl apply -f k8s/' para deploy" -ForegroundColor White
            Write-Host "2. O secret $SecretName foi criado no namespace $Namespace" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "LEMBRETE DE SEGURANCA:" -ForegroundColor Red
    Write-Host "- Mantenha as chaves privadas seguras" -ForegroundColor White
    Write-Host "- Nao commite chaves no controle de versao" -ForegroundColor White
    Write-Host "- Considere rotacao periodica das chaves" -ForegroundColor White
    Write-Host "- Use secrets/volumes apropriados em producao" -ForegroundColor White
}

# Execucao principal
Write-Host "Configuracao Automatica Completa de JWT" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

try {
    # Detectar ambiente
    $targetEnv = Get-TargetEnvironment
    Write-Host "Ambiente detectado: $targetEnv" -ForegroundColor Green
    
    # Verificar dependencias
    Test-Dependencies -TargetEnv $targetEnv
    
    # Configurar ambiente especifico
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
    Write-Host "Configuracao automatica concluida com sucesso!" -ForegroundColor Green
    Write-Host "Seu ambiente $targetEnv esta pronto para uso com JWT configurado" -ForegroundColor Blue
}
catch {
    Write-Host "Erro durante a configuracao automatica: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}