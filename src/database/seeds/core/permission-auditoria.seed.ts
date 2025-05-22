import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de auditoria.
 * 
 * Este seed cria permissões para operações relacionadas à auditoria,
 * incluindo visualização de logs, exportação e configuração de auditoria.
 */
export class PermissionAuditoriaSeed {
  /**
   * Executa o seed para criar as permissões do módulo de auditoria.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de auditoria...');

    // Permissão composta para o módulo de auditoria
    const auditoriaAll = await this.createPermission(
      permissionRepository,
      'auditoria.*',
      'Acesso completo ao módulo de auditoria',
      true,
    );

    // Permissões para logs de auditoria
    const auditoriaListar = await this.createPermission(
      permissionRepository,
      'auditoria.listar',
      'Listar logs de auditoria',
      false,
    );

    const auditoriaVisualizar = await this.createPermission(
      permissionRepository,
      'auditoria.visualizar',
      'Visualizar detalhes de um log de auditoria',
      false,
    );

    const auditoriaBuscarPorUsuario = await this.createPermission(
      permissionRepository,
      'auditoria.buscar.usuario',
      'Buscar logs de auditoria por usuário',
      false,
    );

    const auditoriaBuscarPorEntidade = await this.createPermission(
      permissionRepository,
      'auditoria.buscar.entidade',
      'Buscar logs de auditoria por entidade',
      false,
    );

    const auditoriaBuscarPorOperacao = await this.createPermission(
      permissionRepository,
      'auditoria.buscar.operacao',
      'Buscar logs de auditoria por operação',
      false,
    );

    const auditoriaBuscarPorData = await this.createPermission(
      permissionRepository,
      'auditoria.buscar.data',
      'Buscar logs de auditoria por data',
      false,
    );

    const auditoriaExportar = await this.createPermission(
      permissionRepository,
      'auditoria.exportar',
      'Exportar logs de auditoria',
      false,
    );

    // Permissões para configurações de auditoria
    const auditoriaConfiguracaoListar = await this.createPermission(
      permissionRepository,
      'auditoria.configuracao.listar',
      'Listar configurações de auditoria',
      false,
    );

    const auditoriaConfiguracaoEditar = await this.createPermission(
      permissionRepository,
      'auditoria.configuracao.editar',
      'Editar configurações de auditoria',
      false,
    );

    // Permissões para relatórios de auditoria
    const auditoriaRelatorioGerar = await this.createPermission(
      permissionRepository,
      'auditoria.relatorio.gerar',
      'Gerar relatórios de auditoria',
      false,
    );

    const auditoriaRelatorioAgendamento = await this.createPermission(
      permissionRepository,
      'auditoria.relatorio.agendamento',
      'Agendar relatórios de auditoria',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaBuscarPorUsuario.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaBuscarPorEntidade.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaBuscarPorOperacao.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaBuscarPorData.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaExportar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaConfiguracaoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaConfiguracaoEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaRelatorioGerar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      auditoriaRelatorioAgendamento.id,
      ScopeType.GLOBAL,
    );

    console.log('Seed de permissões do módulo de auditoria concluído com sucesso!');
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
