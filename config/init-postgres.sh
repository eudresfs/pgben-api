#!/bin/bash
set -e

# Criar database se nao existir
psql -v ON_ERROR_STOP=1 --username "" --dbname "" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS pgben_db;
    GRANT ALL PRIVILEGES ON DATABASE pgben_db TO ;
EOSQL

echo "Database pgben_db criado com sucesso"
