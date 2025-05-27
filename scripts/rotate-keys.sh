#!/bin/bash

# Script de Rotação de Chaves JWT - Sistema SEMTAS
# Executa rotação manual das chaves RSA a cada 30 dias
# Autor: Tech Lead SEMTAS
# Data: $(date +%Y-%m-%d)

set -e  # Parar execução em caso de erro

# Configurações
KEYS_DIR="keys"
BACKUP_DIR="keys/backup"
LOG_FILE="logs/key-rotation.log"
KEY_SIZE=2048
DATE=$(date +%Y%m%d_%H%M%S)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função para exibir mensagens coloridas
echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

# Verificar se o OpenSSL está instalado
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        echo_error "OpenSSL não está instalado. Instale o OpenSSL para continuar."
        exit 1
    fi
    echo_success "OpenSSL encontrado: $(openssl version)"
}

# Criar diretórios necessários
setup_directories() {
    mkdir -p "$KEYS_DIR" "$BACKUP_DIR" "logs"
    echo_success "Diretórios criados/verificados"
}

# Fazer backup das chaves atuais
backup_current_keys() {
    if [[ -f "$KEYS_DIR/private.pem" && -f "$KEYS_DIR/public.pem" ]]; then
        cp "$KEYS_DIR/private.pem" "$BACKUP_DIR/private_${DATE}.pem"
        cp "$KEYS_DIR/public.pem" "$BACKUP_DIR/public_${DATE}.pem"
        echo_success "Backup das chaves atuais criado em $BACKUP_DIR"
    else
        echo_warning "Chaves atuais não encontradas. Primeira execução?"
    fi
}

# Gerar novas chaves RSA
generate_new_keys() {
    echo "🔄 Gerando novas chaves RSA de $KEY_SIZE bits..."
    
    # Gerar chave privada
    if openssl genrsa -out "$KEYS_DIR/private.pem" $KEY_SIZE 2>/dev/null; then
        echo_success "Chave privada gerada"
    else
        echo_error "Falha ao gerar chave privada"
        exit 1
    fi
    
    # Gerar chave pública
    if openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem" 2>/dev/null; then
        echo_success "Chave pública gerada"
    else
        echo_error "Falha ao gerar chave pública"
        exit 1
    fi
}

# Validar chaves geradas
validate_keys() {
    echo "🔍 Validando chaves geradas..."
    
    # Verificar se os arquivos existem
    if [[ ! -f "$KEYS_DIR/private.pem" || ! -f "$KEYS_DIR/public.pem" ]]; then
        echo_error "Arquivos de chave não encontrados"
        exit 1
    fi
    
    # Verificar formato da chave privada
    if openssl rsa -in "$KEYS_DIR/private.pem" -check -noout 2>/dev/null; then
        echo_success "Chave privada válida"
    else
        echo_error "Chave privada inválida"
        exit 1
    fi
    
    # Verificar formato da chave pública
    if openssl rsa -in "$KEYS_DIR/public.pem" -pubin -text -noout 2>/dev/null >/dev/null; then
        echo_success "Chave pública válida"
    else
        echo_error "Chave pública inválida"
        exit 1
    fi
}

# Definir permissões seguras
set_permissions() {
    chmod 600 "$KEYS_DIR/private.pem"  # Apenas proprietário pode ler/escrever
    chmod 644 "$KEYS_DIR/public.pem"   # Proprietário pode ler/escrever, outros apenas ler
    echo_success "Permissões de segurança aplicadas"
}

# Limpar backups antigos (manter apenas últimos 5)
cleanup_old_backups() {
    local backup_count=$(ls -1 "$BACKUP_DIR"/private_*.pem 2>/dev/null | wc -l)
    
    if [[ $backup_count -gt 5 ]]; then
        echo "🧹 Limpando backups antigos (mantendo últimos 5)..."
        ls -1t "$BACKUP_DIR"/private_*.pem | tail -n +6 | xargs rm -f
        ls -1t "$BACKUP_DIR"/public_*.pem | tail -n +6 | xargs rm -f
        echo_success "Backups antigos removidos"
    fi
}

# Exibir informações das chaves
show_key_info() {
    echo ""
    echo "📋 Informações das Novas Chaves:"
    echo "================================"
    echo "Data de Geração: $(date)"
    echo "Tamanho da Chave: $KEY_SIZE bits"
    echo "Localização: $KEYS_DIR/"
    echo "Backup: $BACKUP_DIR/"
    
    # Mostrar fingerprint da chave pública
    local fingerprint=$(openssl rsa -in "$KEYS_DIR/public.pem" -pubin -outform DER 2>/dev/null | openssl dgst -sha256 -hex | cut -d' ' -f2)
    echo "Fingerprint SHA256: $fingerprint"
    echo ""
}

# Função principal
main() {
    echo "🔐 Iniciando Rotação de Chaves JWT - Sistema SEMTAS"
    echo "===================================================="
    echo ""
    
    # Verificar se está sendo executado do diretório correto
    if [[ ! -f "package.json" ]]; then
        echo_error "Execute este script a partir do diretório raiz do projeto"
        exit 1
    fi
    
    # Executar etapas
    check_openssl
    setup_directories
    backup_current_keys
    generate_new_keys
    validate_keys
    set_permissions
    cleanup_old_backups
    show_key_info
    
    echo_success "Rotação de chaves concluída com sucesso!"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   1. Reinicie a aplicação para carregar as novas chaves"
    echo "   2. Todos os tokens JWT existentes serão invalidados"
    echo "   3. Usuários precisarão fazer login novamente"
    echo "   4. Verifique os logs da aplicação após o restart"
    echo ""
    echo "📅 Próxima rotação recomendada: $(date -d '+30 days' '+%Y-%m-%d')"
}

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi