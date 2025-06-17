#!/bin/bash

# Script de Deploy para Kubernetes - PGBEN Server
# Este script automatiza o processo de deploy da aplicação no Kubernetes

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Verificar se kubectl está instalado
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl não está instalado. Por favor, instale o kubectl primeiro."
    exit 1
fi

# Verificar se estamos conectados a um cluster
if ! kubectl cluster-info &> /dev/null; then
    log_error "Não foi possível conectar ao cluster Kubernetes. Verifique sua configuração."
    exit 1
fi

# Variáveis
NAMESPACE=${NAMESPACE:-default}
IMAGE_TAG=${IMAGE_TAG:-latest}
IMAGE_NAME=${IMAGE_NAME:-pgben-server}
REGISTRY=${REGISTRY:-}

if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
else
    FULL_IMAGE_NAME="$IMAGE_NAME:$IMAGE_TAG"
fi

log "Iniciando deploy do PGBEN Server"
log "Namespace: $NAMESPACE"
log "Imagem: $FULL_IMAGE_NAME"

# Criar namespace se não existir
log "Verificando namespace..."
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log "Criando namespace $NAMESPACE..."
    kubectl create namespace "$NAMESPACE"
    log_success "Namespace $NAMESPACE criado"
else
    log_success "Namespace $NAMESPACE já existe"
fi

# Aplicar ConfigMap
log "Aplicando ConfigMap..."
kubectl apply -f configmap.yaml -n "$NAMESPACE"
log_success "ConfigMap aplicado"

# Aplicar Secrets (apenas se não existir)
log "Verificando Secrets..."
if ! kubectl get secret pgben-secrets -n "$NAMESPACE" &> /dev/null; then
    log_warning "Secret pgben-secrets não encontrado. Aplicando template..."
    log_warning "ATENÇÃO: Você deve atualizar os valores dos secrets antes do deploy em produção!"
    kubectl apply -f deployment.yaml -n "$NAMESPACE" --dry-run=client -o yaml | grep -A 20 "kind: Secret" | kubectl apply -f - -n "$NAMESPACE"
    log_success "Secret template aplicado"
else
    log_success "Secret pgben-secrets já existe"
fi

# Aplicar ServiceAccount e RBAC
log "Aplicando ServiceAccount e RBAC..."
kubectl apply -f pod-disruption-budget.yaml -n "$NAMESPACE"
log_success "ServiceAccount e RBAC aplicados"

# Aplicar Deployment
log "Aplicando Deployment..."
# Substituir a imagem no deployment
sed "s|image: pgben-server:latest|image: $FULL_IMAGE_NAME|g" deployment.yaml | kubectl apply -f - -n "$NAMESPACE"
log_success "Deployment aplicado"

# Aplicar Service
log "Aplicando Services..."
kubectl apply -f deployment.yaml -n "$NAMESPACE" --dry-run=client -o yaml | grep -A 15 "kind: Service" | kubectl apply -f - -n "$NAMESPACE"
kubectl apply -f service-monitor.yaml -n "$NAMESPACE"
log_success "Services aplicados"

# Aplicar HPA
log "Aplicando HorizontalPodAutoscaler..."
kubectl apply -f hpa.yaml -n "$NAMESPACE"
log_success "HPA aplicado"

# Aplicar PodDisruptionBudget
log "Aplicando PodDisruptionBudget..."
kubectl apply -f pod-disruption-budget.yaml -n "$NAMESPACE"
log_success "PDB aplicado"

# Aplicar NetworkPolicy
log "Aplicando NetworkPolicy..."
kubectl apply -f network-policy.yaml -n "$NAMESPACE"
log_success "NetworkPolicy aplicado"

# Aplicar ServiceMonitor (se Prometheus Operator estiver instalado)
log "Aplicando ServiceMonitor..."
if kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
    kubectl apply -f service-monitor.yaml -n "$NAMESPACE"
    log_success "ServiceMonitor aplicado"
else
    log_warning "Prometheus Operator não detectado. ServiceMonitor não aplicado."
fi

# Aplicar Ingress (opcional)
if [ -f "ingress.yaml" ]; then
    log "Aplicando Ingress..."
    kubectl apply -f ingress.yaml -n "$NAMESPACE"
    log_success "Ingress aplicado"
fi

# Aguardar deployment estar pronto
log "Aguardando deployment estar pronto..."
kubectl rollout status deployment/pgben-server -n "$NAMESPACE" --timeout=300s
log_success "Deployment está pronto"

# Verificar pods
log "Verificando status dos pods..."
kubectl get pods -l app=pgben-server -n "$NAMESPACE"

# Verificar services
log "Verificando services..."
kubectl get services -l app=pgben-server -n "$NAMESPACE"

# Verificar ingress (se existir)
if kubectl get ingress pgben-server-ingress -n "$NAMESPACE" &> /dev/null; then
    log "Verificando ingress..."
    kubectl get ingress pgben-server-ingress -n "$NAMESPACE"
fi

# Teste de health check
log "Testando health check..."
SERVICE_IP=$(kubectl get service pgben-server-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
if kubectl run test-pod --image=curlimages/curl --rm -i --restart=Never -- curl -f "http://$SERVICE_IP:80/v1/health" &> /dev/null; then
    log_success "Health check passou"
else
    log_warning "Health check falhou ou ainda não está disponível"
fi

log_success "Deploy concluído com sucesso!"
log "Para verificar os logs: kubectl logs -f deployment/pgben-server -n $NAMESPACE"
log "Para verificar o status: kubectl get all -l app=pgben-server -n $NAMESPACE"

# Informações úteis
echo ""
log "=== INFORMAÇÕES ÚTEIS ==="
log "Namespace: $NAMESPACE"
log "Deployment: pgben-server"
log "Service: pgben-server-service"
log "Pods: $(kubectl get pods -l app=pgben-server -n "$NAMESPACE" --no-headers | wc -l)"

if kubectl get ingress pgben-server-ingress -n "$NAMESPACE" &> /dev/null; then
    INGRESS_HOST=$(kubectl get ingress pgben-server-ingress -n "$NAMESPACE" -o jsonpath='{.spec.rules[0].host}')
    log "URL Externa: https://$INGRESS_HOST"
fi

log "Health Check: http://$SERVICE_IP:80/v1/health"
log "Metrics: http://$SERVICE_IP:80/api/v1/metrics"
log "Swagger: http://$SERVICE_IP:80/api/docs"

echo ""
log_success "Deploy finalizado! 🚀"