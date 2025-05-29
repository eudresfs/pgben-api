import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { Logger } from '@nestjs/common';

/**
 * Seed de permissões para o módulo de notificações
 * 
 * Este seed cria todas as permissões necessárias para o módulo de notificações,
 * incluindo permissões para gerenciar notificações, templates e configurações.
 */
export class PermissionNotificacaoSeed {
  private static readonly logger = new Logger(PermissionNotificacaoSeed.name);

  /**
   * Executa o seed de permissões do módulo de notificações
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de notificações...');
    
    try {
      // Verificar a estrutura da tabela permissao
      this.logger.log('Verificando estrutura da tabela permissao...');
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permissao'`
      );
      
      if (tableInfo.length === 0) {
        throw new Error('Tabela permissao não encontrada no banco de dados');
      }
      
      // Verificar se a tabela permission_scope existe
      const scopeTableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permission_scope'`
      );
      
      const hasPermissionScope = scopeTableInfo.length > 0;
      this.logger.log(`Tabela permission_scope ${hasPermissionScope ? 'encontrada' : 'não encontrada'}`);
      
      // Criar permissão composta para o módulo
      await this.createCompositePermission(dataSource);
      
      // Criar permissões granulares
      await this.createGranularPermissions(dataSource, hasPermissionScope);
      
      this.logger.log('Seed de permissões do módulo de notificações concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de notificações: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de notificações
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta notificacao.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['notificacao.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão notificacao.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'notificacao.*',
        'Todas as permissões do módulo de notificações',
        'notificacao',
        '*',
        true
      ]
    );
    
    this.logger.log('Permissão composta notificacao.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de notificações
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de notificações...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões básicas de notificação
      {
        nome: 'notificacao.listar',
        descricao: 'Listar notificações',
        acao: 'listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.visualizar',
        descricao: 'Visualizar detalhes de uma notificação',
        acao: 'visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.criar',
        descricao: 'Criar nova notificação',
        acao: 'criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.editar',
        descricao: 'Editar notificação existente',
        acao: 'editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.excluir',
        descricao: 'Excluir notificação',
        acao: 'excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.enviar',
        descricao: 'Enviar notificação para destinatários',
        acao: 'enviar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.marcar_lida',
        descricao: 'Marcar notificação como lida',
        acao: 'marcar_lida',
        escopo: 'USUARIO'
      },
      {
        nome: 'notificacao.marcar_nao_lida',
        descricao: 'Marcar notificação como não lida',
        acao: 'marcar_nao_lida',
        escopo: 'USUARIO'
      },
      
      // Permissões de template de notificação
      {
        nome: 'notificacao.template.listar',
        descricao: 'Listar templates de notificação',
        acao: 'template.listar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.visualizar',
        descricao: 'Visualizar template de notificação',
        acao: 'template.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.criar',
        descricao: 'Criar novo template de notificação',
        acao: 'template.criar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.editar',
        descricao: 'Editar template de notificação',
        acao: 'template.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.excluir',
        descricao: 'Excluir template de notificação',
        acao: 'template.excluir',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.ativar',
        descricao: 'Ativar template de notificação',
        acao: 'template.ativar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.template.desativar',
        descricao: 'Desativar template de notificação',
        acao: 'template.desativar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de configuração
      {
        nome: 'notificacao.configuracao.listar',
        descricao: 'Listar configurações de notificação',
        acao: 'configuracao.listar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'notificacao.configuracao.editar',
        descricao: 'Editar configurações de notificação',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatório
      {
        nome: 'notificacao.relatorio.gerar',
        descricao: 'Gerar relatório de notificações',
        acao: 'relatorio.gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'notificacao.exportar',
        descricao: 'Exportar dados de notificações',
        acao: 'exportar',
        escopo: 'UNIDADE'
      }
    ];
    
    // Inserir cada permissão
    for (const permission of permissions) {
      await this.createPermissionIfNotExists(
        dataSource,
        permission.nome,
        permission.descricao,
        permission.acao,
        hasPermissionScope ? permission.escopo : null
      );
    }
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de notificações processadas.`);
  }

  /**
   * Cria uma permissão se ela não existir
   */
  private static async createPermissionIfNotExists(
    dataSource: DataSource,
    nome: string,
    descricao: string,
    acao: string,
    escopo: string | null
  ): Promise<void> {
    try {
      // Verificar se a permissão já existe
      const existingResult = await dataSource.query(
        `SELECT id FROM permissao WHERE nome = $1`,
        [nome]
      );
      
      if (existingResult && existingResult.length > 0) {
        this.logger.log(`Permissão '${nome}' já existe, pulando...`);
        return;
      }
      
      // Inserir nova permissão
      const result = await dataSource.query(
        `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [nome, descricao, 'notificacao', acao, true]
      );
      
      if (!result || result.length === 0) {
        throw new Error(`Falha ao inserir permissão: ${nome}`);
      }
      
      const permissionId = result[0].id;
      this.logger.log(`Permissão '${nome}' criada com ID: ${permissionId}`);
      
      // Criar escopo se a tabela existir e escopo foi fornecido
      if (escopo && permissionId) {
        await this.createPermissionScope(dataSource, permissionId, escopo);
      }
      
    } catch (error) {
      this.logger.error(`Erro ao criar permissão ${nome}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria o escopo para uma permissão
   */
  private static async createPermissionScope(
    dataSource: DataSource,
    permissionId: number,
    escopo: string
  ): Promise<void> {
    try {
      // Verificar se o escopo já existe para esta permissão
      const existingScopeResult = await dataSource.query(
        `SELECT id FROM permission_scope WHERE permission_id = $1 AND scope = $2`,
        [permissionId, escopo]
      );
      
      if (existingScopeResult && existingScopeResult.length > 0) {
        this.logger.log(`Escopo '${escopo}' já existe para permissão ID ${permissionId}, pulando...`);
        return;
      }
      
      // Inserir novo escopo
      await dataSource.query(
        `INSERT INTO permission_scope (permission_id, scope) VALUES ($1, $2)`,
        [permissionId, escopo]
      );
      
      this.logger.log(`Escopo '${escopo}' criado para permissão ID ${permissionId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar escopo ${escopo} para permissão ${permissionId}: ${error.message}`);
      // Não propagar o erro para não interromper o seed por problemas de escopo
    }
  }
}