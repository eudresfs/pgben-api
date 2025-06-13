# Setup script para deploy do PGBEN Server via Portainer
# Este script prepara o ambiente local para testes e deploy

param(
    [string]$Environment = "development",
    [switch]$Force,
    [switch]$SkipDocker
)

# Configuracoes
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "data"
$LogsDir = Join-Path $ProjectRoot "logs"
$KeysDir = Join-Path $ProjectRoot "keys"
$UploadsDir = Join-Path $ProjectRoot "uploads"
$ConfigDir = Join-Path $ProjectRoot "config"

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "                    PGBEN SERVER - SETUP PORTAINER                        " -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "Ambiente: $Environment" -ForegroundColor Yellow
Write-Host "Diretorio do projeto: $ProjectRoot" -ForegroundColor Yellow
Write-Host ""

# Funcao para criar diretorio
function New-DirectoryIfNotExists {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (Test-Path $Path) {
        if ($Force) {
            Write-Host "Recriando diretorio: $Description" -ForegroundColor Yellow
            Remove-Item $Path -Recurse -Force
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        } else {
            Write-Host "Diretorio ja existe: $Description" -ForegroundColor Green
        }
    } else {
        Write-Host "Criando diretorio: $Description" -ForegroundColor Blue
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

# Verificar Docker
if (-not $SkipDocker) {
    Write-Host "Verificando Docker..." -ForegroundColor Blue
    
    try {
        $dockerVersion = docker --version
        Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "ERRO: Docker nao encontrado. Instale o Docker Desktop." -ForegroundColor Red
        exit 1
    }
    
    try {
        $composeVersion = docker-compose --version
        Write-Host "Docker Compose encontrado: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "ERRO: Docker Compose nao encontrado." -ForegroundColor Red
        exit 1
    }
}

# Criar diretorios necessarios
Write-Host "\nCriando estrutura de diretorios..." -ForegroundColor Blue
New-DirectoryIfNotExists -Path $DataDir -Description "Dados persistentes"
New-DirectoryIfNotExists -Path (Join-Path $DataDir "postgres") -Description "Dados PostgreSQL"
New-DirectoryIfNotExists -Path (Join-Path $DataDir "redis") -Description "Dados Redis"
New-DirectoryIfNotExists -Path (Join-Path $DataDir "minio") -Description "Dados MinIO"
New-DirectoryIfNotExists -Path $LogsDir -Description "Logs da aplicacao"
New-DirectoryIfNotExists -Path $KeysDir -Description "Chaves de seguranca"
New-DirectoryIfNotExists -Path $UploadsDir -Description "Uploads temporarios"
New-DirectoryIfNotExists -Path $ConfigDir -Description "Configuracoes"

# Gerar chaves JWT se nao existirem
Write-Host "\nVerificando chaves JWT..." -ForegroundColor Blue
$jwtPrivateKey = Join-Path $KeysDir "jwt-private.key"
$jwtPublicKey = Join-Path $KeysDir "jwt-public.key"

if (-not (Test-Path $jwtPrivateKey) -or -not (Test-Path $jwtPublicKey) -or $Force) {
    Write-Host "Gerando chaves JWT..." -ForegroundColor Yellow
    
    # Tentar usar OpenSSL primeiro
    try {
        $opensslVersion = openssl version
        Write-Host "OpenSSL encontrado: $opensslVersion" -ForegroundColor Green
        
        # Gerar chave privada
        openssl genpkey -algorithm RSA -out $jwtPrivateKey -pkcs8 -pass pass:pgben2024
        # Gerar chave publica
        openssl rsa -pubout -in $jwtPrivateKey -out $jwtPublicKey -passin pass:pgben2024
        
        Write-Host "Chaves JWT geradas com OpenSSL" -ForegroundColor Green
    } catch {
        Write-Host "OpenSSL nao encontrado. Usando Node.js..." -ForegroundColor Yellow
        
        # Fallback para Node.js
        $nodeScript = @"
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

fs.writeFileSync('$($jwtPrivateKey.Replace('\', '\\'))', privateKey);
fs.writeFileSync('$($jwtPublicKey.Replace('\', '\\'))', publicKey);

console.log('Chaves JWT geradas com Node.js');
"@
        
        $nodeScript | node
    }
} else {
    Write-Host "Chaves JWT ja existem" -ForegroundColor Green
}

# Criar configuracao do Nginx
Write-Host "\nCriando configuracao do Nginx..." -ForegroundColor Blue
$nginxConfig = Join-Path $ConfigDir "nginx.conf"
$nginxContent = @"
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Upstream para a aplicacao
    upstream pgben_app {
        server pgben-server:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Proxy para a aplicacao
        location / {
            proxy_pass http://pgben_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Health check
        location /health {
            proxy_pass http://pgben_app/health;
            access_log off;
        }
    }
}
"@

Set-Content -Path $nginxConfig -Value $nginxContent -Encoding UTF8
Write-Host "Configuracao do Nginx criada" -ForegroundColor Green

# Criar script de inicializacao do PostgreSQL
Write-Host "\nCriando script de inicializacao do PostgreSQL..." -ForegroundColor Blue
$initScript = Join-Path $ConfigDir "init-postgres.sh"
$initContent = @"
#!/bin/bash
set -e

# Criar database se nao existir
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS pgben;
    GRANT ALL PRIVILEGES ON DATABASE pgben TO $POSTGRES_USER;
EOSQL

echo "Database pgben criado com sucesso"
"@

Set-Content -Path $initScript -Value $initContent -Encoding UTF8
Write-Host "Script de inicializacao do PostgreSQL criado" -ForegroundColor Green

# Verificar arquivos necessarios
Write-Host "\nVerificando arquivos necessarios..." -ForegroundColor Blue
$envFile = Join-Path $ProjectRoot ".env.portainer"
$composeFile = Join-Path $ProjectRoot "docker-compose.portainer.yml"

if (-not (Test-Path $envFile)) {
    Write-Host "AVISO: Arquivo .env.portainer nao encontrado" -ForegroundColor Yellow
    Write-Host "Crie o arquivo com as variaveis de ambiente necessarias" -ForegroundColor Yellow
} else {
    Write-Host "Arquivo .env.portainer encontrado" -ForegroundColor Green
}

if (-not (Test-Path $composeFile)) {
    Write-Host "AVISO: Arquivo docker-compose.portainer.yml nao encontrado" -ForegroundColor Yellow
    Write-Host "Crie o arquivo com a configuracao dos servicos" -ForegroundColor Yellow
} else {
    Write-Host "Arquivo docker-compose.portainer.yml encontrado" -ForegroundColor Green
}

# Verificar permissoes de escrita
Write-Host "\nVerificando permissoes..." -ForegroundColor Blue
$testDirs = @($DataDir, $LogsDir, $KeysDir, $UploadsDir)
foreach ($dir in $testDirs) {
    try {
        $testFile = Join-Path $dir "test.tmp"
        "test" | Out-File -FilePath $testFile
        Remove-Item $testFile
        Write-Host "Permissao de escrita OK: $dir" -ForegroundColor Green
    } catch {
        Write-Host "ERRO: Sem permissao de escrita em $dir" -ForegroundColor Red
    }
}

# Resumo final
Write-Host "\n=============================================================================" -ForegroundColor Cyan
Write-Host "                              RESUMO                                      " -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "Ambiente preparado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure as variaveis no arquivo .env.portainer" -ForegroundColor White
Write-Host "2. Teste localmente com: docker-compose -f docker-compose.portainer.yml up" -ForegroundColor White
Write-Host "3. Importe o stack no Portainer" -ForegroundColor White
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Yellow
Write-Host "- Testar localmente: docker-compose -f docker-compose.portainer.yml up -d" -ForegroundColor White
Write-Host "- Ver logs: docker-compose -f docker-compose.portainer.yml logs -f" -ForegroundColor White
Write-Host "- Parar servicos: docker-compose -f docker-compose.portainer.yml down" -ForegroundColor White
Write-Host ""
Write-Host "Acesso aos servicos (local):" -ForegroundColor Yellow
Write-Host "- Aplicacao: http://localhost:3000" -ForegroundColor White
Write-Host "- MailHog: http://localhost:8025" -ForegroundColor White
Write-Host "- MinIO Console: http://localhost:9001" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Altere todas as senhas e chaves antes do deploy em producao!" -ForegroundColor Red
Write-Host "=============================================================================" -ForegroundColor Cyan