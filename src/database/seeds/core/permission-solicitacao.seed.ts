import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

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
    const solicitacaoAllPermission = permissionRepository.create({
      name: 'solicitacao.*',
      description: 'Todas as permissões do módulo de solicitação',
      isComposite: true,
    });
    await permissionRepository.save(solicitacaoAllPermission);

    // Permissões individuais do módulo de solicitação
    const permissions = [
      {
        name: 'solicitacao.listar',
        description: 'Listar solicitações com filtros e paginação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.visualizar',
        description: 'Visualizar detalhes de uma solicitação específica',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.criar',
        description: 'Criar uma nova solicitação no sistema',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.editar',
        description: 'Editar informações de uma solicitação existente',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.excluir',
        description: 'Excluir uma solicitação do sistema',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.visualizar',
        description: 'Visualizar histórico de status de uma solicitação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.atualizar',
        description: 'Atualizar o status de uma solicitação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.aprovar',
        description: 'Aprovar uma solicitação (transição de status específica)',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.rejeitar',
        description: 'Rejeitar uma solicitação (transição de status específica)',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.cancelar',
        description: 'Cancelar uma solicitação (transição de status específica)',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.suspender',
        description: 'Suspender uma solicitação (transição de status específica)',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.status.reativar',
        description: 'Reativar uma solicitação suspensa (transição de status específica)',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.observacao.adicionar',
        description: 'Adicionar observação a uma solicitação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.observacao.editar',
        description: 'Editar observação de uma solicitação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.observacao.excluir',
        description: 'Excluir observação de uma solicitação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.exportar',
        description: 'Exportar lista de solicitações em formato CSV ou Excel',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.relatorio',
        description: 'Gerar relatórios de solicitações',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.atribuir',
        description: 'Atribuir solicitação a um técnico ou assistente social',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'solicitacao.priorizar',
        description: 'Alterar a prioridade de uma solicitação',
        scopeType: ScopeType.UNIT,
      },
    ];

    // Cria as permissões individuais e configura o escopo padrão
    for (const permissionData of permissions) {
      const { name, description, scopeType } = permissionData;
      
      // Cria a permissão
      const permission = permissionRepository.create({
        name,
        description,
        isComposite: false,
        parentId: solicitacaoAllPermission.id,
      });
      await permissionRepository.save(permission);
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissionId: permission.id,
        defaultScopeType: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de solicitação concluído com sucesso!');
  }
}
