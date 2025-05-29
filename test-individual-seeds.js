const { AppDataSource } = require('./dist/database/data-source.js');

// Importar todos os seeds individuais
const { PermissionUsuarioSeed } = require('./dist/database/seeds/core/permission-usuario.seed.js');
const { PermissionCidadaoSeed } = require('./dist/database/seeds/core/permission-cidadao.seed.js');
const { PermissionBeneficioSeed } = require('./dist/database/seeds/core/permission-beneficio.seed.js');
const { PermissionSolicitacaoSeed } = require('./dist/database/seeds/core/permission-solicitacao.seed.js');
const { PermissionDocumentoSeed } = require('./dist/database/seeds/core/permission-documento.seed.js');
const { PermissionAuditoriaSeed } = require('./dist/database/seeds/core/permission-auditoria.seed.js');
const { PermissionUnidadeSeed } = require('./dist/database/seeds/core/permission-unidade.seed.js');
const { PermissionRelatorioSeed } = require('./dist/database/seeds/core/permission-relatorio.seed.js');

async function testIndividualSeeds() {
  try {
    console.log('🔍 Testando seeds individuais...');
    
    // Inicializar conexão com o banco
    console.log('📡 Conectando ao banco de dados...');
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Lista de seeds para testar
    const seeds = [
      { name: 'PermissionUsuarioSeed', seed: PermissionUsuarioSeed },
      { name: 'PermissionCidadaoSeed', seed: PermissionCidadaoSeed },
      { name: 'PermissionBeneficioSeed', seed: PermissionBeneficioSeed },
      { name: 'PermissionSolicitacaoSeed', seed: PermissionSolicitacaoSeed },
      { name: 'PermissionDocumentoSeed', seed: PermissionDocumentoSeed },
      { name: 'PermissionAuditoriaSeed', seed: PermissionAuditoriaSeed },
      { name: 'PermissionUnidadeSeed', seed: PermissionUnidadeSeed },
      { name: 'PermissionRelatorioSeed', seed: PermissionRelatorioSeed }
    ];
    
    // Testar cada seed individualmente
    for (const { name, seed } of seeds) {
      try {
        console.log(`\n🌱 Testando ${name}...`);
        await seed.run(AppDataSource);
        console.log(`✅ ${name} executado com sucesso!`);
      } catch (error) {
        console.error(`❌ Erro em ${name}:`);
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
        
        // Parar no primeiro erro para análise
        throw new Error(`Falha em ${name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Todos os seeds foram executados com sucesso!');
    
  } catch (error) {
    console.error('\n💥 Erro geral:', error.message);
    console.error('Stack completo:', error.stack);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com banco encerrada.');
    }
  }
}

testIndividualSeeds();