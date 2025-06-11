#!/bin/sh
set -e

# Verificar se as variáveis de ambiente obrigatórias estão definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ] || [ -z "$DB_NAME" ]; then
  echo "❌ Erro: Variáveis de ambiente do banco de dados não estão definidas corretamente"
  echo "Por favor, verifique as seguintes variáveis no seu arquivo .env:"
  echo "- DB_HOST"
  echo "- DB_PORT"
  echo "- DB_USER"
  echo "- DB_PASS"
  echo "- DB_NAME"
  exit 1
fi

echo "🔍 Verificando conexão com PostgreSQL em $DB_HOST:$DB_PORT..."
until nc -z $DB_HOST $DB_PORT; do
  echo "⏳ PostgreSQL não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ PostgreSQL está disponível!"

echo "🔍 Verificando conexão com Redis ${REDIS_HOST:-redis}:${REDIS_PORT:-6379}..."
until nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  echo "⏳ Redis não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ Redis está disponível!"

echo "🔍 Verificando conexão com MinIO ${MINIO_ENDPOINT:-minio}:${MINIO_PORT:-9000}..."
until nc -z ${MINIO_ENDPOINT:-minio} ${MINIO_PORT:-9000}; do
  echo "⏳ MinIO não está disponível ainda - aguardando..."
  sleep 2
done
echo "✅ MinIO está disponível!"

# Instalar dependências novamente se houver alterações
if [ -f package.json ]; then
  echo "📦 Verificando dependências..."
  npm install
  echo "✅ Dependências atualizadas!"
fi


echo "🚀 Iniciando a aplicação PGBen-server em modo de desenvolvimento com hot reload..."
echo "🔄 O servidor será reiniciado automaticamente quando detectar alterações nos arquivos..."

# Executar o comando passado como argumento ou o padrão
exec "$@"
