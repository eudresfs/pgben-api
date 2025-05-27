import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { TipoEscopo } from '../../../auth/entities/user-permission.entity';

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
      nome: 'cidadao.*',
      descricao: 'Todas as permissões do módulo de cidadão',
      composta: true,
    });
    await permissionRepository.save(cidadaoAllPermission);

    // Permissões individuais do módulo de cidadão
    const permissions = [
      {
        nome: 'cidadao.listar',
        descricao: 'Listar cidadãos com filtros e paginação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.visualizar',
        descricao: 'Visualizar detalhes de um cidadão específico',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.criar',
        descricao: 'Criar um novo cidadão no sistema',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.editar',
        descricao: 'Editar informações de um cidadão existente',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.excluir',
        descricao: 'Excluir um cidadão do sistema',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.buscar_cpf',
        descricao: 'Buscar cidadão por CPF',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.buscar_nis',
        descricao: 'Buscar cidadão por NIS',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.exportar',
        descricao: 'Exportar lista de cidadãos em formato CSV ou Excel',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.importar',
        descricao: 'Importar lista de cidadãos de arquivo CSV ou Excel',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.endereco.listar',
        descricao: 'Listar endereços de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.endereco.adicionar',
        descricao: 'Adicionar novo endereço a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.endereco.editar',
        descricao: 'Editar endereço de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.endereco.excluir',
        descricao: 'Excluir endereço de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.contato.listar',
        descricao: 'Listar contatos de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.contato.adicionar',
        descricao: 'Adicionar novo contato a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.contato.editar',
        descricao: 'Editar contato de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'cidadao.contato.excluir',
        descricao: 'Excluir contato de um cidadão',
        scopeType: TipoEscopo.UNIDADE,
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
        permissao_pai_id: cidadaoAllPermission.id,
      });
      await permissionRepository.save(permission);
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissao_id: permission.id,
        tipo_escopo_padrao: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de cidadão concluído com sucesso!');
  }
}
