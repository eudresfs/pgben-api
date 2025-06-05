/**
 * Script para execução manual de TODAS as seeds do sistema
 *
 * Este script permite executar todos os seeds disponíveis diretamente, sem depender da CLI do typeorm-extension,
 * evitando problemas de resolução de módulos.
 *
 * Inclui:
 * - Seeds essenciais (core): usuários, perfis, unidades, setores, tipos de benefício, permissões
 * - Seeds de referência: categorias, modelos e requisitos de documentos
 * - Seeds de estrutura: schemas de tipos de benefício
 */

// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra importação
import '../../config/env';

import { AppDataSource } from './seed-source';
import { CoreSeedRunner } from './core/CoreSeedRunner';
import { ReferenceSeedRunner } from './reference/ReferenceSeedRunner';
import { SeedTipoBeneficioSchema1733158900000 } from './core/1733158900000-SeedTipoBeneficioSchema';

/**
 * Função para verificar se as seeds foram executadas corretamente
 */
async function verificarSeeds(): Promise<void> {
  console.log('\n===== VERIFICANDO EXECUÇÃO DAS SEEDS =====');

  try {
    // Verificar unidades
    const unidades = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM unidade WHERE status = $1',
      ['ativo'],
    );
    console.log(`✓ Unidades ativas: ${unidades[0].total}`);

    // Verificar setores
    const setores = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM setor WHERE status = $1',
      ['ativo'],
    );
    console.log(`✓ Setores ativos: ${setores[0].total}`);

    // Verificar tipos de benefício
    const tiposBeneficios = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM tipo_beneficio WHERE status = $1',
      ['ativo'],
    );
    console.log(`✓ Tipos de benefício ativos: ${tiposBeneficios[0].total}`);

    // Verificar schemas de tipos de benefício
    const schemas = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM tipo_beneficio_schema WHERE status = $1',
      ['ativo'],
    );
    console.log(`✓ Schemas de tipos de benefício ativos: ${schemas[0].total}`);

    // Verificar perfis de usuário
    const perfis = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM usuario WHERE status = $1',
      ['ativo'],
    );
    console.log(`✓ Perfis de usuário ativos: ${perfis[0].total}`);

    // Verificar permissões
    const permissoes = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM permissao',
    );
    console.log(`✓ Permissões cadastradas: ${permissoes[0].total}`);

    // Verificar categorias de documento
    const categorias = await AppDataSource.query(
      'SELECT COUNT(*) as total FROM categoria_documento WHERE ativo = $1',
      [true],
    );
    console.log(`✓ Categorias de documento ativas: ${categorias[0].total}`);

    console.log('\n✅ Verificação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a verificação das seeds:');
    console.error(error);
  }
}

async function runSeeds() {
  const startTime = Date.now();

  try {
    console.log('🚀 Iniciando execução completa das seeds do sistema SEMTAS');
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida com sucesso!');

    console.log('\n===== EXECUTANDO SEEDS ESSENCIAIS (CORE) =====');
    console.log(
      '📦 Incluindo: usuários, perfis, unidades, setores, tipos de benefício, permissões',
    );
    await CoreSeedRunner.run(AppDataSource);

    console.log('\n===== EXECUTANDO SEEDS DE REFERÊNCIA =====');
    console.log('📦 Incluindo: categorias, modelos e requisitos de documentos');
    await ReferenceSeedRunner.run(AppDataSource);

    console.log('\n===== EXECUTANDO SEEDS DE ESTRUTURA =====');
    console.log('📦 Incluindo: schemas de tipos de benefício');
    console.log('Executando seed de estruturas de tipos de benefício...');
    const seedTipoBeneficioSchema = new SeedTipoBeneficioSchema1733158900000();
    await seedTipoBeneficioSchema.run(AppDataSource);
    console.log(
      '✅ Seed de estruturas de tipos de benefício executado com sucesso!',
    );

    // Verificar se as seeds foram executadas corretamente
    await verificarSeeds();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n🎉 ===== TODOS OS SEEDS FORAM EXECUTADOS COM SUCESSO =====');
    console.log('\n📊 Resumo das seeds executadas:');
    console.log(
      '✅ Seeds essenciais: usuários, perfis, unidades, setores, tipos de benefício, permissões',
    );
    console.log(
      '✅ Seeds de referência: categorias, modelos e requisitos de documentos',
    );
    console.log('✅ Seeds de estrutura: schemas de tipos de benefício');
    console.log(`\n⏱️  Tempo total de execução: ${duration}s`);
    console.log('\n🚀 O sistema está pronto para uso!');
  } catch (error) {
    console.error('❌ Erro durante a execução dos seeds:');
    console.error(error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com o banco de dados encerrada.');
    }
  }
}

// Executar o script
runSeeds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
