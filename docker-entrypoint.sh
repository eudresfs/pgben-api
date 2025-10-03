#!/bin/sh
set -e

# Função para verificar conexão com timeout REDUZIDO
check_connection() {
  local host=$1
  local port=$2
  local service=$3
  local max_attempts=${4:-15}  # REDUZIDO: 30 segundos (15 * 2s)
  local attempt=1

  echo "🔍 Verificando conexão com ${service}..."
  while [ $attempt -le $max_attempts ]; do
    if nc -z -w 2 $host $port 2>/dev/null; then  # Timeout reduzido para 2s
      echo "✅ ${service} está disponível!"
      return 0
    fi
    
    # Não loga todas as tentativas, apenas a cada 5
    if [ $((attempt % 5)) -eq 0 ]; then
      echo "⏳ ${service} - tentativa ${attempt}/${max_attempts}..."
    fi
    
    sleep 2
    attempt=$((attempt+1))
  done

  echo "⚠️ Aviso: Não foi possível conectar ao ${service} após ${max_attempts} tentativas."
  
  # Se for PostgreSQL, falha crítica
  if [ "$service" = "PostgreSQL" ]; then
    echo "❌ Falha crítica: PostgreSQL indisponível. Abortando inicialização."
    return 1
  fi
  
  # Para outros serviços, apenas avisa mas continua
  echo "⚠️ Continuando inicialização sem ${service}..."
  return 0
}

# Verificar PostgreSQL (OBRIGATÓRIO - mas com tentativas reduzidas)
# REDUZIDO: 30 tentativas = 1 minuto máximo
check_connection ${DB_HOST:-177.39.21.28} ${DB_PORT:-5432} "PostgreSQL" 30 || exit 1

# Verificar Redis em PARALELO com MinIO (não bloqueia se falhar)
# REDUZIDO: 10 tentativas = 20 segundos máximo
(check_connection ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379} "Redis" 10 &)

# Verificar MinIO em PARALELO (não bloqueia se falhar)
# REDUZIDO: 10 tentativas = 20 segundos máximo  
(check_connection ${MINIO_ENDPOINT:-localhost} ${MINIO_PORT:-9000} "MinIO" 10 &)

# Aguarda os checks paralelos terminarem (máximo 20s)
wait

# Gerar chaves JWT se não existirem
if [ ! -f "keys/private.key" ] || [ ! -f "keys/public.key" ]; then
  echo "🔑 Gerando chaves JWT..."
  mkdir -p keys
  npm run jwt:generate || { 
    echo "❌ Falha na geração das chaves JWT!"
    exit 1
  }
  echo "✅ Chaves JWT geradas com sucesso!"
else
  echo "✅ Chaves JWT já existem!"
fi

echo "🚀 Iniciando a aplicação PGBen-server..."
exec node dist/main
