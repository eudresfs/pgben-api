import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar o particionamento de tabelas
 *
 * Este script verifica se as tabelas que devem ser particionadas
 * estão configuradas corretamente e se o particionamento está funcionando
 */
async function testarParticionamentoTabelas() {
  console.log('======================================================');
  console.log('Iniciando teste de particionamento de tabelas');
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

    // Lista de tabelas que devem ser particionadas
    const tabelasParticionadas = [
      {
        nome: 'log_acao',
        tipoParticao: 'RANGE',
        colunaParticao: 'created_at',
        descricao: 'Particionada por data de criação (mensal)',
      },
      {
        nome: 'log_alteracao',
        tipoParticao: 'RANGE',
        colunaParticao: 'created_at',
        descricao: 'Particionada por data de criação (mensal)',
      },
      {
        nome: 'historico_status_solicitacao',
        tipoParticao: 'RANGE',
        colunaParticao: 'data_alteracao',
        descricao: 'Particionada por data de alteração (mensal)',
      },
    ];

    // Verificar se as tabelas existem e são particionadas
    console.log('\nVerificando tabelas particionadas...');

    for (const tabela of tabelasParticionadas) {
      console.log(`\nVerificando tabela: ${tabela.nome}`);

      // Verificar se a tabela existe
      const tabelaExiste = await dataSource.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `,
        [tabela.nome],
      );

      if (!tabelaExiste[0].exists) {
        console.log(`❌ Tabela ${tabela.nome} não existe`);
        continue;
      }

      // Verificar se a tabela é particionada
      const ehParticionada = await dataSource.query(
        `
        SELECT EXISTS (
          SELECT FROM pg_partitioned_table pt
          JOIN pg_class c ON pt.partrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public' AND c.relname = $1
        );
      `,
        [tabela.nome],
      );

      if (!ehParticionada[0].exists) {
        console.log(`❌ Tabela ${tabela.nome} não é particionada`);
        continue;
      }

      console.log(`✅ Tabela ${tabela.nome} é particionada`);

      // Obter informações sobre o particionamento
      const infoParticao = await dataSource.query(
        `
        SELECT partrelid::regclass as tabela_pai,
               partstrat as estrategia_particao,
               partattrs as colunas_particao
        FROM pg_partitioned_table pt
        JOIN pg_class c ON pt.partrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relname = $1;
      `,
        [tabela.nome],
      );

      if (infoParticao.length > 0) {
        console.log(
          `   Estratégia de particionamento: ${infoParticao[0].estrategia_particao}`,
        );
        console.log(
          `   Colunas de particionamento: ${infoParticao[0].colunas_particao}`,
        );
      }

      // Listar partições existentes
      const particoes = await dataSource.query(
        `
        SELECT child.relname as nome_particao,
               pg_get_expr(child.relpartbound, child.oid) as limites_particao
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
        WHERE parent.relname = $1
          AND nmsp_parent.nspname = 'public'
        ORDER BY child.relname;
      `,
        [tabela.nome],
      );

      console.log(`   Total de partições: ${particoes.length}`);

      if (particoes.length > 0) {
        console.log('   Partições existentes:');
        particoes.forEach((particao, index) => {
          console.log(`   ${index + 1}. ${particao.nome_particao}`);
          console.log(`      Limites: ${particao.limites_particao}`);
        });
      } else {
        console.log('   ❌ Nenhuma partição encontrada');
      }

      // Testar inserção em partições (se houver partições)
      if (particoes.length > 0 && tabela.nome === 'log_acao') {
        console.log('\n   Testando inserção em partições...');

        try {
          // Inserir registros em diferentes datas para testar o particionamento
          const dataAtual = new Date();
          const dataAnterior = new Date();
          dataAnterior.setMonth(dataAnterior.getMonth() - 1);

          // Inserir registro no mês atual
          await dataSource.query(
            `
            INSERT INTO log_acao (
              tipo_acao,
              usuario_id,
              entidade,
              entidade_id,
              detalhes,
              ip_origem,
              created_at
            )
            VALUES (
              'teste_particao_atual',
              NULL,
              'teste',
              NULL,
              '{"teste": "particionamento mês atual"}',
              '127.0.0.1',
              $1
            )
          `,
            [dataAtual],
          );

          // Inserir registro no mês anterior
          await dataSource.query(
            `
            INSERT INTO log_acao (
              tipo_acao,
              usuario_id,
              entidade,
              entidade_id,
              detalhes,
              ip_origem,
              created_at
            )
            VALUES (
              'teste_particao_anterior',
              NULL,
              'teste',
              NULL,
              '{"teste": "particionamento mês anterior"}',
              '127.0.0.1',
              $1
            )
          `,
            [dataAnterior],
          );

          // Verificar em qual partição os registros foram inseridos
          for (const particao of particoes) {
            const registrosParticao = await dataSource.query(`
              SELECT tipo_acao, created_at
              FROM ${particao.nome_particao}
              WHERE tipo_acao LIKE 'teste_particao%'
            `);

            if (registrosParticao.length > 0) {
              console.log(
                `   ✅ Partição ${particao.nome_particao} contém ${registrosParticao.length} registros de teste`,
              );
              registrosParticao.forEach((reg) => {
                console.log(`      - ${reg.tipo_acao}: ${reg.created_at}`);
              });
            }
          }

          // Limpar registros de teste
          await dataSource.query(`
            DELETE FROM log_acao
            WHERE tipo_acao LIKE 'teste_particao%'
          `);

          console.log(
            '   ✅ Teste de inserção em partições concluído com sucesso',
          );
        } catch (error) {
          console.log(
            `   ❌ Erro no teste de inserção em partições: ${error.message}`,
          );
        }
      }
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste de particionamento de tabelas concluído!');
    console.log('======================================================');

    return true;
  } catch (error) {
    console.error('Erro durante o teste de particionamento de tabelas:');
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
  testarParticionamentoTabelas()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarParticionamentoTabelas };
