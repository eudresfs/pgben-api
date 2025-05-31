import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '@/shared/enums/status.enum';

/**
 * Seed de permissões para o módulo judicial
 * 
 * Este seed cria todas as permissões necessárias para o módulo judicial,
 * incluindo permissões para gerenciar processos judiciais, mandados e decisões.
 */
export class PermissionJudicialSeed {
  private static readonly logger = new Logger(PermissionJudicialSeed.name);

  /**
   * Executa o seed de permissões do módulo judicial
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo judicial...');
    
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
      
      this.logger.log('Seed de permissões do módulo judicial concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões judicial: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo judicial
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta judicial.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['judicial.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão judicial.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'judicial.*',
        'Todas as permissões do módulo judicial',
        'judicial',
        '*',
        Status.ATIVO
      ]
    );
    
    this.logger.log('Permissão composta judicial.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo judicial
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo judicial...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões de processos judiciais
      {
        nome: 'judicial.processo.listar',
        descricao: 'Listar processos judiciais',
        acao: 'processo.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.processo.visualizar',
        descricao: 'Visualizar detalhes de processo judicial',
        acao: 'processo.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.processo.criar',
        descricao: 'Criar novo processo judicial',
        acao: 'processo.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.processo.editar',
        descricao: 'Editar processo judicial',
        acao: 'processo.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.processo.arquivar',
        descricao: 'Arquivar processo judicial',
        acao: 'processo.arquivar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.processo.desarquivar',
        descricao: 'Desarquivar processo judicial',
        acao: 'processo.desarquivar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de mandados judiciais
      {
        nome: 'judicial.mandado.listar',
        descricao: 'Listar mandados judiciais',
        acao: 'mandado.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.mandado.visualizar',
        descricao: 'Visualizar detalhes de mandado judicial',
        acao: 'mandado.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.mandado.criar',
        descricao: 'Criar novo mandado judicial',
        acao: 'mandado.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.mandado.editar',
        descricao: 'Editar mandado judicial',
        acao: 'mandado.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.mandado.cumprir',
        descricao: 'Marcar mandado como cumprido',
        acao: 'mandado.cumprir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.mandado.cancelar',
        descricao: 'Cancelar mandado judicial',
        acao: 'mandado.cancelar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de decisões judiciais
      {
        nome: 'judicial.decisao.listar',
        descricao: 'Listar decisões judiciais',
        acao: 'decisao.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.decisao.visualizar',
        descricao: 'Visualizar decisão judicial',
        acao: 'decisao.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.decisao.registrar',
        descricao: 'Registrar nova decisão judicial',
        acao: 'decisao.registrar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.decisao.editar',
        descricao: 'Editar decisão judicial',
        acao: 'decisao.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.decisao.implementar',
        descricao: 'Implementar decisão judicial',
        acao: 'decisao.implementar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de audiências
      {
        nome: 'judicial.audiencia.listar',
        descricao: 'Listar audiências judiciais',
        acao: 'audiencia.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.audiencia.visualizar',
        descricao: 'Visualizar detalhes de audiência',
        acao: 'audiencia.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.audiencia.agendar',
        descricao: 'Agendar audiência judicial',
        acao: 'audiencia.agendar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.audiencia.reagendar',
        descricao: 'Reagendar audiência judicial',
        acao: 'audiencia.reagendar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.audiencia.cancelar',
        descricao: 'Cancelar audiência judicial',
        acao: 'audiencia.cancelar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.audiencia.registrar_ata',
        descricao: 'Registrar ata de audiência',
        acao: 'audiencia.registrar_ata',
        escopo: 'UNIDADE'
      },
      
      // Permissões de documentos judiciais
      {
        nome: 'judicial.documento.listar',
        descricao: 'Listar documentos judiciais',
        acao: 'documento.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.documento.visualizar',
        descricao: 'Visualizar documento judicial',
        acao: 'documento.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.documento.upload',
        descricao: 'Fazer upload de documento judicial',
        acao: 'documento.upload',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.documento.download',
        descricao: 'Fazer download de documento judicial',
        acao: 'documento.download',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.documento.excluir',
        descricao: 'Excluir documento judicial',
        acao: 'documento.excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.documento.assinar',
        descricao: 'Assinar documento judicial digitalmente',
        acao: 'documento.assinar',
        escopo: 'USUARIO'
      },
      
      // Permissões de prazos judiciais
      {
        nome: 'judicial.prazo.listar',
        descricao: 'Listar prazos judiciais',
        acao: 'prazo.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.prazo.visualizar',
        descricao: 'Visualizar detalhes de prazo judicial',
        acao: 'prazo.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.prazo.criar',
        descricao: 'Criar novo prazo judicial',
        acao: 'prazo.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.prazo.editar',
        descricao: 'Editar prazo judicial',
        acao: 'prazo.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.prazo.cumprir',
        descricao: 'Marcar prazo como cumprido',
        acao: 'prazo.cumprir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.prazo.prorrogar',
        descricao: 'Prorrogar prazo judicial',
        acao: 'prazo.prorrogar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de notificações judiciais
      {
        nome: 'judicial.notificacao.listar',
        descricao: 'Listar notificações judiciais',
        acao: 'notificacao.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.notificacao.enviar',
        descricao: 'Enviar notificação judicial',
        acao: 'notificacao.enviar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.notificacao.confirmar',
        descricao: 'Confirmar recebimento de notificação',
        acao: 'notificacao.confirmar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de relatórios judiciais
      {
        nome: 'judicial.relatorio.gerar',
        descricao: 'Gerar relatório judicial',
        acao: 'relatorio.gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'judicial.relatorio.exportar',
        descricao: 'Exportar relatório judicial',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de configuração judicial
      {
        nome: 'judicial.configuracao.visualizar',
        descricao: 'Visualizar configurações judiciais',
        acao: 'configuracao.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'judicial.configuracao.editar',
        descricao: 'Editar configurações judiciais',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL'
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo judicial processadas.`);
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
        `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [nome, descricao, 'judicial', acao, Status.ATIVO]
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