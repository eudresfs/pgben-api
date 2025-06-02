import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '@/enums/status.enum';

/**
 * Seed de permissões para o módulo de métricas
 * 
 * Este seed cria todas as permissões necessárias para o módulo de métricas,
 * incluindo permissões para visualizar dashboards, gerar relatórios e configurar indicadores.
 */
export class PermissionMetricasSeed {
  private static readonly logger = new Logger(PermissionMetricasSeed.name);

  /**
   * Executa o seed de permissões do módulo de métricas
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de métricas...');
    
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
      
      this.logger.log('Seed de permissões do módulo de métricas concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de métricas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de métricas
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta metrica.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['metrica.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão metrica.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'metrica.*',
        'Todas as permissões do módulo de métricas',
        'metrica',
        '*',
        Status.ATIVO
      ]
    );
    
    this.logger.log('Permissão composta metrica.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de métricas
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de métricas...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões de dashboard
      {
        nome: 'metrica.dashboard.visualizar',
        descricao: 'Visualizar dashboard de métricas',
        acao: 'dashboard.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.dashboard.configurar',
        descricao: 'Configurar dashboard de métricas',
        acao: 'dashboard.configurar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.dashboard.exportar',
        descricao: 'Exportar dashboard de métricas',
        acao: 'dashboard.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de indicadores
      {
        nome: 'metrica.indicador.listar',
        descricao: 'Listar indicadores de performance',
        acao: 'indicador.listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.indicador.visualizar',
        descricao: 'Visualizar detalhes de indicador',
        acao: 'indicador.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.indicador.criar',
        descricao: 'Criar novo indicador',
        acao: 'indicador.criar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'metrica.indicador.editar',
        descricao: 'Editar indicador existente',
        acao: 'indicador.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'metrica.indicador.excluir',
        descricao: 'Excluir indicador',
        acao: 'indicador.excluir',
        escopo: 'GLOBAL'
      },
      {
        nome: 'metrica.indicador.ativar',
        descricao: 'Ativar indicador',
        acao: 'indicador.ativar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'metrica.indicador.desativar',
        descricao: 'Desativar indicador',
        acao: 'indicador.desativar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios de métricas
      {
        nome: 'metrica.relatorio.gerar',
        descricao: 'Gerar relatório de métricas',
        acao: 'relatorio.gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.relatorio.agendar',
        descricao: 'Agendar geração de relatório',
        acao: 'relatorio.agendar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.relatorio.exportar',
        descricao: 'Exportar relatório de métricas',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de análise
      {
        nome: 'metrica.analise.tendencia',
        descricao: 'Visualizar análise de tendências',
        acao: 'analise.tendencia',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.analise.comparativa',
        descricao: 'Realizar análise comparativa',
        acao: 'analise.comparativa',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.analise.preditiva',
        descricao: 'Acessar análise preditiva',
        acao: 'analise.preditiva',
        escopo: 'UNIDADE'
      },
      
      // Permissões de configuração
      {
        nome: 'metrica.configuracao.metas',
        descricao: 'Configurar metas de indicadores',
        acao: 'configuracao.metas',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.configuracao.alertas',
        descricao: 'Configurar alertas de métricas',
        acao: 'configuracao.alertas',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.configuracao.periodicidade',
        descricao: 'Configurar periodicidade de coleta',
        acao: 'configuracao.periodicidade',
        escopo: 'GLOBAL'
      },
      
      // Permissões de auditoria de métricas
      {
        nome: 'metrica.auditoria.visualizar',
        descricao: 'Visualizar auditoria de métricas',
        acao: 'auditoria.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.auditoria.exportar',
        descricao: 'Exportar dados de auditoria',
        acao: 'auditoria.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de dados brutos
      {
        nome: 'metrica.dados.visualizar',
        descricao: 'Visualizar dados brutos de métricas',
        acao: 'dados.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'metrica.dados.exportar',
        descricao: 'Exportar dados brutos',
        acao: 'dados.exportar',
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de métricas processadas.`);
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
        [nome, descricao, 'metrica', acao, Status.ATIVO]
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