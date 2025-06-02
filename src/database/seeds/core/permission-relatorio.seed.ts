import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { ScopeType, TipoEscopo } from '../../../entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de relatórios.
 * 
 * Este seed cria permissões para operações relacionadas a relatórios,
 * incluindo geração, exportação e agendamento de relatórios.
 */
export class PermissionRelatorioSeed {
  /**
   * Executa o seed para criar as permissões do módulo de relatórios.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de relatórios...');

    // Permissão composta para o módulo de relatórios
    const relatorioAll = await this.createPermission(
      permissionRepository,
      'relatorio.*',
      'Acesso completo ao módulo de relatórios',
      true,
    );

    // Permissões para relatórios gerais
    const relatorioListar = await this.createPermission(
      permissionRepository,
      'relatorio.listar',
      'Listar relatórios disponíveis',
      false,
    );

    const relatorioGerar = await this.createPermission(
      permissionRepository,
      'relatorio.gerar',
      'Gerar relatórios',
      false,
    );

    const relatorioExportar = await this.createPermission(
      permissionRepository,
      'relatorio.exportar',
      'Exportar relatórios',
      false,
    );

    const relatorioAgendamento = await this.createPermission(
      permissionRepository,
      'relatorio.agendamento',
      'Agendar geração de relatórios',
      false,
    );

    // Permissões para relatórios específicos
    const relatorioCidadao = await this.createPermission(
      permissionRepository,
      'relatorio.cidadao',
      'Gerar relatórios de cidadãos',
      false,
    );

    const relatorioSolicitacao = await this.createPermission(
      permissionRepository,
      'relatorio.solicitacao',
      'Gerar relatórios de solicitações',
      false,
    );

    const relatorioBeneficio = await this.createPermission(
      permissionRepository,
      'relatorio.beneficio',
      'Gerar relatórios de benefícios',
      false,
    );

    const relatorioFinanceiro = await this.createPermission(
      permissionRepository,
      'relatorio.financeiro',
      'Gerar relatórios financeiros',
      false,
    );

    const relatorioAtendimento = await this.createPermission(
      permissionRepository,
      'relatorio.atendimento',
      'Gerar relatórios de atendimento',
      false,
    );

    const relatorioDesempenho = await this.createPermission(
      permissionRepository,
      'relatorio.desempenho',
      'Gerar relatórios de desempenho',
      false,
    );

    const relatorioAuditoria = await this.createPermission(
      permissionRepository,
      'relatorio.auditoria',
      'Gerar relatórios de auditoria',
      false,
    );

    // Permissões para modelos de relatório
    const relatorioModeloListar = await this.createPermission(
      permissionRepository,
      'relatorio.modelo.listar',
      'Listar modelos de relatório',
      false,
    );

    const relatorioModeloCriar = await this.createPermission(
      permissionRepository,
      'relatorio.modelo.criar',
      'Criar modelos de relatório',
      false,
    );

    const relatorioModeloEditar = await this.createPermission(
      permissionRepository,
      'relatorio.modelo.editar',
      'Editar modelos de relatório',
      false,
    );

    const relatorioModeloExcluir = await this.createPermission(
      permissionRepository,
      'relatorio.modelo.excluir',
      'Excluir modelos de relatório',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioGerar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioExportar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioAgendamento.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioCidadao.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioSolicitacao.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioBeneficio.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioFinanceiro.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioAtendimento.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioDesempenho.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioAuditoria.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioModeloListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioModeloCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioModeloEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      relatorioModeloExcluir.id,
      ScopeType.GLOBAL,
    );

    console.log('Seed de permissões do módulo de relatórios concluído com sucesso!');
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
      console.log(`Escopo para permissão '${permissionId}' já existe, atualizando...`);
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
