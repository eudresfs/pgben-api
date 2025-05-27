/**
 * Script para verificar o resultado da execução dos seeds
 * 
 * Este script verifica se os dados foram inseridos corretamente no banco de dados
 * após a execução dos scripts de seed.
 */
import { AppDataSource } from './seed-source';

async function verifySeeds() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    // Verificar unidades
    console.log('\n===== VERIFICANDO UNIDADES =====');
    const unidades = await AppDataSource.query(
      'SELECT id, nome, codigo, tipo, status FROM unidade'
    );
    console.log(`Total de unidades: ${unidades.length}`);
    unidades.forEach((u: any) => {
      console.log(`- ${u.nome} (${u.codigo}): tipo=${u.tipo}, status=${u.status}`);
    });

    // Verificar setores
    console.log('\n===== VERIFICANDO SETORES =====');
    const setores = await AppDataSource.query(
      'SELECT id, nome, sigla, unidade_id, status FROM setor'
    );
    console.log(`Total de setores: ${setores.length}`);
    setores.forEach((s: any) => {
      console.log(`- ${s.nome} (${s.sigla}): unidade_id=${s.unidade_id}, status=${s.status}`);
    });

    // Verificar perfis
    console.log('\n===== VERIFICANDO PERFIS =====');
    const perfis = await AppDataSource.query(
      'SELECT id, nome, descricao, ativo FROM role'
    );
    console.log(`Total de perfis: ${perfis.length}`);
    perfis.forEach((p: any) => {
      console.log(`- ${p.nome}: ${p.descricao}, ativo=${p.ativo}`);
    });

    // Verificar usuários
    console.log('\n===== VERIFICANDO USUÁRIOS =====');
    const usuarios = await AppDataSource.query(
      'SELECT id, nome, email, role_id, status FROM usuario'
    );
    console.log(`Total de usuários: ${usuarios.length}`);
    usuarios.forEach((u: any) => {
      console.log(`- ${u.nome} (${u.email}): role_id=${u.role_id}, status=${u.status}`);
    });

    // Verificar tipos de benefício
    console.log('\n===== VERIFICANDO TIPOS DE BENEFÍCIO =====');
    const tiposBeneficio = await AppDataSource.query(
      'SELECT id, nome, codigo, periodicidade, ativo FROM tipo_beneficio'
    );
    console.log(`Total de tipos de benefício: ${tiposBeneficio.length}`);
    tiposBeneficio.forEach((tb: any) => {
      console.log(`- ${tb.nome} (${tb.codigo}): periodicidade=${tb.periodicidade}, ativo=${tb.ativo}`);
    });

    // Verificar permissões
    console.log('\n===== VERIFICANDO PERMISSÕES =====');
    const permissoes = await AppDataSource.query(
      'SELECT id, nome, modulo, acao, ativo FROM permissao'
    );
    console.log(`Total de permissões: ${permissoes.length}`);
    permissoes.forEach((p: any) => {
      console.log(`- ${p.nome}: modulo=${p.modulo}, acao=${p.acao}, ativo=${p.ativo}`);
    });

    // Verificar mapeamento de permissões para roles
    console.log('\n===== VERIFICANDO MAPEAMENTO DE PERMISSÕES PARA ROLES =====');
    const rolePermissoes = await AppDataSource.query(
      'SELECT role_id, permissao_id FROM role_permissao'
    );
    console.log(`Total de mapeamentos: ${rolePermissoes.length}`);
    
  } catch (error) {
    console.error('Erro durante a verificação dos seeds:');
    console.error(error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\nConexão com o banco de dados encerrada.');
    }
  }
}

// Executar o script
verifySeeds()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
