import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { ScopeType, TipoEscopo } from '../../../entities/user-permission.entity';
import { Status } from '../../../enums/status.enum';

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

    const permissaoAllPermissions = await this.createPermission(
      permissionRepository,
      '*.*',
      'Todas as permissões',
      false,
    );

    // Criar relação entre a permissão geral (*.*) e a role super_admin
    const superAdminRoleId = '00000000-0000-0000-0000-000000000000';
    const connection = permissionRepository.manager.connection;
    
    // Verificar se a relação já existe
    const existingRolePermission = await connection.query(
      'SELECT id FROM role_permissao WHERE role_id = $1 AND permissao_id = $2',
      [superAdminRoleId, permissaoAllPermissions.id]
    );

    if (!existingRolePermission || existingRolePermission.length === 0) {
      // Criar a relação role_permissao
      await connection.query(
        'INSERT INTO role_permissao (role_id, permissao_id) VALUES ($1, $2)',
        [superAdminRoleId, permissaoAllPermissions.id]
      );
      console.log(`Relação criada entre super_admin e permissão geral (*.*) com sucesso!`);
    } else {
      console.log(`Relação entre super_admin e permissão geral (*.*) já existe, pulando...`);
    }

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

    await this.createPermissionScope(
      permissionScopeRepository,
      permissaoAllPermissions.id,
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
    // Usar SQL nativo para evitar problemas com mapeamento de colunas
    const dataSource = repository.manager.connection;
    
    // Verificar se a permissão já existe
    const existingPermission = await dataSource.query(
      `SELECT * FROM permissao WHERE nome = $1 LIMIT 1`,
      [name]
    );

    if (existingPermission && existingPermission.length > 0) {
      console.log(`Permissão '${name}' já existe, atualizando...`);
      const row = existingPermission[0];
      
      // Atualizar a descrição
      await dataSource.query(
        `UPDATE permissao SET descricao = $1 WHERE id = $2`,
        [description, row.id]
      );
      
      // Converter para objeto Permission
      const permission = new Permission();
      permission.id = row.id;
      permission.nome = row.nome;
      permission.descricao = description;
      permission.modulo = row.modulo;
      permission.acao = row.acao;
      permission.status = row.status ? Status.ATIVO : Status.INATIVO;
      permission.created_at = row.created_at;
      permission.updated_at = row.updated_at;
      return permission;
    }

    console.log(`Criando permissão '${name}'...`);
    // Determinar módulo e ação a partir do nome
    const parts = name.split('.');
    const modulo = parts.length > 0 ? parts[0] : 'sistema';
    const acao = parts.length > 1 ? parts.slice(1).join('.') : null;
    
    // Inserir nova permissão usando SQL nativo
    const result = await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, descricao, modulo, acao, status, created_at, updated_at`,
      [name, description, modulo, acao, Status.ATIVO]
    );
    
    // Converter para objeto Permission
    const permission = new Permission();
    const row = result[0];
    permission.id = row.id;
    permission.nome = row.nome;
    permission.descricao = row.descricao;
    permission.modulo = row.modulo;
    permission.acao = row.acao;
    permission.status = row.status ? Status.ATIVO : Status.INATIVO;
    permission.created_at = row.created_at;
    permission.updated_at = row.updated_at;
    return permission;
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
