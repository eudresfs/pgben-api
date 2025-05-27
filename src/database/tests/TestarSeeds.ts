import { DataSource } from 'typeorm';
import * as path from 'path';
import { config } from 'dotenv';
import { SeedExecutor } from '../seeds/utils/SeedExecutor';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar a execução dos seeds e verificar sua consistência
 *
 * Este script executa todos os seeds e verifica se não há erros
 * durante a execução e se os dados são consistentes
 */
async function testarSeeds() {
  console.log('======================================================');
  console.log('Iniciando teste de execução dos seeds');
  console.log('======================================================');

  // Configurações para conexão com o banco de dados de teste
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE_TEST || 'pgben_test',
  };

  // Criar conexão com o banco de dados de teste
  const dataSource = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: false,
    logging: false,
  });

  try {
    // Iniciar conexão
    await dataSource.initialize();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} estabelecida`,
    );

    // Criar executor de seeds
    const seedExecutor = SeedExecutor.criarExecutor(dataSource, 'test');

    console.log('\n1. Executando seeds essenciais (core)...');
    await seedExecutor.executarSeedsCore();
    console.log('Seeds essenciais executados com sucesso');

    // Verificar dados essenciais
    console.log('\nVerificando dados essenciais...');
    const perfis = await dataSource.query('SELECT COUNT(*) FROM role');
    console.log(`- Perfis: ${perfis[0].count}`);

    const setores = await dataSource.query('SELECT COUNT(*) FROM setor');
    console.log(`- Setores: ${setores[0].count}`);

    const unidades = await dataSource.query('SELECT COUNT(*) FROM unidade');
    console.log(`- Unidades: ${unidades[0].count}`);

    const tiposBeneficio = await dataSource.query(
      'SELECT COUNT(*) FROM tipo_beneficio',
    );
    console.log(`- Tipos de Benefício: ${tiposBeneficio[0].count}`);

    console.log('\n2. Executando seeds de referência...');
    await seedExecutor.executarSeedsReferencia();
    console.log('Seeds de referência executados com sucesso');

    // Verificar dados de referência
    console.log('\nVerificando dados de referência...');
    const categoriasDocumento = await dataSource.query(
      'SELECT COUNT(*) FROM categoria_documento',
    );
    console.log(`- Categorias de Documento: ${categoriasDocumento[0].count}`);

    const modelosDocumento = await dataSource.query(
      'SELECT COUNT(*) FROM modelo_documento',
    );
    console.log(`- Modelos de Documento: ${modelosDocumento[0].count}`);

    const requisitosDocumento = await dataSource.query(
      'SELECT COUNT(*) FROM requisito_documento',
    );
    console.log(`- Requisitos de Documento: ${requisitosDocumento[0].count}`);

    // Verificar a consistência dos dados
    console.log('\nVerificando consistência dos dados...');

    // 1. Verificar se todos os modelos de documento têm categorias válidas
    const modelosSemCategoria = await dataSource.query(`
      SELECT COUNT(*) FROM modelo_documento m
      LEFT JOIN categoria_documento c ON m.categoria_id = c.id
      WHERE c.id IS NULL
    `);

    if (parseInt(modelosSemCategoria[0].count) > 0) {
      console.log(
        `❌ Encontrados ${modelosSemCategoria[0].count} modelos de documento sem categoria válida`,
      );
    } else {
      console.log('✅ Todos os modelos de documento têm categorias válidas');
    }

    // 2. Verificar se todos os requisitos de documento têm tipos de benefício válidos
    const requisitosSemTipoBeneficio = await dataSource.query(`
      SELECT COUNT(*) FROM requisito_documento r
      LEFT JOIN tipo_beneficio t ON r.tipo_beneficio_id = t.id
      WHERE t.id IS NULL
    `);

    if (parseInt(requisitosSemTipoBeneficio[0].count) > 0) {
      console.log(
        `❌ Encontrados ${requisitosSemTipoBeneficio[0].count} requisitos de documento sem tipo de benefício válido`,
      );
    } else {
      console.log(
        '✅ Todos os requisitos de documento têm tipos de benefício válidos',
      );
    }

    // 3. Verificar se os perfis têm permissões válidas (formato JSON)
    try {
      const perfisComPermissoes = await dataSource.query(
        'SELECT nome, permissoes FROM role',
      );
      let perfisInvalidos = 0;

      for (const role of perfisComPermissoes) {
        try {
          if (typeof role.permissoes === 'string') {
            JSON.parse(role.permissoes);
          }
        } catch (e) {
          perfisInvalidos++;
          console.log(`Perfil com permissões inválidas: ${role.nome}`);
        }
      }

      if (perfisInvalidos > 0) {
        console.log(
          `❌ Encontrados ${perfisInvalidos} perfis com permissões em formato JSON inválido`,
        );
      } else {
        console.log('✅ Todos os perfis têm permissões em formato JSON válido');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar permissões dos perfis:', error.message);
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste de execução dos seeds concluído com sucesso!');
    console.log('======================================================');

    return true;
  } catch (error) {
    console.error('Erro durante o teste de execução dos seeds:');
    console.error(error);

    // Tentar fechar a conexão se estiver aberta
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    return false;
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  testarSeeds()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarSeeds };
