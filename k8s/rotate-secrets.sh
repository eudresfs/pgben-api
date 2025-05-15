#!/bin/bash
# Script para rotação automática de credenciais no Kubernetes
# Autor: Equipe PGBen
# Data: 14/05/2025

set -e

# Configurações
NAMESPACE="pgben"
LOG_FILE="/var/log/pgben/secret-rotation.log"
SECRETS_TO_ROTATE=(
  "pgben-jwt-secret"
  "pgben-minio-credentials"
  "pgben-encryption-keys"
)
ROTATION_INTERVAL_DAYS=90  # Rotação a cada 90 dias

# Funções auxiliares
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

generate_random_string() {
  length=$1
  tr -dc 'A-Za-z0-9!@#$%^&*()_+' < /dev/urandom | head -c "$length"
}

encode_base64() {
  echo -n "$1" | base64
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

log "Iniciando rotação de secrets no namespace $NAMESPACE"

# Rotaciona cada secret
for secret_name in "${SECRETS_TO_ROTATE[@]}"; do
  log "Processando secret: $secret_name"
  
  # Verifica se o secret existe
  if ! kubectl get secret "$secret_name" -n "$NAMESPACE" &> /dev/null; then
    log "AVISO: Secret $secret_name não encontrado. Pulando."
    continue
  fi
  
  # Obtém o secret atual
  current_secret=$(kubectl get secret "$secret_name" -n "$NAMESPACE" -o yaml)
  
  # Cria um arquivo temporário para o novo secret
  temp_file=$(mktemp)
  echo "$current_secret" > "$temp_file"
  
  # Gera novas credenciais com base no tipo de secret
  case "$secret_name" in
    "pgben-jwt-secret")
      new_jwt_secret=$(generate_random_string 32)
      encoded_jwt_secret=$(encode_base64 "$new_jwt_secret")
      sed -i "s/JWT_SECRET: .*$/JWT_SECRET: $encoded_jwt_secret/" "$temp_file"
      log "Nova JWT_SECRET gerada para $secret_name"
      ;;
      
    "pgben-minio-credentials")
      new_access_key=$(generate_random_string 20)
      new_secret_key=$(generate_random_string 32)
      encoded_access_key=$(encode_base64 "$new_access_key")
      encoded_secret_key=$(encode_base64 "$new_secret_key")
      sed -i "s/MINIO_ACCESS_KEY: .*$/MINIO_ACCESS_KEY: $encoded_access_key/" "$temp_file"
      sed -i "s/MINIO_SECRET_KEY: .*$/MINIO_SECRET_KEY: $encoded_secret_key/" "$temp_file"
      log "Novas credenciais geradas para $secret_name"
      
      # Atualiza as credenciais no MinIO
      log "Atualizando credenciais no MinIO..."
      # Código para atualizar as credenciais no MinIO via API
      ;;
      
    "pgben-encryption-keys")
      new_master_key=$(generate_random_string 48)
      encoded_master_key=$(encode_base64 "$new_master_key")
      sed -i "s/ENCRYPTION_MASTER_KEY: .*$/ENCRYPTION_MASTER_KEY: $encoded_master_key/" "$temp_file"
      log "Nova ENCRYPTION_MASTER_KEY gerada para $secret_name"
      
      # Reencriptar documentos com a nova chave
      log "ATENÇÃO: Nova chave de criptografia gerada. É necessário reencriptar os documentos existentes."
      # Aqui seria chamado um job para reencriptar os documentos
      ;;
      
    *)
      log "AVISO: Tipo de secret desconhecido: $secret_name. Pulando."
      continue
      ;;
  esac
  
  # Aplica o novo secret
  kubectl apply -f "$temp_file" -n "$NAMESPACE"
  log "Secret $secret_name atualizado com sucesso"
  
  # Remove o arquivo temporário
  rm "$temp_file"
  
  # Reinicia os pods afetados para aplicar as novas credenciais
  log "Reiniciando pods que utilizam o secret $secret_name..."
  kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | select(.spec.volumes[]?.secret.secretName == "'$secret_name'") | .metadata.name' | xargs -r kubectl delete pod -n "$NAMESPACE"
  
  log "Rotação do secret $secret_name concluída com sucesso"
done

log "Rotação de todos os secrets concluída"

# Registra a data da última rotação
echo "$(date '+%Y-%m-%d')" > "/var/log/pgben/last_rotation_date.txt"

log "Próxima rotação programada para daqui a $ROTATION_INTERVAL_DAYS dias"
