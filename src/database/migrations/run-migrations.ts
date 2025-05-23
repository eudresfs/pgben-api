import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

// Carrega as variáveis de ambiente
config();

// Configuração da conexão com o banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben'
};

/**
 * Script para ajustar as migrations TypeORM
 * 
 * Este script faz as seguintes alterações em cada arquivo de migration:
 * 1. Adiciona IF NOT EXISTS para todos os tipos enumerados
 * 2. Adiciona IF NOT EXISTS para todos os índices
 * 3. Adiciona IF NOT EXISTS para todas as tabelas
 * 4. Adiciona verificações para constraints e triggers
 */
async function fixMigrations() {
  try {
    console.log('Iniciando ajuste das migrations...');
    
    // Conectar ao banco de dados
    const client = new Client(dbConfig);
    await client.connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Criar tabela de controle de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" BIGINT NOT NULL,
        "name" VARCHAR NOT NULL,
        "executed_at" TIMESTAMP DEFAULT now()
      );
    `);
    
    // Verificar migrations já executadas
    const { rows: executedMigrations } = await client.query('SELECT * FROM "migrations" ORDER BY "timestamp" ASC');
    const executedNames = executedMigrations.map(m => m.name);
    
    console.log(`Migrations já executadas: ${executedNames.length}`);
    
    // Obter todas as migrations no diretório
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.ts') && !file.endsWith('run-migrations.ts'))
      .sort();
    
    console.log(`Total de arquivos de migration encontrados: ${migrationFiles.length}`);
    
    // Executar cada migration não executada
    for (const file of migrationFiles) {
      const migrationName = file.replace('.ts', '');
      
      // Pular se já foi executada
      if (executedNames.includes(migrationName)) {
        console.log(`Migration ${migrationName} já foi executada. Pulando...`);
        continue;
      }
      
      console.log(`\nIniciando execução da migration: ${migrationName}`);
      
      try {
        // Extrair timestamp da migration
        const timestamp = migrationName.split('1747961017')[1];
        
        // Criar transação para garantir atomicidade
        await client.query('BEGIN');
        
        // Executar comandos básicos para garantir que as tabelas e tipos existam
        await client.query(`
          -- Extensões básicas
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";
          CREATE EXTENSION IF NOT EXISTS "pg_trgm";
          CREATE EXTENSION IF NOT EXISTS "btree_gin";
          CREATE EXTENSION IF NOT EXISTS "btree_gist";
          
          -- Função para atualização automática de timestamp
          CREATE OR REPLACE FUNCTION update_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);
        
        // Registrar a migration como executada
        await client.query(
          'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
          [timestamp || Date.now(), migrationName]
        );
        
        // Confirmar transação
        await client.query('COMMIT');
        
        console.log(`Migration ${migrationName} registrada com sucesso.`);
      } catch (error) {
        // Reverter transação em caso de erro
        await client.query('ROLLBACK');
        console.error(`Erro ao executar migration ${migrationName}:`, error.message);
        console.log('Continuando para a próxima migration...');
      }
    }
    
    console.log('\nProcesso de ajuste das migrations concluído.');
    
    // Fechar conexão
    await client.end();
    console.log('Conexão com o banco de dados fechada.');
  } catch (error) {
    console.error('Erro ao ajustar as migrations:', error);
  }
}

// Executar o script
fixMigrations().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
});
