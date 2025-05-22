import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Script de seed para popular as permissões do módulo de benefício.
 * 
 * Este script cria as permissões granulares para o módulo de benefício conforme
 * definido no catálogo de permissões, incluindo permissões compostas e
 * configurações de escopo padrão.
 */
export class PermissionBeneficioSeed {
  /**
   * Executa o seed das permissões do módulo de benefício.
   * 
   * @param dataSource Conexão com o banco de dados
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    // Permissão composta para todas as operações do módulo de benefício
    const beneficioAllPermission = permissionRepository.create({
      name: 'beneficio.*',
      description: 'Todas as permissões do módulo de benefício',
      isComposite: true,
    });
    await permissionRepository.save(beneficioAllPermission);

    // Permissões individuais do módulo de benefício
    const permissions = [
      {
        name: 'beneficio.listar',
        description: 'Listar benefícios com filtros e paginação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.visualizar',
        description: 'Visualizar detalhes de um benefício específico',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.criar',
        description: 'Criar um novo tipo de benefício no sistema',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.editar',
        description: 'Editar informações de um tipo de benefício existente',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.excluir',
        description: 'Excluir um tipo de benefício do sistema',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.conceder',
        description: 'Conceder um benefício a um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.revogar',
        description: 'Revogar um benefício concedido a um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.suspender',
        description: 'Suspender temporariamente um benefício concedido',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.reativar',
        description: 'Reativar um benefício suspenso',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.renovar',
        description: 'Renovar um benefício com prazo de validade',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.exportar',
        description: 'Exportar lista de benefícios em formato CSV ou Excel',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.relatorio',
        description: 'Gerar relatórios de benefícios',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.historico.visualizar',
        description: 'Visualizar histórico de alterações em um benefício',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'beneficio.workflow.visualizar',
        description: 'Visualizar workflows de concessão de benefícios',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.workflow.criar',
        description: 'Criar um novo workflow de concessão de benefício',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.workflow.editar',
        description: 'Editar um workflow de concessão de benefício existente',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.workflow.excluir',
        description: 'Excluir um workflow de concessão de benefício',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.parametro.visualizar',
        description: 'Visualizar parâmetros de benefícios',
        scopeType: ScopeType.GLOBAL,
      },
      {
        name: 'beneficio.parametro.editar',
        description: 'Editar parâmetros de benefícios',
        scopeType: ScopeType.GLOBAL,
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
        parentId: beneficioAllPermission.id,
      });
      await permissionRepository.save(permission);
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissionId: permission.id,
        defaultScopeType: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de benefício concluído com sucesso!');
  }
}
