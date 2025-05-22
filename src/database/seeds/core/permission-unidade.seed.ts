import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de unidades.
 * 
 * Este seed cria permissões para operações relacionadas a unidades,
 * incluindo gerenciamento de unidades, hierarquias e configurações.
 */
export class PermissionUnidadeSeed {
  /**
   * Executa o seed para criar as permissões do módulo de unidades.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de unidades...');

    // Permissão composta para o módulo de unidades
    const unidadeAll = await this.createPermission(
      permissionRepository,
      'unidade.*',
      'Acesso completo ao módulo de unidades',
      true,
    );

    // Permissões para unidades
    const unidadeListar = await this.createPermission(
      permissionRepository,
      'unidade.listar',
      'Listar unidades',
      false,
    );

    const unidadeVisualizar = await this.createPermission(
      permissionRepository,
      'unidade.visualizar',
      'Visualizar detalhes de uma unidade',
      false,
    );

    const unidadeCriar = await this.createPermission(
      permissionRepository,
      'unidade.criar',
      'Criar unidades',
      false,
    );

    const unidadeEditar = await this.createPermission(
      permissionRepository,
      'unidade.editar',
      'Editar unidades',
      false,
    );

    const unidadeDesativar = await this.createPermission(
      permissionRepository,
      'unidade.desativar',
      'Desativar unidades',
      false,
    );

    const unidadeAtivar = await this.createPermission(
      permissionRepository,
      'unidade.ativar',
      'Ativar unidades',
      false,
    );

    const unidadeExportar = await this.createPermission(
      permissionRepository,
      'unidade.exportar',
      'Exportar unidades',
      false,
    );

    // Permissões para hierarquia de unidades
    const unidadeHierarquiaVisualizar = await this.createPermission(
      permissionRepository,
      'unidade.hierarquia.visualizar',
      'Visualizar hierarquia de unidades',
      false,
    );

    const unidadeHierarquiaEditar = await this.createPermission(
      permissionRepository,
      'unidade.hierarquia.editar',
      'Editar hierarquia de unidades',
      false,
    );

    // Permissões para tipos de unidade
    const unidadeTipoListar = await this.createPermission(
      permissionRepository,
      'unidade.tipo.listar',
      'Listar tipos de unidade',
      false,
    );

    const unidadeTipoCriar = await this.createPermission(
      permissionRepository,
      'unidade.tipo.criar',
      'Criar tipos de unidade',
      false,
    );

    const unidadeTipoEditar = await this.createPermission(
      permissionRepository,
      'unidade.tipo.editar',
      'Editar tipos de unidade',
      false,
    );

    const unidadeTipoExcluir = await this.createPermission(
      permissionRepository,
      'unidade.tipo.excluir',
      'Excluir tipos de unidade',
      false,
    );

    // Permissões para configurações de unidade
    const unidadeConfiguracaoListar = await this.createPermission(
      permissionRepository,
      'unidade.configuracao.listar',
      'Listar configurações de unidade',
      false,
    );

    const unidadeConfiguracaoEditar = await this.createPermission(
      permissionRepository,
      'unidade.configuracao.editar',
      'Editar configurações de unidade',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeEditar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeDesativar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeAtivar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeExportar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeHierarquiaVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeHierarquiaEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeTipoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeTipoCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeTipoEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeTipoExcluir.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeConfiguracaoListar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeConfiguracaoEditar.id,
      ScopeType.UNIT,
    );

    console.log('Seed de permissões do módulo de unidades concluído com sucesso!');
  }

  /**
   * Cria uma permissão no banco de dados.
   * 
   * @param repository Repositório de permissões
   * @param name Nome da permissão
   * @param description Descrição da permissão
   * @param isComposite Indica se a permissão é composta
   * @returns Permissão criada
   */
  private static async createPermission(
    repository: any,
    name: string,
    description: string,
    isComposite: boolean,
  ): Promise<Permission> {
    const existingPermission = await repository.findOne({ where: { name } });

    if (existingPermission) {
      console.log(`Permissão '${name}' já existe, atualizando...`);
      existingPermission.description = description;
      existingPermission.isComposite = isComposite;
      return repository.save(existingPermission);
    }

    console.log(`Criando permissão '${name}'...`);
    const permission = new Permission();
    permission.name = name;
    permission.description = description;
    permission.isComposite = isComposite;
    return repository.save(permission);
  }

  /**
   * Cria um escopo de permissão no banco de dados.
   * 
   * @param repository Repositório de escopos de permissão
   * @param permissionId ID da permissão
   * @param defaultScopeType Tipo de escopo padrão
   * @returns Escopo de permissão criado
   */
  private static async createPermissionScope(
    repository: any,
    permissionId: string,
    defaultScopeType: ScopeType,
  ): Promise<PermissionScope> {
    const existingScope = await repository.findOne({
      where: { permissionId },
    });

    if (existingScope) {
      console.log(`Escopo para permissão '${permissionId}' já existe, atualizando...`);
      existingScope.defaultScopeType = defaultScopeType;
      return repository.save(existingScope);
    }

    console.log(`Criando escopo para permissão '${permissionId}'...`);
    const scope = new PermissionScope();
    scope.permissionId = permissionId;
    scope.defaultScopeType = defaultScopeType;
    return repository.save(scope);
  }
}
