import { config } from 'dotenv';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

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

// Função para fazer backup do banco antes das alterações
async function fazerBackup() {
  console.log('📦 Fazendo backup do banco de dados...');
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.sql`;
    const backupPath = path.join(process.cwd(), backupFileName);
    
    // Usando o módulo child_process para executar pg_dump
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      exec(`pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${backupPath}`, 
        (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Erro ao fazer backup: ${error.message}`);
            reject(error);
            return;
          }
          console.log(`✅ Backup criado com sucesso: ${backupPath}`);
          resolve(backupPath);
        });
    });
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
    throw error;
  }
}

// Função para verificar os enums existentes no banco
async function verificarEnums() {
  console.log('🔍 Verificando enums existentes no banco...');
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const result = await client.query(`
      SELECT n.nspname, t.typname 
      FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typtype = 'e' AND n.nspname = 'public';
    `);
    
    console.log('Enums encontrados:');
    result.rows.forEach(row => {
      console.log(`- ${row.typname}`);
    });
    
    return result.rows.map(row => row.typname);
  } catch (error) {
    console.error('❌ Erro ao verificar enums:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Função para verificar as migrations já aplicadas
async function verificarMigrationsAplicadas() {
  console.log('🔍 Verificando migrations já aplicadas...');
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const result = await client.query(`
      SELECT * FROM migrations ORDER BY timestamp;
    `);
    
    console.log('Migrations aplicadas:');
    result.rows.forEach(row => {
      console.log(`- ${row.name} (${row.timestamp})`);
    });
    
    return result.rows.map(row => row.name);
  } catch (error) {
    if (error.code === '42P01') { // tabela não existe
      console.log('⚠️ Tabela de migrations não encontrada. Nenhuma migration aplicada ainda.');
      return [];
    }
    console.error('❌ Erro ao verificar migrations:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Função principal para executar as migrations
async function executarMigrations() {
  console.log('🚀 Iniciando processo de migração...');
  
  try {
    // 1. Fazer backup do banco
    await fazerBackup();
    
    // 2. Verificar enums existentes
    const enumsExistentes = await verificarEnums();
    console.log(`Total de enums encontrados: ${enumsExistentes.length}`);
    
    // 3. Verificar migrations aplicadas
    const migrationsAplicadas = await verificarMigrationsAplicadas();
    console.log(`Total de migrations aplicadas: ${migrationsAplicadas.length}`);
    
    // 4. Configurar DataSource para executar as migrations
    console.log('⚙️ Configurando DataSource para migrations...');
    const dataSource = new DataSource({
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: [],
      migrations: [
        process.env.NODE_ENV === 'production' 
          ? 'dist/database/migrations/**/*{.js}'
          : 'src/database/migrations/**/*{.ts}'
      ],
      migrationsTableName: 'migrations',
      synchronize: false,
      dropSchema: false,
      migrationsRun: false,
      logging: ['error', 'warn', 'migration', 'schema'],
      logger: 'advanced-console'
    });
    
    // 5. Inicializar DataSource
    console.log('🔌 Inicializando conexão com o banco...');
    await dataSource.initialize();
    console.log('✅ Conexão inicializada com sucesso!');
    
    // 6. Executar as migrations
    console.log('🔄 Executando migrations...');
    const migrationsExecutadas = await dataSource.runMigrations();
    console.log(`✅ ${migrationsExecutadas.length} migrations executadas com sucesso!`);
    migrationsExecutadas.forEach(migration => {
      console.log(`- ${migration.name}`);
    });
    
    // 7. Verificar enums após as migrations
    const enumsAposExecucao = await verificarEnums();
    console.log(`Total de enums após migrations: ${enumsAposExecucao.length}`);
    
    // 8. Verificar se o enum 'status_solicitacao' foi criado
    if (enumsAposExecucao.includes('status_solicitacao')) {
      console.log('✅ Enum "status_solicitacao" criado com sucesso!');
    } else {
      console.error('❌ Enum "status_solicitacao" não foi criado!');
    }
    
    // 9. Fechar conexão
    await dataSource.destroy();
    console.log('🔌 Conexão fechada.');
    
    console.log('✅ Processo de migração concluído com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro durante o processo de migração:', error);
    return false;
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  executarMigrations()
    .then(resultado => {
      if (resultado) {
        console.log('✅ Script executado com sucesso!');
        process.exit(0);
      } else {
        console.error('❌ Falha na execução do script.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Erro não tratado:', error);
      process.exit(1);
    });
}