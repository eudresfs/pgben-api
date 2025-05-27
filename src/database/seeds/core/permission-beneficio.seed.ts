import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { TipoEscopo } from '../../../auth/entities/user-permission.entity';

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
      nome: 'beneficio.*',
      descricao: 'Todas as permissões do módulo de benefício',
      composta: true,
    });
    await permissionRepository.save(beneficioAllPermission);

    // Permissões individuais do módulo de benefício
    const permissions = [
      {
        nome: 'beneficio.listar',
        descricao: 'Listar benefícios com filtros e paginação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.visualizar',
        descricao: 'Visualizar detalhes de um benefício específico',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.criar',
        descricao: 'Criar um novo tipo de benefício no sistema',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.editar',
        descricao: 'Editar informações de um tipo de benefício existente',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.excluir',
        descricao: 'Excluir um tipo de benefício do sistema',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.conceder',
        descricao: 'Conceder um benefício a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.revogar',
        descricao: 'Revogar um benefício concedido a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.suspender',
        descricao: 'Suspender temporariamente um benefício concedido',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.reativar',
        descricao: 'Reativar um benefício suspenso',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.renovar',
        descricao: 'Renovar um benefício com prazo de validade',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.exportar',
        descricao: 'Exportar lista de benefícios em formato CSV ou Excel',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.relatorio',
        descricao: 'Gerar relatórios de benefícios',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.historico.visualizar',
        descricao: 'Visualizar histórico de alterações em um benefício',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.workflow.visualizar',
        descricao: 'Visualizar workflows de concessão de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.criar',
        descricao: 'Criar um novo workflow de concessão de benefício',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.editar',
        descricao: 'Editar um workflow de concessão de benefício existente',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.excluir',
        descricao: 'Excluir um workflow de concessão de benefício',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.parametro.visualizar',
        descricao: 'Visualizar parâmetros de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.parametro.editar',
        descricao: 'Editar parâmetros de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
    ];

    // Cria as permissões individuais e configura o escopo padrão
    for (const permissionData of permissions) {
      const { nome, descricao, scopeType } = permissionData;
      
      // Cria a permissão
      const permission = permissionRepository.create({
        nome,
        descricao,
        composta: false,
        permissao_pai_id: beneficioAllPermission.id,
      });
      await permissionRepository.save(permission);
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissao_id: permission.id,
        tipo_escopo_padrao: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de benefício concluído com sucesso!');
  }
}
