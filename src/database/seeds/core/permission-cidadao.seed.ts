import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Script de seed para popular as permissões do módulo de cidadão.
 * 
 * Este script cria as permissões granulares para o módulo de cidadão conforme
 * definido no catálogo de permissões, incluindo permissões compostas e
 * configurações de escopo padrão.
 */
export class PermissionCidadaoSeed {
  /**
   * Executa o seed das permissões do módulo de cidadão.
   * 
   * @param dataSource Conexão com o banco de dados
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    // Permissão composta para todas as operações do módulo de cidadão
    const cidadaoAllPermission = permissionRepository.create({
      name: 'cidadao.*',
      description: 'Todas as permissões do módulo de cidadão',
      isComposite: true,
    });
    await permissionRepository.save(cidadaoAllPermission);

    // Permissões individuais do módulo de cidadão
    const permissions = [
      {
        name: 'cidadao.listar',
        description: 'Listar cidadãos com filtros e paginação',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.visualizar',
        description: 'Visualizar detalhes de um cidadão específico',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.criar',
        description: 'Criar um novo cidadão no sistema',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.editar',
        description: 'Editar informações de um cidadão existente',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.excluir',
        description: 'Excluir um cidadão do sistema',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.buscar_cpf',
        description: 'Buscar cidadão por CPF',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.buscar_nis',
        description: 'Buscar cidadão por NIS',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.exportar',
        description: 'Exportar lista de cidadãos em formato CSV ou Excel',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.importar',
        description: 'Importar lista de cidadãos de arquivo CSV ou Excel',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.endereco.listar',
        description: 'Listar endereços de um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.endereco.adicionar',
        description: 'Adicionar novo endereço a um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.endereco.editar',
        description: 'Editar endereço de um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.endereco.excluir',
        description: 'Excluir endereço de um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.contato.listar',
        description: 'Listar contatos de um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.contato.adicionar',
        description: 'Adicionar novo contato a um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.contato.editar',
        description: 'Editar contato de um cidadão',
        scopeType: ScopeType.UNIT,
      },
      {
        name: 'cidadao.contato.excluir',
        description: 'Excluir contato de um cidadão',
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
        parentId: cidadaoAllPermission.id,
      });
      await permissionRepository.save(permission);
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissionId: permission.id,
        defaultScopeType: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de cidadão concluído com sucesso!');
  }
}
