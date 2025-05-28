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

    console.log('Iniciando seed de permissões do módulo de cidadão...');
    
    try {
      // Permissão composta para todas as operações do módulo de cidadão
      const cidadaoAllPermission = await this.createPermission(
        permissionRepository,
        'cidadao.*',
        'Todas as permissões do módulo de cidadão',
        true
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoAllPermission.id,
        TipoEscopo.GLOBAL
      );
  
      // Permissões individuais do módulo de cidadão e seus escopos
      const cidadaoListar = await this.createPermission(
        permissionRepository,
        'cidadao.listar',
        'Listar cidadãos com filtros e paginação',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoListar.id,
        TipoEscopo.UNIDADE
      );
      
      const cidadaoVisualizar = await this.createPermission(
        permissionRepository,
        'cidadao.visualizar',
        'Visualizar detalhes de um cidadão específico',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoVisualizar.id,
        TipoEscopo.UNIDADE
      );
      
      const cidadaoCriar = await this.createPermission(
        permissionRepository,
        'cidadao.criar',
        'Criar um novo cidadão no sistema',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoCriar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoEditar = await this.createPermission(
        permissionRepository,
        'cidadao.editar',
        'Editar informações de um cidadão existente',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoEditar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoExcluir = await this.createPermission(
        permissionRepository,
        'cidadao.excluir',
        'Excluir um cidadão do sistema',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoExcluir.id,
        TipoEscopo.UNIDADE
      );
      
      const cidadaoBuscarCpf = await this.createPermission(
        permissionRepository,
        'cidadao.buscar_cpf',
        'Buscar cidadão por CPF',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoBuscarCpf.id,
        TipoEscopo.UNIDADE
      );
      
      const cidadaoBuscarNis = await this.createPermission(
        permissionRepository,
        'cidadao.buscar_nis',
        'Buscar cidadão por NIS',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoBuscarNis.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoExportar = await this.createPermission(
        permissionRepository,
        'cidadao.exportar',
        'Exportar lista de cidadãos em formato CSV ou Excel',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoExportar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoImportar = await this.createPermission(
        permissionRepository,
        'cidadao.importar',
        'Importar lista de cidadãos de arquivo CSV ou Excel',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoImportar.id,
        TipoEscopo.UNIDADE
      );

      // Permissões para gestão de endereços de cidadãos
      const cidadaoEnderecoVisualizar = await this.createPermission(
        permissionRepository,
        'cidadao.endereco.visualizar',
        'Visualizar endereços de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoEnderecoVisualizar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoEnderecoCriar = await this.createPermission(
        permissionRepository,
        'cidadao.endereco.criar',
        'Adicionar um novo endereço para um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoEnderecoCriar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoEnderecoEditar = await this.createPermission(
        permissionRepository,
        'cidadao.endereco.editar',
        'Editar um endereço existente de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoEnderecoEditar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoEnderecoExcluir = await this.createPermission(
        permissionRepository,
        'cidadao.endereco.excluir',
        'Excluir um endereço de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoEnderecoExcluir.id,
        TipoEscopo.UNIDADE
      );

      // Permissões para gestão de contatos de cidadãos
      const cidadaoContatoVisualizar = await this.createPermission(
        permissionRepository,
        'cidadao.contato.visualizar',
        'Visualizar contatos de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoContatoVisualizar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoContatoCriar = await this.createPermission(
        permissionRepository,
        'cidadao.contato.criar',
        'Adicionar um novo contato para um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoContatoCriar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoContatoEditar = await this.createPermission(
        permissionRepository,
        'cidadao.contato.editar',
        'Editar um contato existente de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoContatoEditar.id,
        TipoEscopo.UNIDADE
      );

      const cidadaoContatoExcluir = await this.createPermission(
        permissionRepository,
        'cidadao.contato.excluir',
        'Excluir um contato de um cidadão',
        false
      );
      await this.createPermissionScope(
        permissionScopeRepository,
        cidadaoContatoExcluir.id,
        TipoEscopo.UNIDADE
      );

      console.log('Seed de permissões do módulo de cidadão concluído com sucesso!');
    } catch (error) {
      console.error(`Erro ao executar seed de permissões do módulo de cidadão: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria uma permissão no banco de dados.
   * 
   * @param repository Repositório de permissões
   * @param nome Nome da permissão
   * @param descricao Descrição da permissão
   * @param composta Flag para identificar permissões compostas (não existe mais na entidade, mas mantido para compatibilidade)
   * @returns Permissão criada
   */
  private static async createPermission(
    repository: any,
    nome: string,
    descricao: string,
    composta: boolean,
  ): Promise<Permission> {
    // Verifica se a permissão já existe
    const existingPermission = await repository.findOne({ where: { nome } });
    
    if (existingPermission) {
      console.log(`Permissão '${nome}' já existe, atualizando...`);
      existingPermission.descricao = descricao;
      return await repository.save(existingPermission);
    }
    
    console.log(`Criando permissão '${nome}'...`);
    
    // Extrair módulo e ação do nome
    const parts = nome.split('.');
    const modulo = parts[0];
    const acao = parts.slice(1).join('.');
    
    // Usar SQL direto para inserir a permissão com os campos corretos
    const dataSource = repository.manager.connection;
    const result = await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [nome, descricao, modulo, acao, true]
    );
    
    // Criar objeto Permission para retornar
    const permission = new Permission();
    permission.id = result[0].id;
    permission.nome = nome;
    permission.descricao = descricao;
    permission.modulo = modulo;
    permission.acao = acao;
    
    return permission;
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
    // Verifica se o escopo já existe
    const existingScope = await repository.findOne({
      where: { permissao_id: permissaoId },
    });
    
    if (existingScope) {
      console.log(`Escopo para permissão '${permissaoId}' já existe, atualizando...`);
      existingScope.tipo_escopo_padrao = tipoEscopo;
      return await repository.save(existingScope);
    }
    
    console.log(`Criando escopo para permissão '${permissaoId}'...`);
    const scope = new PermissionScope();
    scope.permissao_id = permissaoId;
    scope.tipo_escopo_padrao = tipoEscopo;
    return await repository.save(scope);
  }
}
