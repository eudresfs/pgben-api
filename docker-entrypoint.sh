#!/bin/sh
set -e

echo "🔍 Verificando conexão com PostgreSQL..."
until nc -z ${DATABASE_HOST:-postgres} ${DATABASE_PORT:-5432}; do
  echo "⏳ PostgreSQL não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ PostgreSQL está disponível!"

echo "🔍 Verificando conexão com Redis..."
until nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  echo "⏳ Redis não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ Redis está disponível!"

echo "🔍 Verificando conexão com MinIO..."
until nc -z ${MINIO_ENDPOINT:-minio} ${MINIO_PORT:-9000}; do
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

# Executar migrações do banco de dados
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "🔄 Executando migrações de banco de dados..."
  npm run migration:run || { echo "❌ Falha nas migrações!"; exit 1; }
  echo "✅ Migrações concluídas com sucesso!"
fi

# Executar seeds iniciais se configurado
if [ "${RUN_SEEDS:-false}" = "true" ]; then
  echo "🌱 Executando seeds do banco de dados..."
  npm run seed:run || { echo "❌ Falha nos seeds!"; exit 1; }
  echo "✅ Seeds concluídos com sucesso!"
fi

echo "🚀 Iniciando a aplicação PGBen-server..."
exec node dist/main
