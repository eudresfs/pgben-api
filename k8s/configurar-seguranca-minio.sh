#!/bin/bash
# Script para configurar a segurança do MinIO para o PGBen
# Autor: Equipe PGBen
# Data: 14/05/2025

set -e

# Configurações
NAMESPACE="pgben"
MINIO_POD=$(kubectl get pods -n $NAMESPACE -l app=minio -o jsonpath='{.items[0].metadata.name}')
MINIO_ENDPOINT="https://minio.pgben.local"
MINIO_ACCESS_KEY=$(kubectl get secret -n $NAMESPACE pgben-minio-credentials -o jsonpath='{.data.MINIO_ACCESS_KEY}' | base64 --decode)
MINIO_SECRET_KEY=$(kubectl get secret -n $NAMESPACE pgben-minio-credentials -o jsonpath='{.data.MINIO_SECRET_KEY}' | base64 --decode)
BUCKET_NAME="pgben-documentos"
LOG_FILE="/var/log/pgben/minio-security-config.log"

# Funções auxiliares
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Verifica se o kubectl está instalado
if ! command -v kubectl &> /dev/null; then
  log "ERRO: kubectl não encontrado. Por favor, instale o kubectl."
  exit 1
fi

# Verifica se o namespace existe
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
  log "ERRO: Namespace $NAMESPACE não encontrado."
  exit 1
fi

# Verifica se o pod do MinIO está em execução
if [ -z "$MINIO_POD" ]; then
  log "ERRO: Pod do MinIO não encontrado no namespace $NAMESPACE."
  exit 1
fi

log "Iniciando configuração de segurança do MinIO no namespace $NAMESPACE"

# 1. Aplicar configurações de criptografia
log "Aplicando configurações de criptografia em repouso..."
kubectl apply -f minio-encryption-config.yaml -n $NAMESPACE
log "Configurações de criptografia aplicadas com sucesso"

# 2. Aplicar configurações de auditoria
log "Aplicando configurações de auditoria..."
kubectl apply -f minio-audit-config.yaml -n $NAMESPACE
log "Configurações de auditoria aplicadas com sucesso"

# 3. Criar bucket se não existir
log "Verificando se o bucket $BUCKET_NAME existe..."
if ! kubectl exec -n $NAMESPACE $MINIO_POD -- mc ls minio/$BUCKET_NAME &> /dev/null; then
  log "Criando bucket $BUCKET_NAME..."
  kubectl exec -n $NAMESPACE $MINIO_POD -- mc mb minio/$BUCKET_NAME
  log "Bucket $BUCKET_NAME criado com sucesso"
else
  log "Bucket $BUCKET_NAME já existe"
fi

# 4. Habilitar versionamento no bucket
log "Habilitando versionamento no bucket $BUCKET_NAME..."
kubectl exec -n $NAMESPACE $MINIO_POD -- mc version enable minio/$BUCKET_NAME
log "Versionamento habilitado com sucesso"

# 5. Aplicar políticas de acesso
log "Aplicando políticas de acesso..."
kubectl cp minio-policies.json $NAMESPACE/$MINIO_POD:/tmp/minio-policies.json
kubectl exec -n $NAMESPACE $MINIO_POD -- mc admin policy add minio pgben-policy /tmp/minio-policies.json
log "Políticas de acesso aplicadas com sucesso"

# 6. Aplicar políticas de ciclo de vida
log "Aplicando políticas de ciclo de vida..."
kubectl cp minio-lifecycle.json $NAMESPACE/$MINIO_POD:/tmp/minio-lifecycle.json
kubectl exec -n $NAMESPACE $MINIO_POD -- mc ilm import minio/$BUCKET_NAME < /tmp/minio-lifecycle.json
log "Políticas de ciclo de vida aplicadas com sucesso"

# 7. Configurar criptografia no lado do servidor para o bucket
log "Configurando criptografia no lado do servidor para o bucket $BUCKET_NAME..."
kubectl exec -n $NAMESPACE $MINIO_POD -- mc encrypt set sse-s3 minio/$BUCKET_NAME
log "Criptografia no lado do servidor configurada com sucesso"

# 8. Configurar notificações de eventos para auditoria
log "Configurando notificações de eventos para auditoria..."
kubectl exec -n $NAMESPACE $MINIO_POD -- mc event add minio/$BUCKET_NAME arn:minio:sqs::audit:webhook --event put,get,delete --suffix .pdf,.docx,.xlsx
log "Notificações de eventos configuradas com sucesso"

# 9. Configurar WORM (Write Once Read Many) para documentos legais
log "Configurando WORM para documentos legais..."
kubectl exec -n $NAMESPACE $MINIO_POD -- mc retention set --default compliance 5y minio/$BUCKET_NAME/legal/
log "WORM configurado com sucesso"

# 10. Reiniciar o MinIO para aplicar todas as configurações
log "Reiniciando o MinIO para aplicar todas as configurações..."
kubectl rollout restart deployment minio -n $NAMESPACE
log "MinIO reiniciado com sucesso"

log "Configuração de segurança do MinIO concluída com sucesso"
log "Próximos passos: Verificar as configurações e realizar testes de segurança"
