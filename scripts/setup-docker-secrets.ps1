# Script PowerShell para configurar Docker Secrets para produção
# Sistema PGBEN - SEMTAS

param(
    [switch]$Force,
    [switch]$Regenerate,
    [string]$SecretsDir = "./secrets"
)

# Configurações
$ErrorActionPreference = "Stop"

# Lista de secrets necessários
$RequiredSecrets = @(
    "db_user",
    "db_password", 
    "redis_password",
    "jwt_secret",
    "encryption_key",
    "minio_access_key",
    "minio_secret_key",
    "session_secret",
    "cookie_secret",
    "csrf_secret",
    "smtp_password",
    "grafana_admin_password"
)

# Função para logging colorido
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    switch ($Type) {
        "Info" { Write-Host "[INFO] $Message" -ForegroundColor Blue }
        "Success" { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
        "Warning" { Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "[ERROR] $Message" -ForegroundColor Red }
    }
}

# Função para verificar se Docker Swarm está ativo
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

# Função para inicializar Docker Swarm
function Initialize-DockerSwarm {
    Write-ColorOutput "Inicializando Docker Swarm..." "Info"
    
    try {
        docker swarm init 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker Swarm inicializado com sucesso." "Success"
        } else {
            # Pode já estar inicializado
            Write-ColorOutput "Docker Swarm pode já estar inicializado." "Warning"
        }
    }
    catch {
        Write-ColorOutput "Erro ao inicializar Docker Swarm: $($_.Exception.Message)" "Error"
        throw
    }
}

# Função para gerar senha segura
function New-SecurePassword {
    param(
        [int]$Length = 32,
        [switch]$AlphaNumericOnly
    )
    
    if ($AlphaNumericOnly) {
        $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    } else {
        $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    }
    
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    
    return $password
}

# Função para gerar chave de criptografia
function New-EncryptionKey {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Função para criar diretório de secrets
function New-SecretsDirectory {
    Write-ColorOutput "Criando diretório de secrets..." "Info"
    
    if (Test-Path $SecretsDir) {
        if ($Force) {
            Write-ColorOutput "Removendo diretório existente..." "Warning"
            Remove-Item $SecretsDir -Recurse -Force
        } else {
            Write-ColorOutput "Diretório de secrets já existe. Use -Force para sobrescrever." "Warning"
            return
        }
    }
    
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
    Write-ColorOutput "Diretório de secrets criado: $SecretsDir" "Success"
}

# Função para gerar valores dos secrets
function New-SecretValues {
    Write-ColorOutput "Gerando valores dos secrets..." "Info"
    
    $secrets = @{}
    
    # Credenciais do banco de dados
    $secrets["db_user"] = "pgben_user"
    $secrets["db_password"] = New-SecurePassword -Length 24 -AlphaNumericOnly
    
    # Redis
    $secrets["redis_password"] = New-SecurePassword -Length 24 -AlphaNumericOnly
    
    # JWT e criptografia
    $secrets["jwt_secret"] = New-SecurePassword -Length 64
    $secrets["encryption_key"] = New-EncryptionKey
    
    # MinIO
    $secrets["minio_access_key"] = "pgben_minio_admin"
    $secrets["minio_secret_key"] = New-SecurePassword -Length 32 -AlphaNumericOnly
    
    # Secrets de sessão
    $secrets["session_secret"] = New-SecurePassword -Length 64
    $secrets["cookie_secret"] = New-SecurePassword -Length 32
    $secrets["csrf_secret"] = New-SecurePassword -Length 32
    
    # SMTP (placeholder - deve ser configurado manualmente)
    $secrets["smtp_password"] = "CONFIGURE_SMTP_PASSWORD"
    
    # Grafana
    $secrets["grafana_admin_password"] = New-SecurePassword -Length 16 -AlphaNumericOnly
    
    Write-ColorOutput "Valores dos secrets gerados." "Success"
    return $secrets
}

# Função para salvar secrets em arquivos
function Save-SecretsToFiles {
    param([hashtable]$Secrets)
    
    Write-ColorOutput "Salvando secrets em arquivos..." "Info"
    
    foreach ($secretName in $Secrets.Keys) {
        $secretPath = Join-Path $SecretsDir "$secretName.txt"
        $Secrets[$secretName] | Out-File -FilePath $secretPath -Encoding UTF8 -NoNewline
        
        # Definir permissões restritivas (Windows)
        $acl = Get-Acl $secretPath
        $acl.SetAccessRuleProtection($true, $false)
        
        # Adicionar permissão apenas para o usuário atual
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
            "FullControl",
            "Allow"
        )
        $acl.SetAccessRule($accessRule)
        
        # Adicionar permissão para SYSTEM
        $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            "SYSTEM",
            "FullControl",
            "Allow"
        )
        $acl.SetAccessRule($systemRule)
        
        Set-Acl -Path $secretPath -AclObject $acl
    }
    
    Write-ColorOutput "Secrets salvos em arquivos com permissões restritivas." "Success"
}

# Função para verificar se secret já existe no Docker
function Test-DockerSecret {
    param([string]$SecretName)
    
    try {
        $result = docker secret inspect $SecretName 2>$null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# Função para criar secrets no Docker Swarm
function New-DockerSecrets {
    param([hashtable]$Secrets)
    
    Write-ColorOutput "Criando secrets no Docker Swarm..." "Info"
    
    foreach ($secretName in $Secrets.Keys) {
        $secretPath = Join-Path $SecretsDir "$secretName.txt"
        
        if (Test-DockerSecret -SecretName $secretName) {
            if ($Regenerate) {
                Write-ColorOutput "Removendo secret existente: $secretName" "Warning"
                docker secret rm $secretName 2>$null
            } else {
                Write-ColorOutput "Secret já existe: $secretName (use -Regenerate para recriar)" "Warning"
                continue
            }
        }
        
        try {
            docker secret create $secretName $secretPath
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "Secret criado: $secretName" "Success"
            } else {
                Write-ColorOutput "Erro ao criar secret: $secretName" "Error"
            }
        }
        catch {
            Write-ColorOutput "Erro ao criar secret $secretName : $($_.Exception.Message)" "Error"
        }
    }
}

# Função para listar secrets criados
function Show-DockerSecrets {
    Write-ColorOutput "Listando secrets do Docker Swarm..." "Info"
    
    try {
        docker secret ls
        Write-ColorOutput "Secrets listados com sucesso." "Success"
    }
    catch {
        Write-ColorOutput "Erro ao listar secrets: $($_.Exception.Message)" "Error"
    }
}

# Função para gerar arquivo de resumo
function New-SecretsSummary {
    param([hashtable]$Secrets)
    
    Write-ColorOutput "Gerando arquivo de resumo..." "Info"
    
    $summaryPath = Join-Path $SecretsDir "secrets-summary.txt"
    $summary = @"
Resumo dos Docker Secrets - Sistema PGBEN
Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Secrets criados:
"@

    foreach ($secretName in $Secrets.Keys) {
        if ($secretName -eq "smtp_password") {
            $summary += "- $secretName : [CONFIGURE MANUALMENTE]`n"
        } else {
            $summary += "- $secretName : [GERADO AUTOMATICAMENTE]`n"
        }
    }
    
    $summary += @"

Arquivos de secrets salvos em: $SecretsDir

Para usar com Docker Compose:
  docker-compose -f docker-compose.prod.yml up -d

Para verificar secrets:
  docker secret ls

IMPORTANTE:
- Mantenha os arquivos de secrets seguros
- Configure a senha SMTP manualmente
- Faça backup dos secrets antes de atualizações
- Use senhas diferentes em produção
"@

    $summary | Out-File -FilePath $summaryPath -Encoding UTF8
    Write-ColorOutput "Arquivo de resumo criado: $summaryPath" "Success"
}

# Função para exibir instruções finais
function Show-FinalInstructions {
    param([hashtable]$Secrets)
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Configuração Concluída!" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-ColorOutput "Próximos passos:" "Info"
    Write-Host "1. Configure a senha SMTP em secrets/smtp_password.txt"
    Write-Host "2. Execute: docker-compose -f docker-compose.prod.yml up -d"
    Write-Host "3. Verifique os logs: docker-compose logs -f"
    
    Write-Host ""
    Write-ColorOutput "Credenciais importantes:" "Info"
    Write-Host "- Usuário do banco: $($Secrets['db_user'])"
    Write-Host "- MinIO Access Key: $($Secrets['minio_access_key'])"
    Write-Host "- Senha do Grafana: $($Secrets['grafana_admin_password'])"
    
    Write-Host ""
    Write-ColorOutput "IMPORTANTE: Anote essas credenciais em local seguro!" "Warning"
}

# Função principal
function Main {
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Configurador de Docker Secrets" -ForegroundColor Cyan
    Write-Host "  Sistema PGBEN - SEMTAS" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Verificar e inicializar Docker Swarm
        if (-not (Test-DockerSwarm)) {
            Initialize-DockerSwarm
        }
        
        # Criar diretório de secrets
        New-SecretsDirectory
        
        # Gerar valores dos secrets
        $secrets = New-SecretValues
        
        # Salvar em arquivos
        Save-SecretsToFiles -Secrets $secrets
        
        # Criar secrets no Docker
        New-DockerSecrets -Secrets $secrets
        
        # Gerar resumo
        New-SecretsSummary -Secrets $secrets
        
        # Listar secrets criados
        Show-DockerSecrets
        
        # Exibir instruções finais
        Show-FinalInstructions -Secrets $secrets
        
        Write-ColorOutput "Configuração de Docker Secrets concluída com sucesso!" "Success"
    }
    catch {
        Write-ColorOutput "Erro durante a configuração: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# Executar função principal
Main