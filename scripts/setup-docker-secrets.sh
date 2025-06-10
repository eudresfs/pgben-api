#!/bin/bash

# Script para configuração de Docker Secrets para ambiente de produção
# Sistema de Gestão de Benefícios Eventuais - SEMTAS
# Autor: Especialista DevOps
# Data: $(date +%Y-%m-%d)

set -euo pipefail

# Configurações
SECRETS_DIR="./secrets"
BACKUP_DIR="./secrets-backup"
LOG_FILE="./logs/docker-secrets-setup.log"
DATE_FORMAT=$(date +"%Y%m%d_%H%M%S")

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Função para gerar senhas seguras
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Função para gerar chaves hexadecimais
generate_hex_key() {
    local length=${1:-64}
    openssl rand -hex $((length/2))
}

# Função para criar diretórios necessários
setup_directories() {
    log "Criando diretórios necessários..."
    
    mkdir -p "$SECRETS_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "./logs"
    
    # Definir permissões restritivas
    chmod 700 "$SECRETS_DIR"
    chmod 700 "$BACKUP_DIR"
    chmod 755 "./logs"
    
    log_success "Diretórios criados com permissões adequadas"
}

# Função para fazer backup de secrets existentes
backup_existing_secrets() {
    if [ -d "$SECRETS_DIR" ] && [ "$(ls -A $SECRETS_DIR 2>/dev/null)" ]; then
        log "Fazendo backup dos secrets existentes..."
        
        local backup_file="${BACKUP_DIR}/secrets-backup-${DATE_FORMAT}.tar.gz"
        tar -czf "$backup_file" -C "$SECRETS_DIR" .
        
        log_success "Backup criado: $backup_file"
    else
        log "Nenhum secret existente encontrado para backup"
    fi
}

# Função para gerar secrets do banco de dados
generate_database_secrets() {
    log "Gerando secrets do banco de dados..."
    
    # Usuário do banco (pode ser customizado)
    echo -n "${DB_USER:-pgben_user}" > "$SECRETS_DIR/db_user.txt"
    
    # Senha do banco (gerada automaticamente se não fornecida)
    if [ -z "${DB_PASSWORD:-}" ]; then
        local db_password=$(generate_password 32)
        echo -n "$db_password" > "$SECRETS_DIR/db_password.txt"
        log_warning "Senha do banco gerada automaticamente. Anote: $db_password"
    else
        echo -n "$DB_PASSWORD" > "$SECRETS_DIR/db_password.txt"
        log "Usando senha do banco fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/db_user.txt"
    chmod 600 "$SECRETS_DIR/db_password.txt"
    
    log_success "Secrets do banco de dados criados"
}

# Função para gerar secrets do Redis
generate_redis_secrets() {
    log "Gerando secrets do Redis..."
    
    if [ -z "${REDIS_PASSWORD:-}" ]; then
        local redis_password=$(generate_password 32)
        echo -n "$redis_password" > "$SECRETS_DIR/redis_password.txt"
        log_warning "Senha do Redis gerada automaticamente. Anote: $redis_password"
    else
        echo -n "$REDIS_PASSWORD" > "$SECRETS_DIR/redis_password.txt"
        log "Usando senha do Redis fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/redis_password.txt"
    
    log_success "Secrets do Redis criados"
}

# Função para gerar secrets JWT
generate_jwt_secrets() {
    log "Gerando secrets JWT..."
    
    if [ -z "${JWT_SECRET:-}" ]; then
        local jwt_secret=$(generate_hex_key 64)
        echo -n "$jwt_secret" > "$SECRETS_DIR/jwt_secret.txt"
        log_warning "Chave JWT gerada automaticamente"
    else
        echo -n "$JWT_SECRET" > "$SECRETS_DIR/jwt_secret.txt"
        log "Usando chave JWT fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/jwt_secret.txt"
    
    log_success "Secrets JWT criados"
}

# Função para gerar secrets do MinIO
generate_minio_secrets() {
    log "Gerando secrets do MinIO..."
    
    # Access Key
    if [ -z "${MINIO_ACCESS_KEY:-}" ]; then
        local minio_access_key=$(generate_password 20)
        echo -n "$minio_access_key" > "$SECRETS_DIR/minio_access_key.txt"
        log_warning "Access Key do MinIO gerada automaticamente. Anote: $minio_access_key"
    else
        echo -n "$MINIO_ACCESS_KEY" > "$SECRETS_DIR/minio_access_key.txt"
        log "Usando Access Key do MinIO fornecida via variável de ambiente"
    fi
    
    # Secret Key
    if [ -z "${MINIO_SECRET_KEY:-}" ]; then
        local minio_secret_key=$(generate_password 40)
        echo -n "$minio_secret_key" > "$SECRETS_DIR/minio_secret_key.txt"
        log_warning "Secret Key do MinIO gerada automaticamente. Anote: $minio_secret_key"
    else
        echo -n "$MINIO_SECRET_KEY" > "$SECRETS_DIR/minio_secret_key.txt"
        log "Usando Secret Key do MinIO fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/minio_access_key.txt"
    chmod 600 "$SECRETS_DIR/minio_secret_key.txt"
    
    log_success "Secrets do MinIO criados"
}

# Função para gerar secrets de criptografia
generate_encryption_secrets() {
    log "Gerando secrets de criptografia..."
    
    # Chave de criptografia principal
    if [ -z "${ENCRYPTION_KEY:-}" ]; then
        local encryption_key=$(generate_hex_key 64)
        echo -n "$encryption_key" > "$SECRETS_DIR/encryption_key.txt"
        log_warning "Chave de criptografia gerada automaticamente"
    else
        echo -n "$ENCRYPTION_KEY" > "$SECRETS_DIR/encryption_key.txt"
        log "Usando chave de criptografia fornecida via variável de ambiente"
    fi
    
    # Chave de assinatura de auditoria
    if [ -z "${AUDIT_SIGNING_KEY:-}" ]; then
        local audit_key=$(generate_hex_key 64)
        echo -n "$audit_key" > "$SECRETS_DIR/audit_signing_key.txt"
        log_warning "Chave de assinatura de auditoria gerada automaticamente"
    else
        echo -n "$AUDIT_SIGNING_KEY" > "$SECRETS_DIR/audit_signing_key.txt"
        log "Usando chave de assinatura de auditoria fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/encryption_key.txt"
    chmod 600 "$SECRETS_DIR/audit_signing_key.txt"
    
    log_success "Secrets de criptografia criados"
}

# Função para gerar secrets de sessão e cookies
generate_session_secrets() {
    log "Gerando secrets de sessão e cookies..."
    
    # Cookie Secret
    if [ -z "${COOKIE_SECRET:-}" ]; then
        local cookie_secret=$(generate_hex_key 64)
        echo -n "$cookie_secret" > "$SECRETS_DIR/cookie_secret.txt"
        log_warning "Chave de cookie gerada automaticamente"
    else
        echo -n "$COOKIE_SECRET" > "$SECRETS_DIR/cookie_secret.txt"
        log "Usando chave de cookie fornecida via variável de ambiente"
    fi
    
    # Session Secret
    if [ -z "${SESSION_SECRET:-}" ]; then
        local session_secret=$(generate_hex_key 64)
        echo -n "$session_secret" > "$SECRETS_DIR/session_secret.txt"
        log_warning "Chave de sessão gerada automaticamente"
    else
        echo -n "$SESSION_SECRET" > "$SECRETS_DIR/session_secret.txt"
        log "Usando chave de sessão fornecida via variável de ambiente"
    fi
    
    # CSRF Secret
    if [ -z "${CSRF_SECRET:-}" ]; then
        local csrf_secret=$(generate_hex_key 64)
        echo -n "$csrf_secret" > "$SECRETS_DIR/csrf_secret.txt"
        log_warning "Chave CSRF gerada automaticamente"
    else
        echo -n "$CSRF_SECRET" > "$SECRETS_DIR/csrf_secret.txt"
        log "Usando chave CSRF fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/cookie_secret.txt"
    chmod 600 "$SECRETS_DIR/session_secret.txt"
    chmod 600 "$SECRETS_DIR/csrf_secret.txt"
    
    log_success "Secrets de sessão e cookies criados"
}

# Função para gerar secrets de email
generate_email_secrets() {
    log "Gerando secrets de email..."
    
    if [ -n "${SMTP_PASS:-}" ]; then
        echo -n "$SMTP_PASS" > "$SECRETS_DIR/smtp_password.txt"
        chmod 600 "$SECRETS_DIR/smtp_password.txt"
        log_success "Secret de email criado"
    else
        log_warning "SMTP_PASS não fornecida. Secret de email não criado."
    fi
}

# Função para gerar secrets do Grafana
generate_grafana_secrets() {
    log "Gerando secrets do Grafana..."
    
    if [ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]; then
        local grafana_password=$(generate_password 24)
        echo -n "$grafana_password" > "$SECRETS_DIR/grafana_admin_password.txt"
        log_warning "Senha do admin do Grafana gerada automaticamente. Anote: $grafana_password"
    else
        echo -n "$GRAFANA_ADMIN_PASSWORD" > "$SECRETS_DIR/grafana_admin_password.txt"
        log "Usando senha do admin do Grafana fornecida via variável de ambiente"
    fi
    
    chmod 600 "$SECRETS_DIR/grafana_admin_password.txt"
    
    log_success "Secrets do Grafana criados"
}

# Função para validar secrets criados
validate_secrets() {
    log "Validando secrets criados..."
    
    local required_secrets=(
        "db_user.txt"
        "db_password.txt"
        "redis_password.txt"
        "jwt_secret.txt"
        "minio_access_key.txt"
        "minio_secret_key.txt"
        "encryption_key.txt"
        "audit_signing_key.txt"
        "cookie_secret.txt"
        "session_secret.txt"
        "csrf_secret.txt"
        "grafana_admin_password.txt"
    )
    
    local missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if [ ! -f "$SECRETS_DIR/$secret" ]; then
            missing_secrets+=("$secret")
        elif [ ! -s "$SECRETS_DIR/$secret" ]; then
            log_error "Secret $secret está vazio"
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -eq 0 ]; then
        log_success "Todos os secrets obrigatórios foram criados com sucesso"
    else
        log_error "Secrets faltando ou vazios: ${missing_secrets[*]}"
        return 1
    fi
}

# Função para exibir resumo
show_summary() {
    log "\n📋 RESUMO DA CONFIGURAÇÃO DE SECRETS"
    echo "==========================================="
    echo "📁 Diretório de secrets: $SECRETS_DIR"
    echo "💾 Diretório de backup: $BACKUP_DIR"
    echo "📝 Log de execução: $LOG_FILE"
    echo "\n🔐 Secrets criados:"
    
    if [ -d "$SECRETS_DIR" ]; then
        for file in "$SECRETS_DIR"/*.txt; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "?")
                echo "   ✅ $filename ($size bytes)"
            fi
        done
    fi
    
    echo "\n⚠️  IMPORTANTE:"
    echo "   • Anote as senhas geradas automaticamente"
    echo "   • Mantenha os secrets em local seguro"
    echo "   • Configure backup regular dos secrets"
    echo "   • Implemente rotação periódica de credenciais"
    echo "\n🚀 Próximos passos:"
    echo "   1. Execute: docker-compose -f docker-compose.prod.yml up -d"
    echo "   2. Verifique os logs dos serviços"
    echo "   3. Configure monitoramento e alertas"
    echo "   4. Implemente rotação de secrets"
}

# Função principal
main() {
    log "🔐 Iniciando configuração de Docker Secrets para produção"
    log "Sistema: PGBen - Gestão de Benefícios Eventuais SEMTAS"
    log "Data: $(date)"
    
    # Verificar dependências
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL não encontrado. Instale o OpenSSL para continuar."
        exit 1
    fi
    
    # Executar configuração
    setup_directories
    backup_existing_secrets
    
    generate_database_secrets
    generate_redis_secrets
    generate_jwt_secrets
    generate_minio_secrets
    generate_encryption_secrets
    generate_session_secrets
    generate_email_secrets
    generate_grafana_secrets
    
    validate_secrets
    show_summary
    
    log_success "✅ Configuração de Docker Secrets concluída com sucesso!"
}

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi