/**
 * Script para execução direta de seeds usando apenas o driver PostgreSQL
 * sem depender do TypeORM para evitar problemas de validação de entidades
 */
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente
dotenv.config();

// Função principal de execução
async function runDirectSeeds() {
  console.log('Iniciando execução direta de seeds usando driver PostgreSQL...');
  
  // Criar cliente PostgreSQL
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'pgben',
  });
  
  try {
    // Conectar ao banco de dados
    console.log('Conectando ao banco de dados...');
    await client.connect();
    console.log('Conexão estabelecida com sucesso!');
    
    // Verificar a conexão
    const testResult = await client.query('SELECT 1 as test');
    console.log('Teste de conexão:', testResult.rows[0].test === 1 ? 'OK' : 'Falha');
    
    // Executar os seeds essenciais
    console.log('\n===== EXECUTANDO SEEDS ESSENCIAIS =====');
    
    // 1. Criar permissões raiz dos módulos
    console.log('Criando permissões raiz dos módulos...');
    
    const moduleRoots = [
      { nome: 'usuario.*', descricao: 'Todas as permissões do módulo de usuários', modulo: 'usuario', acao: '*' },
      { nome: 'cidadao.*', descricao: 'Todas as permissões do módulo de cidadãos', modulo: 'cidadao', acao: '*' },
      { nome: 'beneficio.*', descricao: 'Todas as permissões do módulo de benefícios', modulo: 'beneficio', acao: '*' },
      { nome: 'solicitacao.*', descricao: 'Todas as permissões do módulo de solicitações', modulo: 'solicitacao', acao: '*' },
      { nome: 'documento.*', descricao: 'Todas as permissões do módulo de documentos', modulo: 'documento', acao: '*' },
      { nome: 'auditoria.*', descricao: 'Todas as permissões do módulo de auditoria', modulo: 'auditoria', acao: '*' },
      { nome: 'unidade.*', descricao: 'Todas as permissões do módulo de unidades', modulo: 'unidade', acao: '*' },
      { nome: 'relatorio.*', descricao: 'Todas as permissões do módulo de relatórios', modulo: 'relatorio', acao: '*' },
      { nome: 'configuracao.*', descricao: 'Todas as permissões do módulo de configurações', modulo: 'configuracao', acao: '*' },
      { nome: 'notificacao.*', descricao: 'Todas as permissões do módulo de notificações', modulo: 'notificacao', acao: '*' },
      { nome: 'metrica.*', descricao: 'Todas as permissões do módulo de métricas', modulo: 'metrica', acao: '*' },
    ];
    
    for (const rootPerm of moduleRoots) {
      try {
        // Verificar se já existe
        const existingResult = await client.query(
          'SELECT id FROM permissao WHERE nome = $1',
          [rootPerm.nome]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`Permissão '${rootPerm.nome}' já existe, pulando...`);
          continue;
        }
        
        // Inserir nova permissão
        await client.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5)`,
          [rootPerm.nome, rootPerm.descricao, rootPerm.modulo, rootPerm.acao, true]
        );
        
        console.log(`Permissão '${rootPerm.nome}' criada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar permissão '${rootPerm.nome}':`, error.message);
      }
    }
    
    // 2. Criar permissões específicas do módulo de cidadão
    console.log('\nCriando permissões do módulo de cidadão...');
    
    const cidadaoPermissions = [
      { nome: 'cidadao.listar', descricao: 'Listar cidadãos com filtros e paginação', escopo: 'UNIDADE' },
      { nome: 'cidadao.visualizar', descricao: 'Visualizar detalhes de um cidadão específico', escopo: 'UNIDADE' },
      { nome: 'cidadao.criar', descricao: 'Criar um novo cidadão no sistema', escopo: 'UNIDADE' },
      { nome: 'cidadao.editar', descricao: 'Editar informações de um cidadão existente', escopo: 'UNIDADE' },
      { nome: 'cidadao.excluir', descricao: 'Excluir um cidadão do sistema', escopo: 'UNIDADE' },
      { nome: 'cidadao.buscar_cpf', descricao: 'Buscar cidadão por CPF', escopo: 'UNIDADE' },
      { nome: 'cidadao.buscar_nis', descricao: 'Buscar cidadão por NIS', escopo: 'UNIDADE' },
      { nome: 'cidadao.exportar', descricao: 'Exportar lista de cidadãos em formato CSV ou Excel', escopo: 'UNIDADE' },
      { nome: 'cidadao.importar', descricao: 'Importar cidadãos de arquivo CSV ou Excel', escopo: 'UNIDADE' },
    ];
    
    for (const perm of cidadaoPermissions) {
      try {
        // Verificar se já existe
        const existingResult = await client.query(
          'SELECT id FROM permissao WHERE nome = $1',
          [perm.nome]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`Permissão '${perm.nome}' já existe, pulando...`);
          continue;
        }
        
        // Extrair módulo e ação
        const parts = perm.nome.split('.');
        const modulo = parts[0];
        const acao = parts.slice(1).join('.');
        
        // Inserir nova permissão
        const permResult = await client.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [perm.nome, perm.descricao, modulo, acao, true]
        );
        
        const permissionId = permResult.rows[0].id;
        
        // Configurar escopo padrão
        await client.query(
          `INSERT INTO escopo_permissao (permissao_id, tipo_escopo_padrao) 
           VALUES ($1, $2)`,
          [permissionId, perm.escopo]
        );
        
        console.log(`Permissão '${perm.nome}' criada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar permissão '${perm.nome}':`, error.message);
      }
    }
    
    // 3. Criar permissões específicas do módulo de benefício
    console.log('\nCriando permissões do módulo de benefício...');
    
    const beneficioPermissions = [
      { nome: 'beneficio.listar', descricao: 'Listar benefícios com filtros e paginação', escopo: 'UNIDADE' },
      { nome: 'beneficio.visualizar', descricao: 'Visualizar detalhes de um benefício específico', escopo: 'UNIDADE' },
      { nome: 'beneficio.criar', descricao: 'Criar um novo tipo de benefício no sistema', escopo: 'GLOBAL' },
      { nome: 'beneficio.editar', descricao: 'Editar informações de um tipo de benefício existente', escopo: 'GLOBAL' },
      { nome: 'beneficio.excluir', descricao: 'Excluir um tipo de benefício do sistema', escopo: 'GLOBAL' },
      { nome: 'beneficio.conceder', descricao: 'Conceder um benefício a um cidadão', escopo: 'UNIDADE' },
      { nome: 'beneficio.revogar', descricao: 'Revogar um benefício concedido a um cidadão', escopo: 'UNIDADE' },
      { nome: 'beneficio.suspender', descricao: 'Suspender temporariamente um benefício concedido', escopo: 'UNIDADE' },
      { nome: 'beneficio.reativar', descricao: 'Reativar um benefício suspenso', escopo: 'UNIDADE' },
      { nome: 'beneficio.renovar', descricao: 'Renovar um benefício com prazo de validade', escopo: 'UNIDADE' },
    ];
    
    for (const perm of beneficioPermissions) {
      try {
        // Verificar se já existe
        const existingResult = await client.query(
          'SELECT id FROM permissao WHERE nome = $1',
          [perm.nome]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`Permissão '${perm.nome}' já existe, pulando...`);
          continue;
        }
        
        // Extrair módulo e ação
        const parts = perm.nome.split('.');
        const modulo = parts[0];
        const acao = parts.slice(1).join('.');
        
        // Inserir nova permissão
        const permResult = await client.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [perm.nome, perm.descricao, modulo, acao, true]
        );
        
        const permissionId = permResult.rows[0].id;
        
        // Configurar escopo padrão
        await client.query(
          `INSERT INTO escopo_permissao (permissao_id, tipo_escopo_padrao) 
           VALUES ($1, $2)`,
          [permissionId, perm.escopo]
        );
        
        console.log(`Permissão '${perm.nome}' criada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar permissão '${perm.nome}':`, error.message);
      }
    }
    
    // 4. Criar permissões específicas do módulo de solicitação
    console.log('\nCriando permissões do módulo de solicitação...');
    
    const solicitacaoPermissions = [
      { nome: 'solicitacao.listar', descricao: 'Listar solicitações com filtros e paginação', escopo: 'UNIDADE' },
      { nome: 'solicitacao.visualizar', descricao: 'Visualizar detalhes de uma solicitação específica', escopo: 'UNIDADE' },
      { nome: 'solicitacao.criar', descricao: 'Criar uma nova solicitação no sistema', escopo: 'UNIDADE' },
      { nome: 'solicitacao.editar', descricao: 'Editar informações de uma solicitação existente', escopo: 'UNIDADE' },
      { nome: 'solicitacao.excluir', descricao: 'Excluir uma solicitação do sistema', escopo: 'UNIDADE' },
      { nome: 'solicitacao.status.visualizar', descricao: 'Visualizar histórico de status de uma solicitação', escopo: 'UNIDADE' },
      { nome: 'solicitacao.status.atualizar', descricao: 'Atualizar o status de uma solicitação', escopo: 'UNIDADE' },
      { nome: 'solicitacao.observacao.adicionar', descricao: 'Adicionar observação a uma solicitação', escopo: 'UNIDADE' },
      { nome: 'solicitacao.observacao.editar', descricao: 'Editar observação de uma solicitação', escopo: 'UNIDADE' },
      { nome: 'solicitacao.observacao.excluir', descricao: 'Excluir observação de uma solicitação', escopo: 'UNIDADE' },
    ];
    
    for (const perm of solicitacaoPermissions) {
      try {
        // Verificar se já existe
        const existingResult = await client.query(
          'SELECT id FROM permissao WHERE nome = $1',
          [perm.nome]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`Permissão '${perm.nome}' já existe, pulando...`);
          continue;
        }
        
        // Extrair módulo e ação
        const parts = perm.nome.split('.');
        const modulo = parts[0];
        const acao = parts.slice(1).join('.');
        
        // Inserir nova permissão
        const permResult = await client.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [perm.nome, perm.descricao, modulo, acao, true]
        );
        
        const permissionId = permResult.rows[0].id;
        
        // Configurar escopo padrão
        await client.query(
          `INSERT INTO escopo_permissao (permissao_id, tipo_escopo_padrao) 
           VALUES ($1, $2)`,
          [permissionId, perm.escopo]
        );
        
        console.log(`Permissão '${perm.nome}' criada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar permissão '${perm.nome}':`, error.message);
      }
    }
    
    console.log('\n===== SEEDS EXECUTADOS COM SUCESSO =====');
    
  } catch (error) {
    console.error('Erro durante a execução dos seeds:', error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o banco de dados
    await client.end();
    console.log('Conexão com o banco de dados encerrada.');
  }
}

// Executar o script
runDirectSeeds()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
