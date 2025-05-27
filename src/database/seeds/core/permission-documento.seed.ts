import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { ScopeType, TipoEscopo } from '../../../auth/entities/user-permission.entity';

/**
 * Seed para as permissões do módulo de documento.
 * 
 * Este seed cria permissões para operações relacionadas a documentos,
 * incluindo upload, download, visualização e gerenciamento de documentos.
 */
export class PermissionDocumentoSeed {
  /**
   * Executa o seed para criar as permissões do módulo de documento.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    console.log('Iniciando seed de permissões do módulo de documento...');

    // Permissão composta para o módulo de documento
    const documentoAll = await this.createPermission(
      permissionRepository,
      'documento.*',
      'Acesso completo ao módulo de documento',
      true,
    );

    // Permissões para documentos
    const documentoListar = await this.createPermission(
      permissionRepository,
      'documento.listar',
      'Listar documentos',
      false,
    );

    const documentoVisualizar = await this.createPermission(
      permissionRepository,
      'documento.visualizar',
      'Visualizar detalhes de um documento',
      false,
    );

    const documentoUpload = await this.createPermission(
      permissionRepository,
      'documento.upload',
      'Fazer upload de documentos',
      false,
    );

    const documentoDownload = await this.createPermission(
      permissionRepository,
      'documento.download',
      'Fazer download de documentos',
      false,
    );

    const documentoExcluir = await this.createPermission(
      permissionRepository,
      'documento.excluir',
      'Excluir documentos',
      false,
    );

    const documentoValidar = await this.createPermission(
      permissionRepository,
      'documento.validar',
      'Validar documentos',
      false,
    );

    const documentoInvalidar = await this.createPermission(
      permissionRepository,
      'documento.invalidar',
      'Invalidar documentos',
      false,
    );

    const documentoExportar = await this.createPermission(
      permissionRepository,
      'documento.exportar',
      'Exportar documentos',
      false,
    );

    // Permissões para tipos de documento
    const tipoDocumentoListar = await this.createPermission(
      permissionRepository,
      'documento.tipo.listar',
      'Listar tipos de documento',
      false,
    );

    const tipoDocumentoCriar = await this.createPermission(
      permissionRepository,
      'documento.tipo.criar',
      'Criar tipos de documento',
      false,
    );

    const tipoDocumentoEditar = await this.createPermission(
      permissionRepository,
      'documento.tipo.editar',
      'Editar tipos de documento',
      false,
    );

    const tipoDocumentoExcluir = await this.createPermission(
      permissionRepository,
      'documento.tipo.excluir',
      'Excluir tipos de documento',
      false,
    );

    // Permissões para modelos de documento
    const modeloDocumentoListar = await this.createPermission(
      permissionRepository,
      'documento.modelo.listar',
      'Listar modelos de documento',
      false,
    );

    const modeloDocumentoCriar = await this.createPermission(
      permissionRepository,
      'documento.modelo.criar',
      'Criar modelos de documento',
      false,
    );

    const modeloDocumentoEditar = await this.createPermission(
      permissionRepository,
      'documento.modelo.editar',
      'Editar modelos de documento',
      false,
    );

    const modeloDocumentoExcluir = await this.createPermission(
      permissionRepository,
      'documento.modelo.excluir',
      'Excluir modelos de documento',
      false,
    );

    // Configuração de escopo para as permissões
    await this.createPermissionScope(
      permissionScopeRepository,
      documentoAll.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoListar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoVisualizar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoUpload.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoDownload.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoExcluir.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoValidar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoInvalidar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      documentoExportar.id,
      ScopeType.UNIT,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      tipoDocumentoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      tipoDocumentoCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      tipoDocumentoEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      tipoDocumentoExcluir.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      modeloDocumentoListar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      modeloDocumentoCriar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      modeloDocumentoEditar.id,
      ScopeType.GLOBAL,
    );

    await this.createPermissionScope(
      permissionScopeRepository,
      modeloDocumentoExcluir.id,
      ScopeType.GLOBAL,
    );

    console.log('Seed de permissões do módulo de documento concluído com sucesso!');
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
    defaultScopeType: TipoEscopo,
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
