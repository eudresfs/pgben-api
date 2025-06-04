import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar a performance de queries críticas
 *
 * Este script executa queries críticas do sistema e mede o tempo de execução,
 * verificando se atendem aos critérios de performance estabelecidos
 */
async function testarPerformanceQueries() {
  console.log('======================================================');
  console.log('Iniciando teste de performance de queries críticas');
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

    // Definir tipo explícito para o array de resultados
    const resultados: Array<{
      nome: string;
      tempoExecucao: number | null;
      registros: number | null;
      atendeCriterio: boolean;
      erro?: string;
    }> = [];

    // Definir queries críticas para teste
    const queriesCriticas = [
      {
        nome: 'Busca de cidadãos por CPF',
        query: `
          SELECT c.*, e.logradouro, e.numero, e.bairro, e.cidade, e.estado
          FROM cidadao c
          LEFT JOIN endereco e ON c.id = e.cidadao_id
          WHERE c.cpf LIKE $1
        `,
        params: ['%123%'],
        limiteTempo: 100, // ms
      },
      {
        nome: 'Listagem de solicitações com filtros',
        query: `
          SELECT s.*, c.nome as nome_cidadao, tb.nome as nome_beneficio
          FROM solicitacao s
          JOIN cidadao c ON s.cidadao_id = c.id
          JOIN tipo_beneficio tb ON s.tipo_beneficio_id = tb.id
          WHERE s.status = $1
          AND s.data_solicitacao >= $2
          ORDER BY s.data_solicitacao DESC
        `,
        params: [
          'pendente',
          new Date(new Date().setMonth(new Date().getMonth() - 3)),
        ],
        limiteTempo: 100, // ms
      },
      {
        nome: 'Relatório de benefícios por tipo',
        query: `
          SELECT tb.nome, COUNT(s.id) as total_solicitacoes,
          COUNT(CASE WHEN s.status = 'aprovado' THEN 1 END) as aprovados,
          COUNT(CASE WHEN s.status = 'reprovado' THEN 1 END) as reprovados,
          COUNT(CASE WHEN s.status = 'pendente' THEN 1 END) as pendentes,
          COUNT(CASE WHEN s.status = 'analise' THEN 1 END) as em_analise,
          SUM(CASE WHEN s.status = 'aprovado' THEN s.valor_beneficio ELSE 0 END) as valor_total_aprovado
          FROM tipo_beneficio tb
          LEFT JOIN solicitacao s ON tb.id = s.tipo_beneficio_id
          GROUP BY tb.nome
          ORDER BY tb.nome
        `,
        params: [],
        limiteTempo: 100, // ms
      },
      {
        nome: 'Busca de documentos por cidadão',
        query: `
          SELECT ds.*, s.numero as numero_solicitacao, tb.nome as tipo_beneficio
          FROM documento_solicitacao ds
          JOIN solicitacao s ON ds.solicitacao_id = s.id
          JOIN tipo_beneficio tb ON s.tipo_beneficio_id = tb.id
          WHERE s.cidadao_id = (SELECT id FROM cidadao LIMIT 1)
          ORDER BY ds.created_at DESC
        `,
        params: [],
        limiteTempo: 100, // ms
      },
      {
        nome: 'Histórico de solicitações por cidadão',
        query: `
          SELECT s.*, tb.nome as tipo_beneficio, 
          (SELECT status FROM historico_status_solicitacao 
           WHERE solicitacao_id = s.id 
           ORDER BY data_alteracao DESC LIMIT 1) as ultimo_status,
          (SELECT COUNT(*) FROM avaliacao_solicitacao WHERE solicitacao_id = s.id) as total_avaliacoes
          FROM solicitacao s
          JOIN tipo_beneficio tb ON s.tipo_beneficio_id = tb.id
          WHERE s.cidadao_id = (SELECT id FROM cidadao LIMIT 1)
          ORDER BY s.data_solicitacao DESC
        `,
        params: [],
        limiteTempo: 100, // ms
      },
    ];

    // Executar cada query e medir o tempo
    console.log('\nExecutando queries críticas e medindo tempo...');

    for (const query of queriesCriticas) {
      console.log(`\nExecutando query: ${query.nome}`);

      try {
        // Medir tempo de execução
        const inicio = performance.now();
        const resultado = await dataSource.query(query.query, query.params);
        const fim = performance.now();
        const tempoExecucao = fim - inicio;

        console.log(`Tempo de execução: ${tempoExecucao.toFixed(2)} ms`);
        console.log(`Resultado: ${resultado.length} registros retornados`);

        // Verificar se atende ao critério de performance
        const atendeCriterio = tempoExecucao <= query.limiteTempo;

        if (atendeCriterio) {
          console.log(
            `✅ Atende ao critério de performance (limite: ${query.limiteTempo} ms)`,
          );
        } else {
          console.log(
            `❌ Não atende ao critério de performance (limite: ${query.limiteTempo} ms)`,
          );
        }

        resultados.push({
          nome: query.nome,
          tempoExecucao,
          registros: resultado.length,
          atendeCriterio,
        });
      } catch (error) {
        console.log(`❌ Erro ao executar query: ${error.message}`);
        resultados.push({
          nome: query.nome,
          tempoExecucao: null,
          registros: null,
          atendeCriterio: false,
          erro: error.message,
        });
      }
    }

    // Resumo dos resultados
    console.log('\nResumo dos resultados:');
    console.log('------------------------------------------------------');
    console.log('| Query                      | Tempo (ms) | Critério |');
    console.log('------------------------------------------------------');

    for (const resultado of resultados) {
      const nome = resultado.nome.padEnd(25, ' ').substring(0, 25);
      const tempo =
        resultado.tempoExecucao !== null
          ? resultado.tempoExecucao.toFixed(2).padStart(9, ' ')
          : 'ERRO     ';
      const criterio = resultado.atendeCriterio ? '  ✅   ' : '  ❌   ';

      console.log(`| ${nome} | ${tempo} | ${criterio} |`);
    }
    console.log('------------------------------------------------------');

    // Verificar se todas as queries atendem aos critérios
    const todasAtendem = resultados.every((r) => r.atendeCriterio);

    if (todasAtendem) {
      console.log(
        '\n✅ Todas as queries atendem aos critérios de performance!',
      );
    } else {
      console.log(
        '\n❌ Algumas queries não atendem aos critérios de performance!',
      );
      console.log('Queries com problemas:');

      resultados
        .filter((r) => !r.atendeCriterio)
        .forEach((r, i) => {
          console.log(`${i + 1}. ${r.nome}`);
          if (r.tempoExecucao !== null) {
            console.log(
              `   Tempo: ${r.tempoExecucao.toFixed(2)} ms (limite: ${
                queriesCriticas.find((q) => q.nome === r.nome)?.limiteTempo ||
                'não definido'
              } ms)`,
            );
          } else {
            console.log(`   Erro: ${r.erro}`);
          }
        });
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste de performance de queries críticas concluído!');
    console.log('======================================================');

    return todasAtendem;
  } catch (error) {
    console.error('Erro durante o teste de performance de queries críticas:');
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
  testarPerformanceQueries()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarPerformanceQueries };
