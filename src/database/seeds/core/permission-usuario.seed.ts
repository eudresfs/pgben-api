import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType, TipoEscopo } from '../../../auth/entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de usuários.
 * 
 * Este seed cria permissões para operações relacionadas a usuários,
 * incluindo gerenciamento de usuários, roles e permissões.
 */
export class PermissionUsuarioSeed {
  /**
   * Executa o seed para criar as permissões do módulo de usuários.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de usuários...');

    // Permissão composta para o módulo de usuários
    const usuarioAll = await this.createPermission(
      permissionRepository,
      'usuario.*',
      'Acesso completo ao módulo de usuários',
      true,
    );

    // Permissões para usuários
    const usuarioListar = await this.createPermission(
      permissionRepository,
      'usuario.listar',
      'Listar usuários',
      false,
    );

    const usuarioVisualizar = await this.createPermission(
      permissionRepository,
      'usuario.visualizar',
      'Visualizar detalhes de um usuário',
      false,
    );

    const usuarioCriar = await this.createPermission(
      permissionRepository,
      'usuario.criar',
      'Criar usuários',
      false,
    );

    const usuarioEditar = await this.createPermission(
      permissionRepository,
      'usuario.editar',
      'Editar usuários',
      false,
    );

    const usuarioDesativar = await this.createPermission(
      permissionRepository,
      'usuario.desativar',
      'Desativar usuários',
      false,
    );

    const usuarioAtivar = await this.createPermission(
      permissionRepository,
      'usuario.ativar',
      'Ativar usuários',
      false,
    );

    const usuarioResetarSenha = await this.createPermission(
      permissionRepository,
      'usuario.resetar_senha',
      'Resetar senha de usuários',
      false,
    );

    const usuarioAlterarSenha = await this.createPermission(
      permissionRepository,
      'usuario.alterar_senha',
      'Alterar própria senha',
      false,
    );

    const usuarioExportar = await this.createPermission(
      permissionRepository,
      'usuario.exportar',
      'Exportar usuários',
      false,
    );

    // Permissões para roles
    const roleListar = await this.createPermission(
      permissionRepository,
      'usuario.role.listar',
      'Listar roles',
      false,
    );

    const roleVisualizar = await this.createPermission(
      permissionRepository,
      'usuario.role.visualizar',
      'Visualizar detalhes de uma role',
      false,
    );

    const roleCriar = await this.createPermission(
      permissionRepository,
      'usuario.role.criar',
      'Criar roles',
      false,
    );

    const roleEditar = await this.createPermission(
      permissionRepository,
      'usuario.role.editar',
      'Editar roles',
      false,
    );

    const roleExcluir = await this.createPermission(
      permissionRepository,
      'usuario.role.excluir',
      'Excluir roles',
      false,
    );

    const roleAtribuir = await this.createPermission(
      permissionRepository,
      'usuario.role.atribuir',
      'Atribuir roles a usuários',
      false,
    );

    const roleRevogar = await this.createPermission(
      permissionRepository,
      'usuario.role.revogar',
      'Revogar roles de usuários',
      false,
    );

    // Permissões para permissões
    const permissaoListar = await this.createPermission(
      permissionRepository,
      'usuario.permissao.listar',
      'Listar permissões',
      false,
    );

    const permissaoVisualizar = await this.createPermission(
      permissionRepository,
      'usuario.permissao.visualizar',
      'Visualizar detalhes de uma permissão',
      false,
    );

    const permissaoAtribuir = await this.createPermission(
      permissionRepository,
      'usuario.permissao.atribuir',
      'Atribuir permissões a usuários',
      false,
    );

    const permissaoRevogar = await this.createPermission(
      permissionRepository,
      'usuario.permissao.revogar',
      'Revogar permissões de usuários',
      false,
    );

    const permissaoAtribuirRole = await this.createPermission(
      permissionRepository,
      'usuario.permissao.atribuir_role',
      'Atribuir permissões a roles',
      false,
    );

    const permissaoRevogarRole = await this.createPermission(
      permissionRepository,
      'usuario.permissao.revogar_role',
      'Revogar permissões de roles',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioListar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioVisualizar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioCriar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioEditar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioDesativar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioAtivar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioResetarSenha.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioAlterarSenha.id,
      ScopeType.SELF,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      usuarioExportar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleExcluir.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleAtribuir.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      roleRevogar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoAtribuir.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoRevogar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoAtribuirRole.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoRevogarRole.id,
      ScopeType.GLOBAL,
    );

    console.log('Seed de permissões do módulo de usuários concluído com sucesso!');
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
    const existingPermission = await repository.findOne({ where: { nome: name } });

    if (existingPermission) {
      console.log(`Permissão '${name}' já existe, atualizando...`);
      existingPermission.descricao = description;
      return repository.save(existingPermission);
    }

    console.log(`Criando permissão '${name}'...`);
    const permission = new Permission();
    permission.nome = name;
    permission.descricao = description;
    // Determinar módulo e ação a partir do nome
    const parts = name.split('.');
    permission.modulo = parts.length > 0 ? parts[0] : 'sistema';
    permission.acao = parts.length > 1 ? parts.slice(1).join('.') : null;
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
    defaultScopeType: TipoEscopo,
  ): Promise<PermissionScope> {
    const existingScope = await repository.findOne({
      where: { permissao_id: permissionId },
    });

    if (existingScope) {
      console.log(`Escopo para permissão '${permissionId}' já existe, atualizando...`);
      existingScope.tipo_escopo_padrao = defaultScopeType;
      return repository.save(existingScope);
    }

    console.log(`Criando escopo para permissão '${permissionId}'...`);
    const scope = new PermissionScope();
    scope.permissao_id = permissionId;
    scope.tipo_escopo_padrao = defaultScopeType;
    return repository.save(scope);
  }
}
