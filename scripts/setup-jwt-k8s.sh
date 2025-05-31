#!/bin/bash

# Script para automatizar a configuração de chaves JWT no Kubernetes
# Este script gera as chaves JWT e configura automaticamente os Secrets do Kubernetes

set -e  # Sair em caso de erro

# Configurações
NAMESPACE="default"
SECRET_NAME="pgben-jwt-secrets"
KEY_SIZE="2048"
TEMP_DIR="/tmp/jwt-keys-$$"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para limpeza
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log_info "Diretório temporário removido"
    fi
}

# Configurar trap para limpeza
trap cleanup EXIT

# Função para verificar dependências
check_dependencies() {
    log_info "Verificando dependências..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl não encontrado. Instale o kubectl primeiro."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale o Node.js primeiro."
        exit 1
    fi
    
    # Verificar se kubectl está conectado ao cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Não foi possível conectar ao cluster Kubernetes."
        exit 1
    fi
    
    log_success "Todas as dependências estão disponíveis"
}

# Função para processar argumentos
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -s|--secret-name)
                SECRET_NAME="$2"
                shift 2
                ;;
            -k|--key-size)
                KEY_SIZE="$2"
                shift 2
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Argumento desconhecido: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Função para exibir ajuda
show_help() {
    cat << EOF
🔐 Script de Configuração Automática de JWT para Kubernetes

Uso: $0 [opções]

Opções:
  -n, --namespace NAMESPACE     Namespace do Kubernetes (padrão: default)
  -s, --secret-name NAME        Nome do Secret (padrão: pgben-jwt-secrets)
  -k, --key-size SIZE           Tamanho da chave RSA (padrão: 2048)
  --force                       Força a recriação do Secret se já existir
  -h, --help                    Exibe esta ajuda

Exemplos:
  $0                                    # Configuração padrão
  $0 -n pgben-prod                      # Namespace específico
  $0 -k 4096 --force                    # Chave 4096 bits, força recriação
  $0 -n pgben-prod -s jwt-keys          # Namespace e nome do Secret customizados

Este script:
1. Gera chaves JWT RSA automaticamente
2. Cria ou atualiza o Secret do Kubernetes
3. Configura as variáveis de ambiente necessárias
4. Valida a configuração

EOF
}

# Função para verificar se o namespace existe
check_namespace() {
    log_info "Verificando namespace '$NAMESPACE'..."
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' não existe. Criando..."
        kubectl create namespace "$NAMESPACE"
        log_success "Namespace '$NAMESPACE' criado"
    else
        log_success "Namespace '$NAMESPACE' existe"
    fi
}

# Função para verificar se o Secret já existe
check_existing_secret() {
    if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &> /dev/null; then
        if [ "$FORCE" = true ]; then
            log_warning "Secret '$SECRET_NAME' já existe. Removendo devido ao --force..."
            kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE"
            log_success "Secret removido"
            return 1
        else
            log_warning "Secret '$SECRET_NAME' já existe no namespace '$NAMESPACE'"
            echo "Deseja sobrescrever? (y/N): "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE"
                log_success "Secret removido"
                return 1
            else
                log_info "Operação cancelada"
                exit 0
            fi
        fi
    fi
    return 1
}

# Função para gerar chaves JWT
generate_jwt_keys() {
    log_info "Gerando chaves JWT RSA de $KEY_SIZE bits..."
    
    # Criar diretório temporário
    mkdir -p "$TEMP_DIR"
    
    # Gerar chaves usando o script existente
    cd "$(dirname "$0")/.."
    
    # Executar o script de geração com output em base64
    node scripts/gerar-chaves-jwt.js --output-format=base64 --key-size="$KEY_SIZE" > "$TEMP_DIR/keys_output.txt"
    
    # Extrair as chaves base64 do output
    PRIVATE_KEY_B64=$(grep -A 1 "private.key:" "$TEMP_DIR/keys_output.txt" | tail -1 | xargs)
    PUBLIC_KEY_B64=$(grep -A 1 "public.key:" "$TEMP_DIR/keys_output.txt" | tail -1 | xargs)
    
    if [ -z "$PRIVATE_KEY_B64" ] || [ -z "$PUBLIC_KEY_B64" ]; then
        log_error "Falha ao extrair chaves do output"
        exit 1
    fi
    
    log_success "Chaves JWT geradas com sucesso"
}

# Função para criar o Secret do Kubernetes
create_k8s_secret() {
    log_info "Criando Secret '$SECRET_NAME' no namespace '$NAMESPACE'..."
    
    # Criar o Secret com as chaves
    kubectl create secret generic "$SECRET_NAME" \
        --from-literal=jwt-private-key="$PRIVATE_KEY_B64" \
        --from-literal=jwt-public-key="$PUBLIC_KEY_B64" \
        --namespace="$NAMESPACE"
    
    # Adicionar labels para identificação
    kubectl label secret "$SECRET_NAME" \
        app=pgben-server \
        component=jwt-keys \
        managed-by=setup-script \
        --namespace="$NAMESPACE"
    
    log_success "Secret '$SECRET_NAME' criado com sucesso"
}

# Função para validar o Secret criado
validate_secret() {
    log_info "Validando Secret criado..."
    
    # Verificar se o Secret existe e tem as chaves
    if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.jwt-private-key}' &> /dev/null; then
        log_error "Chave privada não encontrada no Secret"
        exit 1
    fi
    
    if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.jwt-public-key}' &> /dev/null; then
        log_error "Chave pública não encontrada no Secret"
        exit 1
    fi
    
    log_success "Secret validado com sucesso"
}

# Função para exibir instruções de configuração
show_configuration_instructions() {
    log_info "Configuração concluída! Instruções para uso:"
    
    echo ""
    echo "📝 CONFIGURAÇÃO DO DEPLOYMENT:"
    echo "Adicione as seguintes variáveis de ambiente ao seu deployment.yaml:"
    echo ""
    echo "        - name: JWT_PRIVATE_KEY"
    echo "          valueFrom:"
    echo "            secretKeyRef:"
    echo "              name: $SECRET_NAME"
    echo "              key: jwt-private-key"
    echo "        - name: JWT_PUBLIC_KEY"
    echo "          valueFrom:"
    echo "            secretKeyRef:"
    echo "              name: $SECRET_NAME"
    echo "              key: jwt-public-key"
    echo "        - name: JWT_ALGORITHM"
    echo "          value: \"RS256\""
    echo "        - name: JWT_ACCESS_TOKEN_EXPIRES_IN"
    echo "          value: \"1h\""
    echo "        - name: JWT_REFRESH_TOKEN_EXPIRES_IN"
    echo "          value: \"7d\""
    echo ""
    echo "🔍 VERIFICAR SECRET:"
    echo "kubectl get secret $SECRET_NAME -n $NAMESPACE -o yaml"
    echo ""
    echo "🗑️  REMOVER SECRET (se necessário):"
    echo "kubectl delete secret $SECRET_NAME -n $NAMESPACE"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "- As chaves são geradas automaticamente a cada execução"
    echo "- Mantenha backup das chaves se necessário"
    echo "- Considere rotação periódica das chaves"
    echo "- Use RBAC para controlar acesso ao Secret"
}

# Função principal
main() {
    echo "🔐 Configuração Automática de JWT para Kubernetes"
    echo "================================================="
    echo ""
    
    parse_args "$@"
    check_dependencies
    check_namespace
    check_existing_secret
    generate_jwt_keys
    create_k8s_secret
    validate_secret
    show_configuration_instructions
    
    echo ""
    log_success "Configuração automática concluída com sucesso!"
}

# Executar função principal
main "$@"