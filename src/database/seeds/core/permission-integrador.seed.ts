import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '../../../enums/status.enum';

/**
 * Seed de permissões para o módulo de integrador
 * 
 * Este seed cria todas as permissões necessárias para o módulo de integrador,
 * incluindo permissões para gerenciar integrações com sistemas externos como CadÚnico, SUAS, etc.
 */
export class PermissionIntegradorSeed {
  private static readonly logger = new Logger(PermissionIntegradorSeed.name);

  /**
   * Executa o seed de permissões do módulo de integrador
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de integrador...');
    
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
      
      this.logger.log('Seed de permissões do módulo de integrador concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de integrador: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de integrador
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta integrador.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['integrador.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão integrador.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'integrador.*',
        'Todas as permissões do módulo de integrador',
        'integrador',
        '*',
        Status.ATIVO
      ]
    );
    
    this.logger.log('Permissão composta integrador.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de integrador
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de integrador...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões gerais de integração
      {
        nome: 'integrador.listar',
        descricao: 'Listar integrações disponíveis',
        acao: 'listar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.visualizar',
        descricao: 'Visualizar detalhes de integração',
        acao: 'visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.configurar',
        descricao: 'Configurar parâmetros de integração',
        acao: 'configurar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.testar',
        descricao: 'Testar conectividade de integração',
        acao: 'testar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.ativar',
        descricao: 'Ativar integração',
        acao: 'ativar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.desativar',
        descricao: 'Desativar integração',
        acao: 'desativar',
        escopo: 'GLOBAL'
      },
      
      // Permissões específicas do CadÚnico
      {
        nome: 'integrador.cadunico.consultar',
        descricao: 'Consultar dados no CadÚnico',
        acao: 'cadunico.consultar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.cadunico.sincronizar',
        descricao: 'Sincronizar dados com CadÚnico',
        acao: 'cadunico.sincronizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.cadunico.validar',
        descricao: 'Validar dados do CadÚnico',
        acao: 'cadunico.validar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.cadunico.configurar',
        descricao: 'Configurar integração com CadÚnico',
        acao: 'cadunico.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões específicas do SUAS
      {
        nome: 'integrador.suas.consultar',
        descricao: 'Consultar dados no SUAS',
        acao: 'suas.consultar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.suas.enviar',
        descricao: 'Enviar dados para o SUAS',
        acao: 'suas.enviar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.suas.sincronizar',
        descricao: 'Sincronizar dados com SUAS',
        acao: 'suas.sincronizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.suas.configurar',
        descricao: 'Configurar integração com SUAS',
        acao: 'suas.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de sistemas bancários
      {
        nome: 'integrador.banco.consultar',
        descricao: 'Consultar dados bancários',
        acao: 'banco.consultar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.banco.validar',
        descricao: 'Validar dados bancários',
        acao: 'banco.validar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.banco.configurar',
        descricao: 'Configurar integração bancária',
        acao: 'banco.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de sistemas de pagamento
      {
        nome: 'integrador.pagamento.processar',
        descricao: 'Processar pagamentos via integração',
        acao: 'pagamento.processar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.pagamento.consultar',
        descricao: 'Consultar status de pagamentos',
        acao: 'pagamento.consultar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.pagamento.configurar',
        descricao: 'Configurar integração de pagamento',
        acao: 'pagamento.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de logs e monitoramento
      {
        nome: 'integrador.log.visualizar',
        descricao: 'Visualizar logs de integração',
        acao: 'log.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.log.exportar',
        descricao: 'Exportar logs de integração',
        acao: 'log.exportar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.monitoramento.visualizar',
        descricao: 'Visualizar status de monitoramento',
        acao: 'monitoramento.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.monitoramento.configurar',
        descricao: 'Configurar alertas de monitoramento',
        acao: 'monitoramento.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de sincronização
      {
        nome: 'integrador.sincronizacao.executar',
        descricao: 'Executar sincronização manual',
        acao: 'sincronizacao.executar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.sincronizacao.agendar',
        descricao: 'Agendar sincronização automática',
        acao: 'sincronizacao.agendar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.sincronizacao.historico',
        descricao: 'Visualizar histórico de sincronizações',
        acao: 'sincronizacao.historico',
        escopo: 'UNIDADE'
      },
      
      // Permissões de relatórios
      {
        nome: 'integrador.relatorio.gerar',
        descricao: 'Gerar relatório de integrações',
        acao: 'relatorio.gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'integrador.relatorio.exportar',
        descricao: 'Exportar relatório de integrações',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de manutenção
      {
        nome: 'integrador.manutencao.executar',
        descricao: 'Executar rotinas de manutenção',
        acao: 'manutencao.executar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'integrador.cache.limpar',
        descricao: 'Limpar cache de integrações',
        acao: 'cache.limpar',
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de integrador processadas.`);
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
        [nome, descricao, 'integrador', acao, Status.ATIVO]
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