const { AppDataSource } = require('./dist/database/data-source.js');
const { PermissionSeeder } = require('./dist/database/seeds/core/permission.seed.js');

async function debugPermissionSeeds() {
  try {
    console.log('🔍 Iniciando debug dos seeds de permissão...');
    
    // Inicializar conexão com o banco
    console.log('📡 Conectando ao banco de dados...');
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Verificar se a tabela escopo_permissao existe e tem a estrutura correta
    console.log('🔍 Verificando estrutura da tabela escopo_permissao...');
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      const tableExists = await queryRunner.hasTable('escopo_permissao');
      console.log(`📋 Tabela escopo_permissao existe: ${tableExists}`);
      
      if (tableExists) {
        const table = await queryRunner.getTable('escopo_permissao');
        console.log('📊 Colunas da tabela escopo_permissao:');
        table.columns.forEach(column => {
          console.log(`  - ${column.name}: ${column.type}`);
        });
      }
    } finally {
      await queryRunner.release();
    }
    
    // Tentar executar o seeder com tratamento de erro detalhado
    console.log('🌱 Executando PermissionSeeder...');
    const seeder = new PermissionSeeder();
    
    try {
      await seeder.run(AppDataSource);
      console.log('✅ Seeds de permissão executados com sucesso!');
    } catch (error) {
      console.error('❌ Erro detalhado no seeder:');
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      // Se for um erro de SQL, mostrar a query
      if (error.query) {
        console.error('Query SQL:', error.query);
      }
      
      // Se for um erro de parâmetros, mostrar os parâmetros
      if (error.parameters) {
        console.error('Parâmetros:', error.parameters);
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
    console.error('Stack completo:', error.stack);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com banco encerrada.');
    }
  }
}

debugPermissionSeeds();