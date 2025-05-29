import { AppDataSource } from '../src/data-source';

/**
 * Script para limpar completamente o banco de dados
 * Remove todas as tabelas, ENUMs e extensões criadas
 */
async function cleanDatabase() {
  console.log('🧹 Limpando banco de dados...');
  
  try {
    // Inicializar conexão
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida!');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Desabilitar verificações de foreign key temporariamente
    await queryRunner.query('SET session_replication_role = replica;');
    
    // Obter todas as tabelas do schema public
    const tables = await queryRunner.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'migrations'
    `);
    
    console.log(`📋 Encontradas ${tables.length} tabelas para remover`);
    
    // Remover todas as tabelas (exceto migrations)
    for (const table of tables) {
      console.log(`🗑️ Removendo tabela: ${table.tablename}`);
      await queryRunner.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
    }
    
    // Obter todos os ENUMs
    const enums = await queryRunner.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
    `);
    
    console.log(`📋 Encontrados ${enums.length} ENUMs para remover`);
    
    // Remover todos os ENUMs
    for (const enumType of enums) {
      console.log(`🗑️ Removendo ENUM: ${enumType.typname}`);
      await queryRunner.query(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE;`);
    }
    
    // Reabilitar verificações de foreign key
    await queryRunner.query('SET session_replication_role = DEFAULT;');
    
    // Limpar tabela de migrations (manter apenas a estrutura)
    await queryRunner.query('DELETE FROM migrations;');
    
    console.log('✅ Banco de dados limpo com sucesso!');
    console.log('📝 Tabela de migrations foi limpa, mas mantida');
    
    await queryRunner.release();
    
  } catch (error) {
    console.error('❌ Erro ao limpar banco de dados:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão fechada.');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanDatabase().catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
}

export { cleanDatabase };