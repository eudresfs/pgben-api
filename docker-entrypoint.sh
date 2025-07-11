#!/bin/sh
set -e

# Função para verificar conexão com timeout
check_connection() {
  local host=$1
  local port=$2
  local service=$3
  local max_attempts=${4:-60}  # 2 minutos por padrão (60 * 2s)
  local attempt=1

  echo "🔍 Verificando conexão com ${service}..."
  while [ $attempt -le $max_attempts ]; do
    if nc -z -w 5 $host $port; then
      echo "✅ ${service} está disponível!"
      return 0
    fi
    echo "⏳ ${service} não está disponível ainda - tentativa ${attempt}/${max_attempts} - aguardando..."
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

# Verificar PostgreSQL (falha se indisponível)
check_connection ${DB_HOST:-177.39.21.28} ${DB_PORT:-45250} "PostgreSQL" 90 || exit 1

# Verificar Redis (continua mesmo se indisponível)
check_connection ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379} "Redis" 30

# Verificar MinIO (continua mesmo se indisponível)
check_connection ${MINIO_ENDPOINT:-localhost} ${MINIO_PORT:-9000} "MinIO" 30

# Gerar chaves JWT se não existirem
# if [ ! -f "keys/private.key" ] || [ ! -f "keys/public.key" ]; then
#  echo "🔑 Gerando chaves JWT..."
#  mkdir -p keys
#  npm run jwt:generate || { echo "❌ Falha na geração das chaves JWT!"; exit 1; }
#  echo "✅ Chaves JWT geradas com sucesso!"
# else
#  echo "✅ Chaves JWT já existem!"
# fi

echo "🚀 Iniciando a aplicação PGBen-server..."
exec node dist/main
