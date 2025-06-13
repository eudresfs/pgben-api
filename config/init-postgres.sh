#!/bin/bash
set -e

# Criar database se nao existir
psql -v ON_ERROR_STOP=1 --username "" --dbname "" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS pgben;
    GRANT ALL PRIVILEGES ON DATABASE pgben TO ;
EOSQL

echo "Database pgben criado com sucesso"
