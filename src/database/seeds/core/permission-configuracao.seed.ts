import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import {
  ScopeType,
  TipoEscopo,
} from '../../../entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de configurações.
 *
 * Este seed cria permissões para operações relacionadas a configurações do sistema,
 * incluindo configurações gerais, parâmetros, integrações e manutenção.
 */
export class PermissionConfiguracaoSeed {
  /**
   * Executa o seed para criar as permissões do módulo de configurações.
   *
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de configurações...');

    // Permissão composta para o módulo de configurações
    const configuracaoAll = await this.createPermission(
      permissionRepository,
      'configuracao.*',
      'Acesso completo ao módulo de configurações',
      true,
    );

    // Permissões para configurações gerais
    const configuracaoGeral = await this.createPermission(
      permissionRepository,
      'configuracao.geral',
      'Gerenciar configurações gerais do sistema',
      false,
    );

    const configuracaoGeralVisualizar = await this.createPermission(
      permissionRepository,
      'configuracao.geral.visualizar',
      'Visualizar configurações gerais do sistema',
      false,
    );

    const configuracaoGeralEditar = await this.createPermission(
      permissionRepository,
      'configuracao.geral.editar',
      'Editar configurações gerais do sistema',
      false,
    );

    // Permissões para parâmetros
    const configuracaoParametro = await this.createPermission(
      permissionRepository,
      'configuracao.parametro',
      'Gerenciar parâmetros do sistema',
      false,
    );

    const configuracaoParametroListar = await this.createPermission(
      permissionRepository,
      'configuracao.parametro.listar',
      'Listar parâmetros do sistema',
      false,
    );

    const configuracaoParametroCriar = await this.createPermission(
      permissionRepository,
      'configuracao.parametro.criar',
      'Criar parâmetros do sistema',
      false,
    );

    const configuracaoParametroEditar = await this.createPermission(
      permissionRepository,
      'configuracao.parametro.editar',
      'Editar parâmetros do sistema',
      false,
    );

    const configuracaoParametroExcluir = await this.createPermission(
      permissionRepository,
      'configuracao.parametro.excluir',
      'Excluir parâmetros do sistema',
      false,
    );

    // Permissões para integrações
    const configuracaoIntegracao = await this.createPermission(
      permissionRepository,
      'configuracao.integracao',
      'Gerenciar integrações do sistema',
      false,
    );

    const configuracaoIntegracaoListar = await this.createPermission(
      permissionRepository,
      'configuracao.integracao.listar',
      'Listar integrações do sistema',
      false,
    );

    const configuracaoIntegracaoConfigurar = await this.createPermission(
      permissionRepository,
      'configuracao.integracao.configurar',
      'Configurar integrações do sistema',
      false,
    );

    const configuracaoIntegracaoTestar = await this.createPermission(
      permissionRepository,
      'configuracao.integracao.testar',
      'Testar integrações do sistema',
      false,
    );

    // Permissões para manutenção
    const configuracaoManutencao = await this.createPermission(
      permissionRepository,
      'configuracao.manutencao',
      'Gerenciar manutenção do sistema',
      false,
    );

    const configuracaoManutencaoBackup = await this.createPermission(
      permissionRepository,
      'configuracao.manutencao.backup',
      'Gerenciar backups do sistema',
      false,
    );

    const configuracaoManutencaoLimpeza = await this.createPermission(
      permissionRepository,
      'configuracao.manutencao.limpeza',
      'Executar limpeza de dados do sistema',
      false,
    );

    const configuracaoManutencaoLogs = await this.createPermission(
      permissionRepository,
      'configuracao.manutencao.logs',
      'Visualizar logs do sistema',
      false,
    );

    // Permissões para notificações
    const configuracaoNotificacao = await this.createPermission(
      permissionRepository,
      'configuracao.notificacao',
      'Gerenciar configurações de notificações',
      false,
    );

    const configuracaoNotificacaoEmail = await this.createPermission(
      permissionRepository,
      'configuracao.notificacao.email',
      'Configurar notificações por e-mail',
      false,
    );

    const configuracaoNotificacaoSMS = await this.createPermission(
      permissionRepository,
      'configuracao.notificacao.sms',
      'Configurar notificações por SMS',
      false,
    );

    const configuracaoNotificacaoApp = await this.createPermission(
      permissionRepository,
      'configuracao.notificacao.app',
      'Configurar notificações no aplicativo',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoGeral.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoGeralVisualizar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoGeralEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoParametro.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoParametroListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoParametroCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoParametroEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoParametroExcluir.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoIntegracao.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoIntegracaoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoIntegracaoConfigurar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoIntegracaoTestar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoManutencao.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoManutencaoBackup.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoManutencaoLimpeza.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoManutencaoLogs.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoNotificacao.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoNotificacaoEmail.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoNotificacaoSMS.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      configuracaoNotificacaoApp.id,
      ScopeType.GLOBAL,
    );

    console.log(
      'Seed de permissões do módulo de configurações concluído com sucesso!',
    );
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
    const existingPermission = await repository.findOne({
      where: { nome: name },
    });

    if (existingPermission) {
      console.log(`Permissão '${name}' já existe, atualizando...`);
      existingPermission.description = description;
      existingPermission.isComposite = isComposite;
      return repository.save(existingPermission);
    }

    console.log(`Criando permissão '${name}'...`);
    const permission = new Permission();
    permission.nome = name;
    permission.description = description;

    // Extrair módulo e ação do nome da permissão
    const parts = name.split('.');
    if (parts.length >= 1) {
      permission.modulo = parts[0];
    }
    if (parts.length > 1) {
      permission.acao = parts.slice(1).join('.');
    } else {
      permission.acao = 'default';
    }
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
      console.log(
        `Escopo para permissão '${permissionId}' já existe, atualizando...`,
      );
      existingScope.defaultScopeType = defaultScopeType;
      return repository.save(existingScope);
    }

    console.log(`Criando escopo para permissão '${permissionId}'...`);
    const scope = new PermissionScope();
    scope.permissao_id = permissionId;
    scope.defaultScopeType = defaultScopeType;
    return repository.save(scope);
  }
}
