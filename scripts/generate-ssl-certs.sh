#!/bin/bash

# Script para gerar certificados SSL auto-assinados para desenvolvimento
# Sistema PGBEN - SEMTAS

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configurações
SSL_DIR="./ssl"
COUNTRY="BR"
STATE="Pernambuco"
CITY="Recife"
ORGANIZATION="SEMTAS"
ORGANIZATIONAL_UNIT="TI"
COMMON_NAME="pgben.semtas.local"
EMAIL="admin@semtas.local"
DAYS=365

# Domínios adicionais para SAN (Subject Alternative Names)
SAN_DOMAINS=(
    "pgben.semtas.local"
    "grafana.pgben.semtas.local"
    "prometheus.pgben.semtas.local"
    "localhost"
    "127.0.0.1"
)

# Função para verificar dependências
check_dependencies() {
    log_info "Verificando dependências..."
    
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL não está instalado. Por favor, instale o OpenSSL."
        exit 1
    fi
    
    log_success "Dependências verificadas com sucesso."
}

# Função para criar diretório SSL
create_ssl_directory() {
    log_info "Criando diretório SSL..."
    
    if [ -d "$SSL_DIR" ]; then
        log_warning "Diretório SSL já existe. Fazendo backup..."
        mv "$SSL_DIR" "${SSL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    mkdir -p "$SSL_DIR"
    log_success "Diretório SSL criado: $SSL_DIR"
}

# Função para gerar arquivo de configuração OpenSSL
generate_openssl_config() {
    log_info "Gerando arquivo de configuração OpenSSL..."
    
    cat > "$SSL_DIR/openssl.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORGANIZATION
OU = $ORGANIZATIONAL_UNIT
CN = $COMMON_NAME
emailAddress = $EMAIL

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
EOF

    # Adicionar SANs
    local counter=1
    for domain in "${SAN_DOMAINS[@]}"; do
        if [[ $domain =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "IP.$counter = $domain" >> "$SSL_DIR/openssl.cnf"
        else
            echo "DNS.$counter = $domain" >> "$SSL_DIR/openssl.cnf"
        fi
        ((counter++))
    done
    
    log_success "Arquivo de configuração OpenSSL gerado."
}

# Função para gerar chave privada
generate_private_key() {
    log_info "Gerando chave privada..."
    
    openssl genrsa -out "$SSL_DIR/pgben.key" 2048
    chmod 600 "$SSL_DIR/pgben.key"
    
    log_success "Chave privada gerada: $SSL_DIR/pgben.key"
}

# Função para gerar CSR (Certificate Signing Request)
generate_csr() {
    log_info "Gerando CSR (Certificate Signing Request)..."
    
    openssl req -new \
        -key "$SSL_DIR/pgben.key" \
        -out "$SSL_DIR/pgben.csr" \
        -config "$SSL_DIR/openssl.cnf"
    
    log_success "CSR gerado: $SSL_DIR/pgben.csr"
}

# Função para gerar certificado auto-assinado
generate_certificate() {
    log_info "Gerando certificado auto-assinado..."
    
    openssl x509 -req \
        -in "$SSL_DIR/pgben.csr" \
        -signkey "$SSL_DIR/pgben.key" \
        -out "$SSL_DIR/pgben.crt" \
        -days $DAYS \
        -extensions v3_req \
        -extfile "$SSL_DIR/openssl.cnf"
    
    log_success "Certificado gerado: $SSL_DIR/pgben.crt"
}

# Função para gerar certificado PEM (combinado)
generate_pem_certificate() {
    log_info "Gerando certificado PEM combinado..."
    
    cat "$SSL_DIR/pgben.crt" "$SSL_DIR/pgben.key" > "$SSL_DIR/pgben.pem"
    chmod 600 "$SSL_DIR/pgben.pem"
    
    log_success "Certificado PEM gerado: $SSL_DIR/pgben.pem"
}

# Função para verificar certificado
verify_certificate() {
    log_info "Verificando certificado gerado..."
    
    echo "Informações do certificado:"
    openssl x509 -in "$SSL_DIR/pgben.crt" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:)"
    
    echo ""
    echo "Verificação da chave privada:"
    openssl rsa -in "$SSL_DIR/pgben.key" -check -noout
    
    echo ""
    echo "Verificação da correspondência entre chave e certificado:"
    cert_hash=$(openssl x509 -noout -modulus -in "$SSL_DIR/pgben.crt" | openssl md5)
    key_hash=$(openssl rsa -noout -modulus -in "$SSL_DIR/pgben.key" | openssl md5)
    
    if [ "$cert_hash" = "$key_hash" ]; then
        log_success "Chave privada e certificado correspondem."
    else
        log_error "Chave privada e certificado NÃO correspondem!"
        exit 1
    fi
}

# Função para exibir instruções de uso
show_usage_instructions() {
    log_info "Instruções de uso:"
    
    echo ""
    echo "Arquivos gerados em $SSL_DIR/:"
    echo "  - pgben.key: Chave privada"
    echo "  - pgben.crt: Certificado público"
    echo "  - pgben.csr: Certificate Signing Request"
    echo "  - pgben.pem: Certificado combinado (chave + certificado)"
    echo "  - openssl.cnf: Configuração OpenSSL usada"
    
    echo ""
    echo "Para usar com Docker Compose:"
    echo "  docker-compose -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d"
    
    echo ""
    echo "Para adicionar o certificado como confiável no sistema:"
    echo "  - Linux: sudo cp $SSL_DIR/pgben.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates"
    echo "  - macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $SSL_DIR/pgben.crt"
    echo "  - Windows: Importar $SSL_DIR/pgben.crt no 'Trusted Root Certification Authorities'"
    
    echo ""
    echo "Para testar o certificado:"
    echo "  openssl s_client -connect pgben.semtas.local:443 -servername pgben.semtas.local"
    
    echo ""
    log_warning "IMPORTANTE: Este é um certificado auto-assinado para desenvolvimento."
    log_warning "Para produção, use certificados de uma CA confiável (Let's Encrypt, etc.)."
}

# Função principal
main() {
    echo "======================================"
    echo "  Gerador de Certificados SSL/TLS"
    echo "  Sistema PGBEN - SEMTAS"
    echo "======================================"
    echo ""
    
    check_dependencies
    create_ssl_directory
    generate_openssl_config
    generate_private_key
    generate_csr
    generate_certificate
    generate_pem_certificate
    verify_certificate
    
    echo ""
    log_success "Certificados SSL gerados com sucesso!"
    echo ""
    
    show_usage_instructions
}

# Executar função principal
main "$@"