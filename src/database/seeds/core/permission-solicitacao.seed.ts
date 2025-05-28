import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { TipoEscopo } from '../../../auth/entities/user-permission.entity';

/**
 * Script de seed para popular as permissões do módulo de solicitação.
 * 
 * Este script cria as permissões granulares para o módulo de solicitação conforme
 * definido no catálogo de permissões, incluindo permissões compostas e
 * configurações de escopo padrão.
 */
export class PermissionSolicitacaoSeed {
  /**
   * Executa o seed das permissões do módulo de solicitação.
   * 
   * @param dataSource Conexão com o banco de dados
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    // Permissão composta para todas as operações do módulo de solicitação
    // Usamos SQL direto para evitar problemas com campos que não existem na entidade
    let solicitacaoAllPermission = await permissionRepository.findOne({ where: { nome: 'solicitacao.*' } });
    
    if (!solicitacaoAllPermission) {
      // Inserir diretamente no banco de dados
      const result = await dataSource.query(
        `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        ['solicitacao.*', 'Todas as permissões do módulo de solicitação', 'solicitacao', '*', true]
      );
      
      solicitacaoAllPermission = new Permission();
      solicitacaoAllPermission.id = result[0].id;
      solicitacaoAllPermission.nome = 'solicitacao.*';
      solicitacaoAllPermission.descricao = 'Todas as permissões do módulo de solicitação';
    }

    // Permissões individuais do módulo de solicitação
    const permissions = [
      {
        nome: 'solicitacao.listar',
        descricao: 'Listar solicitações com filtros e paginação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.visualizar',
        descricao: 'Visualizar detalhes de uma solicitação específica',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.criar',
        descricao: 'Criar uma nova solicitação no sistema',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.editar',
        descricao: 'Editar informações de uma solicitação existente',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.excluir',
        descricao: 'Excluir uma solicitação do sistema',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.visualizar',
        descricao: 'Visualizar histórico de status de uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.atualizar',
        descricao: 'Atualizar o status de uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.aprovar',
        descricao: 'Aprovar uma solicitação (transição de status específica)',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.rejeitar',
        descricao: 'Rejeitar uma solicitação (transição de status específica)',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.cancelar',
        descricao: 'Cancelar uma solicitação (transição de status específica)',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.suspender',
        descricao: 'Suspender uma solicitação (transição de status específica)',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.status.reativar',
        descricao: 'Reativar uma solicitação suspensa (transição de status específica)',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.observacao.adicionar',
        descricao: 'Adicionar observação a uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.observacao.editar',
        descricao: 'Editar observação de uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.observacao.excluir',
        descricao: 'Excluir observação de uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.exportar',
        descricao: 'Exportar lista de solicitações em formato CSV ou Excel',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.relatorio',
        descricao: 'Gerar relatórios de solicitações',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.atribuir',
        descricao: 'Atribuir solicitação a um técnico ou assistente social',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'solicitacao.priorizar',
        descricao: 'Alterar a prioridade de uma solicitação',
        scopeType: TipoEscopo.UNIDADE,
      },
    ];

    // Cria as permissões individuais e configura o escopo padrão
    for (const permissionData of permissions) {
      const { nome, descricao, scopeType } = permissionData;
      
      // Verificar se a permissão já existe
      let permission = await permissionRepository.findOne({ where: { nome } });
      
      if (!permission) {
        // Extrair módulo e ação do nome
        const parts = nome.split('.');
        const modulo = parts[0];
        const acao = parts.slice(1).join('.');
        
        // Inserir diretamente no banco de dados para evitar problemas com campos não existentes na entidade
        const result = await dataSource.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [nome, descricao, modulo, acao, true]
        );
        
        permission = new Permission();
        permission.id = result[0].id;
        permission.nome = nome;
        permission.descricao = descricao;
      }
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissao_id: permission.id,
        tipo_escopo_padrao: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de solicitação concluído com sucesso!');
  }
}
