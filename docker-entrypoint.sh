#!/bin/sh
set -e

echo "🔍 Verificando conexão com PostgreSQL..."
until nc -z ${DB_HOST:-177.39.21.28} ${DB_PORT:-45250}; do
  echo "⏳ PostgreSQL não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ PostgreSQL está disponível!"

echo "🔍 Verificando conexão com Redis..."
until nc -z ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379}; do
  echo "⏳ Redis não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ Redis está disponível!"

echo "🔍 Verificando conexão com MinIO..."
until nc -z ${MINIO_ENDPOINT:-localhost} ${MINIO_PORT:-9000}; do
  echo "⏳ MinIO não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ MinIO está disponível!"

# Gerar chaves JWT se não existirem
if [ ! -f "keys/private.key" ] || [ ! -f "keys/public.key" ]; then
  echo "🔑 Gerando chaves JWT..."
  mkdir -p keys
  npm run jwt:generate || { echo "❌ Falha na geração das chaves JWT!"; exit 1; }
  echo "✅ Chaves JWT geradas com sucesso!"
else
  echo "✅ Chaves JWT já existem!"
fi



echo "🚀 Iniciando a aplicação PGBen-server..."
exec node dist/main
