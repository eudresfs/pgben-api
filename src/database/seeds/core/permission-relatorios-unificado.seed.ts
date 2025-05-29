import { DataSource } from 'typeorm';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionScope } from '../../../auth/entities/permission-scope.entity';
import { Logger } from '@nestjs/common';

/**
 * Seed de permissões para o módulo de relatórios unificado
 * 
 * Este seed cria todas as permissões necessárias para o módulo de relatórios unificado,
 * incluindo permissões para gerar, visualizar e gerenciar relatórios consolidados.
 */
export class PermissionRelatoriosUnificadoSeed {
  private static readonly logger = new Logger(PermissionRelatoriosUnificadoSeed.name);

  /**
   * Executa o seed de permissões do módulo de relatórios unificado
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de relatórios unificado...');
    
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
      
      this.logger.log('Seed de permissões do módulo de relatórios unificado concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de relatórios unificado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de relatórios unificado
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta relatorios-unificado.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['relatorios-unificado.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão relatorios-unificado.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'relatorios-unificado.*',
        'Todas as permissões do módulo de relatórios unificado',
        'relatorios-unificado',
        '*',
        true
      ]
    );
    
    this.logger.log('Permissão composta relatorios-unificado.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de relatórios unificado
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de relatórios unificado...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões básicas de relatórios
      {
        nome: 'relatorios-unificado.listar',
        descricao: 'Listar relatórios disponíveis',
        acao: 'listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.visualizar',
        descricao: 'Visualizar relatórios gerados',
        acao: 'visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.gerar',
        descricao: 'Gerar novos relatórios',
        acao: 'gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.exportar',
        descricao: 'Exportar relatórios em diversos formatos',
        acao: 'exportar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.agendar',
        descricao: 'Agendar geração automática de relatórios',
        acao: 'agendar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de relatórios operacionais
      {
        nome: 'relatorios-unificado.operacional.beneficios',
        descricao: 'Gerar relatório operacional de benefícios',
        acao: 'operacional.beneficios',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.operacional.solicitacoes',
        descricao: 'Gerar relatório operacional de solicitações',
        acao: 'operacional.solicitacoes',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.operacional.cidadaos',
        descricao: 'Gerar relatório operacional de cidadãos',
        acao: 'operacional.cidadaos',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.operacional.usuarios',
        descricao: 'Gerar relatório operacional de usuários',
        acao: 'operacional.usuarios',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.operacional.unidades',
        descricao: 'Gerar relatório operacional de unidades',
        acao: 'operacional.unidades',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios gerenciais
      {
        nome: 'relatorios-unificado.gerencial.dashboard',
        descricao: 'Gerar relatório gerencial de dashboard',
        acao: 'gerencial.dashboard',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.gerencial.indicadores',
        descricao: 'Gerar relatório gerencial de indicadores',
        acao: 'gerencial.indicadores',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.gerencial.performance',
        descricao: 'Gerar relatório gerencial de performance',
        acao: 'gerencial.performance',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.gerencial.produtividade',
        descricao: 'Gerar relatório gerencial de produtividade',
        acao: 'gerencial.produtividade',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.gerencial.consolidado',
        descricao: 'Gerar relatório gerencial consolidado',
        acao: 'gerencial.consolidado',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios estatísticos
      {
        nome: 'relatorios-unificado.estatistico.mensal',
        descricao: 'Gerar relatório estatístico mensal',
        acao: 'estatistico.mensal',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.estatistico.trimestral',
        descricao: 'Gerar relatório estatístico trimestral',
        acao: 'estatistico.trimestral',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.estatistico.anual',
        descricao: 'Gerar relatório estatístico anual',
        acao: 'estatistico.anual',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.estatistico.comparativo',
        descricao: 'Gerar relatório estatístico comparativo',
        acao: 'estatistico.comparativo',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.estatistico.tendencia',
        descricao: 'Gerar relatório de análise de tendências',
        acao: 'estatistico.tendencia',
        escopo: 'UNIDADE'
      },
      
      // Permissões de relatórios financeiros
      {
        nome: 'relatorios-unificado.financeiro.pagamentos',
        descricao: 'Gerar relatório financeiro de pagamentos',
        acao: 'financeiro.pagamentos',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.financeiro.orcamento',
        descricao: 'Gerar relatório financeiro de orçamento',
        acao: 'financeiro.orcamento',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.financeiro.execucao',
        descricao: 'Gerar relatório de execução financeira',
        acao: 'financeiro.execucao',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.financeiro.conciliacao',
        descricao: 'Gerar relatório de conciliação financeira',
        acao: 'financeiro.conciliacao',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.financeiro.auditoria',
        descricao: 'Gerar relatório de auditoria financeira',
        acao: 'financeiro.auditoria',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios de compliance
      {
        nome: 'relatorios-unificado.compliance.lgpd',
        descricao: 'Gerar relatório de compliance LGPD',
        acao: 'compliance.lgpd',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.compliance.auditoria',
        descricao: 'Gerar relatório de compliance e auditoria',
        acao: 'compliance.auditoria',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.compliance.acesso',
        descricao: 'Gerar relatório de controle de acesso',
        acao: 'compliance.acesso',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.compliance.seguranca',
        descricao: 'Gerar relatório de segurança',
        acao: 'compliance.seguranca',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios de integração
      {
        nome: 'relatorios-unificado.integracao.cadunico',
        descricao: 'Gerar relatório de integração CadÚnico',
        acao: 'integracao.cadunico',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.integracao.suas',
        descricao: 'Gerar relatório de integração SUAS',
        acao: 'integracao.suas',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.integracao.bancaria',
        descricao: 'Gerar relatório de integração bancária',
        acao: 'integracao.bancaria',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.integracao.status',
        descricao: 'Gerar relatório de status das integrações',
        acao: 'integracao.status',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.integracao.erros',
        descricao: 'Gerar relatório de erros de integração',
        acao: 'integracao.erros',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios customizados
      {
        nome: 'relatorios-unificado.customizado.criar',
        descricao: 'Criar relatórios customizados',
        acao: 'customizado.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.customizado.editar',
        descricao: 'Editar relatórios customizados',
        acao: 'customizado.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.customizado.excluir',
        descricao: 'Excluir relatórios customizados',
        acao: 'customizado.excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.customizado.compartilhar',
        descricao: 'Compartilhar relatórios customizados',
        acao: 'customizado.compartilhar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.customizado.template',
        descricao: 'Gerenciar templates de relatórios',
        acao: 'customizado.template',
        escopo: 'GLOBAL'
      },
      
      // Permissões de agendamento
      {
        nome: 'relatorios-unificado.agendamento.criar',
        descricao: 'Criar agendamento de relatórios',
        acao: 'agendamento.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.agendamento.editar',
        descricao: 'Editar agendamento de relatórios',
        acao: 'agendamento.editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.agendamento.excluir',
        descricao: 'Excluir agendamento de relatórios',
        acao: 'agendamento.excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.agendamento.executar',
        descricao: 'Executar agendamento manualmente',
        acao: 'agendamento.executar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.agendamento.monitorar',
        descricao: 'Monitorar execução de agendamentos',
        acao: 'agendamento.monitorar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de distribuição
      {
        nome: 'relatorios-unificado.distribuicao.email',
        descricao: 'Distribuir relatórios por email',
        acao: 'distribuicao.email',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.distribuicao.ftp',
        descricao: 'Distribuir relatórios via FTP',
        acao: 'distribuicao.ftp',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.distribuicao.api',
        descricao: 'Distribuir relatórios via API',
        acao: 'distribuicao.api',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.distribuicao.configurar',
        descricao: 'Configurar canais de distribuição',
        acao: 'distribuicao.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de histórico
      {
        nome: 'relatorios-unificado.historico.visualizar',
        descricao: 'Visualizar histórico de relatórios',
        acao: 'historico.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.historico.reexecutar',
        descricao: 'Reexecutar relatórios do histórico',
        acao: 'historico.reexecutar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.historico.excluir',
        descricao: 'Excluir relatórios do histórico',
        acao: 'historico.excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'relatorios-unificado.historico.arquivar',
        descricao: 'Arquivar relatórios antigos',
        acao: 'historico.arquivar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de configuração
      {
        nome: 'relatorios-unificado.configuracao.visualizar',
        descricao: 'Visualizar configurações de relatórios',
        acao: 'configuracao.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.configuracao.editar',
        descricao: 'Editar configurações de relatórios',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.fonte.configurar',
        descricao: 'Configurar fontes de dados',
        acao: 'fonte.configurar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.formato.configurar',
        descricao: 'Configurar formatos de exportação',
        acao: 'formato.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de monitoramento
      {
        nome: 'relatorios-unificado.monitorar.performance',
        descricao: 'Monitorar performance dos relatórios',
        acao: 'monitorar.performance',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.monitorar.uso',
        descricao: 'Monitorar uso dos relatórios',
        acao: 'monitorar.uso',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.monitorar.erros',
        descricao: 'Monitorar erros na geração',
        acao: 'monitorar.erros',
        escopo: 'GLOBAL'
      },
      {
        nome: 'relatorios-unificado.dashboard.admin',
        descricao: 'Visualizar dashboard administrativo',
        acao: 'dashboard.admin',
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de relatórios unificado processadas.`);
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
        [nome, descricao, 'relatorios-unificado', acao, true]
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