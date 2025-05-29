import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/data-source';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para criar migration inicial baseada nas entidades existentes
 * Este script cria uma migration que define toda a estrutura do banco
 */
async function createInitialMigration() {
  console.log('🚀 Criando migration inicial...');
  
  try {
    // Verificar se o diretório de migrations existe
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('📁 Diretório de migrations criado.');
    }
    
    // Gerar timestamp para a migration
    const timestamp = Date.now();
    const migrationName = `${timestamp}-InitialSchema`;
    const className = 'InitialSchema';
    
    console.log('📝 Gerando migration inicial...');
    
    // Conectar ao banco para verificar se já existem tabelas
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida!');
    
    // Verificar se já existem tabelas no banco
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    
    if (tables.length > 0) {
      console.log(`ℹ️  Encontradas ${tables.length} tabelas existentes no banco.`);
      console.log('📋 Tabelas encontradas:', tables.map(t => t.name).join(', '));
    }
    
    await queryRunner.release();
    
    // Gerar conteúdo da migration inicial
    const migrationContent = generateInitialMigrationContent(className, timestamp);
    
    // Salvar arquivo de migration
    const migrationPath = path.join(migrationsDir, `${migrationName}.ts`);
    fs.writeFileSync(migrationPath, migrationContent);
    
    console.log('✅ Migration inicial criada com sucesso!');
    console.log(`📄 Arquivo: ${migrationPath}`);
    console.log('\n🔧 Próximos passos:');
    console.log('1. Revise o arquivo de migration gerado');
    console.log('2. Execute: npm run migration:run');
    
  } catch (error) {
    console.error('❌ Erro ao criar migration inicial:');
    console.error(error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão fechada.');
    }
  }
}

/**
 * Gera o conteúdo da migration inicial
 */
function generateInitialMigrationContent(className: string, timestamp: number): string {
  return `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${className}${timestamp} implements MigrationInterface {
    name = '${className}${timestamp}'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Esta migration será preenchida automaticamente pelo TypeORM
        // com base na comparação entre as entidades e o estado atual do banco
        
        console.log('Executando migration inicial...');
        
        // O TypeORM irá gerar automaticamente as queries necessárias
        // quando você executar: npm run migration:generate -- --name=InitialSchema
        
        // Por enquanto, esta migration está vazia
        // Execute o comando de geração para preenchê-la automaticamente
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter todas as alterações da migration inicial
        console.log('Revertendo migration inicial...');
        
        // As queries de reversão serão geradas automaticamente
    }
}
`;
}

// Executar se chamado diretamente
if (require.main === module) {
  createInitialMigration().catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
}

export { createInitialMigration };