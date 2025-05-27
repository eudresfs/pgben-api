import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType, TipoEscopo } from '../../../auth/entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de unidades.
 * 
 * Este seed cria permissões para operações relacionadas a unidades,
 * incluindo gerenciamento de unidades, configurações e hierarquia.
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

    // Permissões para hierarquia
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

    // Permissões para configurações
    const unidadeConfiguracaoListar = await this.createPermission(
      permissionRepository,
      'unidade.configuracao.listar',
      'Listar configurações de unidades',
      false,
    );

    const unidadeConfiguracaoEditar = await this.createPermission(
      permissionRepository,
      'unidade.configuracao.editar',
      'Editar configurações de unidades',
      false,
    );

    // Criando escopos padrão para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeAll.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeListar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeVisualizar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeCriar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeEditar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeDesativar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeAtivar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeHierarquiaVisualizar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeHierarquiaEditar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeConfiguracaoListar.id,
      TipoEscopo.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      unidadeConfiguracaoEditar.id,
      TipoEscopo.GLOBAL,
    );

    console.log('Seed de permissões do módulo de unidades concluído com sucesso!');
  }

  /**
   * Cria uma permissão no banco de dados.
   * 
   * @param repository Repositório de permissões
   * @param nome Nome da permissão
   * @param descricao Descrição da permissão
   * @param composta Indica se a permissão é composta
   * @returns Permissão criada
   */
  private static async createPermission(
    repository: any,
    nome: string,
    descricao: string,
    composta: boolean,
  ): Promise<Permission> {
    const existingPermission = await repository.findOne({ where: { nome } });

    if (existingPermission) {
      console.log(`Permissão '${nome}' já existe, pulando...`);
      return existingPermission;
    }

    console.log(`Criando permissão '${nome}'...`);
    const permission = new Permission();
    permission.nome = nome;
    permission.descricao = descricao;
    permission.composta = composta;
    return repository.save(permission);
  }

  /**
   * Cria um escopo de permissão no banco de dados.
   * 
   * @param repository Repositório de escopos de permissão
   * @param permissaoId ID da permissão
   * @param tipoEscopo Tipo de escopo padrão
   * @returns Escopo de permissão criado
   */
  private static async createPermissionScope(
    repository: any,
    permissaoId: string,
    tipoEscopo: TipoEscopo,
  ): Promise<PermissionScope> {
    const existingScope = await repository.findOne({
      where: { permissao_id: permissaoId },
    });

    if (existingScope) {
      console.log(`Escopo para permissão '${permissaoId}' já existe, pulando...`);
      return existingScope;
    }

    console.log(`Criando escopo para permissão '${permissaoId}'...`);
    const scope = new PermissionScope();
    scope.permissao_id = permissaoId;
    scope.tipo_escopo_padrao = tipoEscopo;
    return repository.save(scope);
  }
}