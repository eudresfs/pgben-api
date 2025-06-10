# Script PowerShell para gerar certificados SSL auto-assinados para desenvolvimento
# Sistema PGBEN - SEMTAS

param(
    [string]$SslDir = "./ssl",
    [string]$CommonName = "pgben.semtas.local",
    [int]$Days = 365
)

# Configurações
$ErrorActionPreference = "Stop"
$Country = "BR"
$State = "Pernambuco"
$City = "Recife"
$Organization = "SEMTAS"
$OrganizationalUnit = "TI"
$Email = "admin@semtas.local"

# Domínios adicionais para SAN (Subject Alternative Names)
$SanDomains = @(
    "pgben.semtas.local",
    "grafana.pgben.semtas.local",
    "prometheus.pgben.semtas.local",
    "localhost",
    "127.0.0.1"
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

# Função para verificar dependências
function Test-Dependencies {
    Write-ColorOutput "Verificando dependências..." "Info"
    
    # Verificar se OpenSSL está disponível
    try {
        $null = Get-Command openssl -ErrorAction Stop
        Write-ColorOutput "OpenSSL encontrado." "Success"
    }
    catch {
        Write-ColorOutput "OpenSSL não encontrado. Tentando usar certificados do Windows..." "Warning"
        
        # Verificar se o módulo PKI está disponível
        if (-not (Get-Module -ListAvailable -Name PKI)) {
            Write-ColorOutput "Módulo PKI não disponível. Por favor, instale o OpenSSL ou use Windows 10/Server 2016+" "Error"
            exit 1
        }
    }
    
    Write-ColorOutput "Dependências verificadas com sucesso." "Success"
}

# Função para criar diretório SSL
function New-SslDirectory {
    Write-ColorOutput "Criando diretório SSL..." "Info"
    
    if (Test-Path $SslDir) {
        Write-ColorOutput "Diretório SSL já existe. Fazendo backup..." "Warning"
        $backupDir = "${SslDir}_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Move-Item $SslDir $backupDir
    }
    
    New-Item -ItemType Directory -Path $SslDir -Force | Out-Null
    Write-ColorOutput "Diretório SSL criado: $SslDir" "Success"
}

# Função para gerar arquivo de configuração OpenSSL
function New-OpenSslConfig {
    Write-ColorOutput "Gerando arquivo de configuração OpenSSL..." "Info"
    
    $configContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $Country
ST = $State
L = $City
O = $Organization
OU = $OrganizationalUnit
CN = $CommonName
emailAddress = $Email

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
"@

    # Adicionar SANs
    $counter = 1
    foreach ($domain in $SanDomains) {
        if ($domain -match '^\d+\.\d+\.\d+\.\d+$') {
            $configContent += "IP.$counter = $domain`n"
        } else {
            $configContent += "DNS.$counter = $domain`n"
        }
        $counter++
    }
    
    $configPath = Join-Path $SslDir "openssl.cnf"
    $configContent | Out-File -FilePath $configPath -Encoding UTF8
    
    Write-ColorOutput "Arquivo de configuração OpenSSL gerado." "Success"
    return $configPath
}

# Função para gerar certificados usando OpenSSL
function New-OpenSslCertificates {
    param([string]$ConfigPath)
    
    $keyPath = Join-Path $SslDir "pgben.key"
    $csrPath = Join-Path $SslDir "pgben.csr"
    $crtPath = Join-Path $SslDir "pgben.crt"
    $pemPath = Join-Path $SslDir "pgben.pem"
    
    try {
        # Gerar chave privada
        Write-ColorOutput "Gerando chave privada..." "Info"
        & openssl genrsa -out $keyPath 2048
        if ($LASTEXITCODE -ne 0) { throw "Erro ao gerar chave privada" }
        
        # Gerar CSR
        Write-ColorOutput "Gerando CSR..." "Info"
        & openssl req -new -key $keyPath -out $csrPath -config $ConfigPath
        if ($LASTEXITCODE -ne 0) { throw "Erro ao gerar CSR" }
        
        # Gerar certificado
        Write-ColorOutput "Gerando certificado auto-assinado..." "Info"
        & openssl x509 -req -in $csrPath -signkey $keyPath -out $crtPath -days $Days -extensions v3_req -extfile $ConfigPath
        if ($LASTEXITCODE -ne 0) { throw "Erro ao gerar certificado" }
        
        # Gerar PEM combinado
        Write-ColorOutput "Gerando certificado PEM combinado..." "Info"
        $certContent = Get-Content $crtPath -Raw
        $keyContent = Get-Content $keyPath -Raw
        "$certContent$keyContent" | Out-File -FilePath $pemPath -Encoding UTF8 -NoNewline
        
        Write-ColorOutput "Certificados OpenSSL gerados com sucesso!" "Success"
        return $true
    }
    catch {
        Write-ColorOutput "Erro ao gerar certificados com OpenSSL: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Função para gerar certificados usando PowerShell/Windows
function New-WindowsCertificates {
    Write-ColorOutput "Gerando certificados usando Windows Certificate Store..." "Info"
    
    try {
        # Criar certificado auto-assinado
        $cert = New-SelfSignedCertificate `
            -Subject "CN=$CommonName, O=$Organization, OU=$OrganizationalUnit, L=$City, S=$State, C=$Country" `
            -DnsName $SanDomains `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -KeyAlgorithm RSA `
            -KeyLength 2048 `
            -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
            -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddDays($Days)
        
        # Exportar certificado público
        $crtPath = Join-Path $SslDir "pgben.crt"
        Export-Certificate -Cert $cert -FilePath $crtPath -Type CERT | Out-Null
        
        # Exportar chave privada (requer senha)
        $keyPath = Join-Path $SslDir "pgben.pfx"
        $password = ConvertTo-SecureString -String "pgben123" -Force -AsPlainText
        Export-PfxCertificate -Cert $cert -FilePath $keyPath -Password $password | Out-Null
        
        # Converter PFX para PEM usando OpenSSL (se disponível)
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            $pemKeyPath = Join-Path $SslDir "pgben.key"
            $pemCrtPath = Join-Path $SslDir "pgben_win.crt"
            
            # Extrair chave privada
            & openssl pkcs12 -in $keyPath -nocerts -out $pemKeyPath -nodes -passin pass:pgben123
            
            # Extrair certificado
            & openssl pkcs12 -in $keyPath -clcerts -nokeys -out $pemCrtPath -passin pass:pgben123
        }
        
        # Remover certificado do store (opcional)
        Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
        
        Write-ColorOutput "Certificados Windows gerados com sucesso!" "Success"
        return $true
    }
    catch {
        Write-ColorOutput "Erro ao gerar certificados Windows: $($_.Exception.Message)" "Error"
        return $false
    }
}

# Função para verificar certificados
function Test-Certificates {
    Write-ColorOutput "Verificando certificados gerados..." "Info"
    
    $crtPath = Join-Path $SslDir "pgben.crt"
    
    if (Test-Path $crtPath) {
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            Write-ColorOutput "Informações do certificado:" "Info"
            & openssl x509 -in $crtPath -text -noout | Select-String "(Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:)"
        } else {
            # Usar PowerShell para ler certificado
            $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($crtPath)
            Write-Host "Subject: $($cert.Subject)"
            Write-Host "Issuer: $($cert.Issuer)"
            Write-Host "Valid From: $($cert.NotBefore)"
            Write-Host "Valid To: $($cert.NotAfter)"
        }
        
        Write-ColorOutput "Certificado verificado com sucesso." "Success"
    } else {
        Write-ColorOutput "Arquivo de certificado não encontrado." "Error"
    }
}

# Função para exibir instruções
function Show-UsageInstructions {
    Write-ColorOutput "Instruções de uso:" "Info"
    
    Write-Host ""
    Write-Host "Arquivos gerados em $SslDir/:"
    Get-ChildItem $SslDir | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Length) bytes"
    }
    
    Write-Host ""
    Write-Host "Para usar com Docker Compose:"
    Write-Host "  docker-compose -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d"
    
    Write-Host ""
    Write-Host "Para adicionar o certificado como confiável no Windows:"
    Write-Host "  1. Abra o arquivo pgben.crt"
    Write-Host "  2. Clique em 'Instalar Certificado...'"
    Write-Host "  3. Selecione 'Máquina Local' e 'Autoridades de Certificação Raiz Confiáveis'"
    
    Write-Host ""
    Write-ColorOutput "IMPORTANTE: Este é um certificado auto-assinado para desenvolvimento." "Warning"
    Write-ColorOutput "Para produção, use certificados de uma CA confiável (Let's Encrypt, etc.)." "Warning"
}

# Função principal
function Main {
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Gerador de Certificados SSL/TLS" -ForegroundColor Cyan
    Write-Host "  Sistema PGBEN - SEMTAS" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Test-Dependencies
        New-SslDirectory
        
        $configPath = New-OpenSslConfig
        
        # Tentar OpenSSL primeiro, depois Windows
        $success = $false
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            $success = New-OpenSslCertificates -ConfigPath $configPath
        }
        
        if (-not $success) {
            Write-ColorOutput "Tentando método alternativo com Windows..." "Info"
            $success = New-WindowsCertificates
        }
        
        if ($success) {
            Test-Certificates
            Write-Host ""
            Write-ColorOutput "Certificados SSL gerados com sucesso!" "Success"
            Write-Host ""
            Show-UsageInstructions
        } else {
            Write-ColorOutput "Falha ao gerar certificados." "Error"
            exit 1
        }
    }
    catch {
        Write-ColorOutput "Erro durante a execução: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# Executar função principal
Main