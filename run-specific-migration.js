const { AppDataSource } = require('./dist/database/data-source');
const { CreatePermissionScopeTable1747961017270 } = require('./dist/database/migrations/CreatePermissionScopeTable1747961017270');

async function runSpecificMigration() {
  try {
    console.log('Conectando ao banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('Verificando se a tabela escopo_permissao já existe...');
    const tableExists = await queryRunner.hasTable('escopo_permissao');
    console.log('Tabela escopo_permissao existe:', tableExists);

    if (tableExists) {
      console.log('Verificando estrutura da tabela existente...');
      const columns = await queryRunner.getTable('escopo_permissao');
      console.log('Colunas atuais:', columns.columns.map(col => col.name));
      
      // Verificar se a coluna permissao_id existe
      const hasPermissaoId = columns.columns.some(col => col.name === 'permissao_id');
      console.log('Coluna permissao_id existe:', hasPermissaoId);
      
      if (!hasPermissaoId) {
        console.log('Executando migration para adicionar estrutura correta...');
        const migration = new CreatePermissionScopeTable1747961017270();
        
        // Primeiro, vamos dropar a tabela existente
        console.log('Removendo tabela existente...');
        await queryRunner.dropTable('escopo_permissao', true);
        
        // Agora executar a migration
        await migration.up(queryRunner);
        console.log('Migration executada com sucesso!');
      } else {
        console.log('Tabela já possui a estrutura correta.');
      }
    } else {
      console.log('Executando migration para criar a tabela...');
      const migration = new CreatePermissionScopeTable1747961017270();
      await migration.up(queryRunner);
      console.log('Migration executada com sucesso!');
    }

    // Verificar estrutura final
    console.log('Verificando estrutura final da tabela...');
    const finalTable = await queryRunner.getTable('escopo_permissao');
    console.log('Colunas finais:', finalTable.columns.map(col => `${col.name} (${col.type})`));

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('Script concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migration:', error);
    process.exit(1);
  }
}

runSpecificMigration();