import { prepararAmbienteTeste } from './PrepararAmbienteTeste';
import { testarMigrations } from './TestarMigrations';
import { verificarIntegridadeReferencial } from './VerificarIntegridadeReferencial';
import { testarOperacoesDown } from './TestarOperacoesDown';
import { testarSeeds } from './TestarSeeds';
import { testarPoliticasRLS } from './TestarPoliticasRLS';
import { testarPerformanceQueries } from './TestarPerformanceQueries';
import { testarParticionamentoTabelas } from './TestarParticionamentoTabelas';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para executar todos os testes e documentar os resultados
 *
 * Este script executa todos os testes de migrations e seeds em sequência
 * e gera um relatório com os resultados
 */
async function executarTodosTestes() {
  console.log('======================================================');
  console.log('Iniciando execução de todos os testes');
  console.log('======================================================');

  const inicioTestes = new Date();
  // Definir tipo explícito para o array de resultados
  const resultados: Array<{
    nome: string;
    sucesso: boolean;
    duracao: number;
    detalhes: string;
    timestamp: string;
  }> = [];
  let sucessoGeral = true;

  // Criar diretório para relatórios se não existir
  const relatoriosDir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'docs',
    'relatorios',
  );
  if (!fs.existsSync(relatoriosDir)) {
    fs.mkdirSync(relatoriosDir, { recursive: true });
  }

  // Função para registrar resultado de teste
  const registrarResultado = (nome, sucesso, duracao, detalhes = '') => {
    resultados.push({
      nome,
      sucesso,
      duracao,
      detalhes,
      timestamp: new Date().toISOString(),
    });

    if (!sucesso) {
      sucessoGeral = false;
    }
  };

  try {
    // 1. Preparar ambiente de teste
    console.log('\n1. Preparando ambiente de teste...');
    const inicioPreparacao = Date.now();
    const preparacaoSucesso = await prepararAmbienteTeste();
    const duracaoPreparacao = (Date.now() - inicioPreparacao) / 1000;

    registrarResultado(
      'Preparação do Ambiente de Teste',
      preparacaoSucesso,
      duracaoPreparacao,
      preparacaoSucesso
        ? 'Ambiente de teste preparado com sucesso'
        : 'Falha na preparação do ambiente de teste',
    );

    if (!preparacaoSucesso) {
      throw new Error(
        'Falha na preparação do ambiente de teste. Abortando testes.',
      );
    }

    // 2. Testar execução das migrations
    console.log('\n2. Testando execução das migrations...');
    const inicioMigrations = Date.now();
    const migrationsSucesso = await testarMigrations();
    const duracaoMigrations = (Date.now() - inicioMigrations) / 1000;

    registrarResultado(
      'Execução das Migrations',
      migrationsSucesso,
      duracaoMigrations,
      migrationsSucesso
        ? 'Todas as migrations executadas com sucesso'
        : 'Falha na execução das migrations',
    );

    // 3. Verificar integridade referencial
    console.log('\n3. Verificando integridade referencial...');
    const inicioIntegridade = Date.now();
    const integridadeSucesso = await verificarIntegridadeReferencial();
    const duracaoIntegridade = (Date.now() - inicioIntegridade) / 1000;

    registrarResultado(
      'Verificação de Integridade Referencial',
      integridadeSucesso,
      duracaoIntegridade,
      integridadeSucesso
        ? 'Integridade referencial verificada com sucesso'
        : 'Problemas de integridade referencial encontrados',
    );

    // 4. Testar operações down()
    console.log('\n4. Testando operações down() das migrations...');
    const inicioDown = Date.now();
    const downSucesso = await testarOperacoesDown();
    const duracaoDown = (Date.now() - inicioDown) / 1000;

    registrarResultado(
      'Operações Down das Migrations',
      downSucesso,
      duracaoDown,
      downSucesso
        ? 'Todas as operações down() executadas com sucesso'
        : 'Falha em algumas operações down()',
    );

    // 5. Testar seeds
    console.log('\n5. Testando execução dos seeds...');
    const inicioSeeds = Date.now();
    const seedsSucesso = await testarSeeds();
    const duracaoSeeds = (Date.now() - inicioSeeds) / 1000;

    registrarResultado(
      'Execução dos Seeds',
      seedsSucesso,
      duracaoSeeds,
      seedsSucesso
        ? 'Todos os seeds executados com sucesso'
        : 'Falha na execução dos seeds',
    );

    // 6. Testar políticas RLS
    console.log('\n6. Testando políticas RLS...');
    const inicioRLS = Date.now();
    const rlsSucesso = await testarPoliticasRLS();
    const duracaoRLS = (Date.now() - inicioRLS) / 1000;

    registrarResultado(
      'Políticas RLS',
      rlsSucesso,
      duracaoRLS,
      rlsSucesso
        ? 'Políticas RLS funcionando corretamente'
        : 'Problemas com políticas RLS',
    );

    // 7. Testar performance de queries
    console.log('\n7. Testando performance de queries críticas...');
    const inicioPerformance = Date.now();
    const performanceSucesso = await testarPerformanceQueries();
    const duracaoPerformance = (Date.now() - inicioPerformance) / 1000;

    registrarResultado(
      'Performance de Queries Críticas',
      performanceSucesso,
      duracaoPerformance,
      performanceSucesso
        ? 'Todas as queries atendem aos critérios de performance'
        : 'Algumas queries não atendem aos critérios de performance',
    );

    // 8. Testar particionamento de tabelas
    console.log('\n8. Testando particionamento de tabelas...');
    const inicioParticionamento = Date.now();
    const particionamentoSucesso = await testarParticionamentoTabelas();
    const duracaoParticionamento = (Date.now() - inicioParticionamento) / 1000;

    registrarResultado(
      'Particionamento de Tabelas',
      particionamentoSucesso,
      duracaoParticionamento,
      particionamentoSucesso
        ? 'Particionamento de tabelas configurado corretamente'
        : 'Problemas com particionamento de tabelas',
    );

    // Calcular duração total dos testes
    const fimTestes = new Date();
    const duracaoTotal = (fimTestes.getTime() - inicioTestes.getTime()) / 1000;

    // Gerar relatório de testes
    const relatorio = {
      dataExecucao: inicioTestes.toISOString(),
      duracaoTotal: duracaoTotal,
      sucessoGeral: sucessoGeral,
      resultados: resultados,
    };

    // Salvar relatório em arquivo
    const nomeArquivo = `relatorio_testes_${inicioTestes.toISOString().replace(/[:.]/g, '-')}.json`;
    const caminhoArquivo = path.join(relatoriosDir, nomeArquivo);

    fs.writeFileSync(caminhoArquivo, JSON.stringify(relatorio, null, 2));
    console.log(`\nRelatório de testes salvo em: ${caminhoArquivo}`);

    // Gerar relatório em formato Markdown
    const relatorioMd = gerarRelatorioMarkdown(relatorio);
    const caminhoArquivoMd = path.join(
      relatoriosDir,
      `relatorio_testes_${inicioTestes.toISOString().replace(/[:.]/g, '-')}.md`,
    );

    fs.writeFileSync(caminhoArquivoMd, relatorioMd);
    console.log(
      `Relatório de testes em Markdown salvo em: ${caminhoArquivoMd}`,
    );

    console.log('======================================================');
    console.log(
      `Execução de todos os testes concluída em ${duracaoTotal.toFixed(2)} segundos`,
    );
    console.log(`Resultado geral: ${sucessoGeral ? '✅ SUCESSO' : '❌ FALHA'}`);
    console.log('======================================================');

    return sucessoGeral;
  } catch (error) {
    console.error('Erro durante a execução dos testes:');
    console.error(error);

    // Gerar relatório mesmo em caso de erro
    const fimTestes = new Date();
    const duracaoTotal = (fimTestes.getTime() - inicioTestes.getTime()) / 1000;

    const relatorio = {
      dataExecucao: inicioTestes.toISOString(),
      duracaoTotal: duracaoTotal,
      sucessoGeral: false,
      resultados: resultados,
      erro: error.message,
    };

    // Salvar relatório em arquivo
    const nomeArquivo = `relatorio_testes_erro_${inicioTestes.toISOString().replace(/[:.]/g, '-')}.json`;
    const caminhoArquivo = path.join(relatoriosDir, nomeArquivo);

    fs.writeFileSync(caminhoArquivo, JSON.stringify(relatorio, null, 2));
    console.log(`\nRelatório de erro salvo em: ${caminhoArquivo}`);

    return false;
  }
}

/**
 * Gera um relatório em formato Markdown
 */
function gerarRelatorioMarkdown(relatorio) {
  const data = new Date(relatorio.dataExecucao).toLocaleString('pt-BR');

  let md = `# Relatório de Testes - Migrations e Seeds\n\n`;
  md += `**Data de Execução:** ${data}\n`;
  md += `**Duração Total:** ${relatorio.duracaoTotal.toFixed(2)} segundos\n`;
  md += `**Resultado Geral:** ${relatorio.sucessoGeral ? '✅ SUCESSO' : '❌ FALHA'}\n\n`;

  md += `## Resultados por Teste\n\n`;
  md += `| # | Teste | Resultado | Duração (s) |\n`;
  md += `|---|-------|-----------|-------------|\n`;

  relatorio.resultados.forEach((resultado, index) => {
    md += `| ${index + 1} | ${resultado.nome} | ${resultado.sucesso ? '✅ SUCESSO' : '❌ FALHA'} | ${resultado.duracao.toFixed(2)} |\n`;
  });

  md += `\n## Detalhes dos Testes\n\n`;

  relatorio.resultados.forEach((resultado, index) => {
    md += `### ${index + 1}. ${resultado.nome}\n\n`;
    md += `- **Resultado:** ${resultado.sucesso ? '✅ SUCESSO' : '❌ FALHA'}\n`;
    md += `- **Duração:** ${resultado.duracao.toFixed(2)} segundos\n`;
    md += `- **Timestamp:** ${new Date(resultado.timestamp).toLocaleString('pt-BR')}\n`;
    md += `- **Detalhes:** ${resultado.detalhes || 'Nenhum detalhe adicional'}\n\n`;
  });

  md += `## Conclusão\n\n`;

  if (relatorio.sucessoGeral) {
    md += `Todos os testes foram executados com sucesso. O banco de dados está configurado corretamente e atende a todos os critérios de aceitação definidos no plano de reestruturação.\n\n`;
    md += `As migrations, seeds, políticas de segurança e performance do banco de dados estão de acordo com os requisitos do projeto.\n`;
  } else {
    md += `Foram encontrados problemas durante a execução dos testes. É necessário revisar os itens que falharam antes de prosseguir para a próxima fase do projeto.\n\n`;
    md += `Consulte os detalhes de cada teste para identificar os problemas específicos que precisam ser corrigidos.\n`;
  }

  return md;
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  executarTodosTestes()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { executarTodosTestes };
