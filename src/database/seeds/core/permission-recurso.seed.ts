import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '../../../enums/status.enum';

/**
 * Seed de permissões para o módulo de recursos
 *
 * Este seed cria todas as permissões necessárias para o módulo de recursos,
 * incluindo permissões para gerenciar recursos administrativos e judiciais.
 */
export class PermissionRecursoSeed {
  private static readonly logger = new Logger(PermissionRecursoSeed.name);

  /**
   * Executa o seed de permissões do módulo de recursos
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de recursos...');

    try {
      // Verificar a estrutura da tabela permissao
      this.logger.log('Verificando estrutura da tabela permissao...');
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permissao'`,
      );

      if (tableInfo.length === 0) {
        throw new Error('Tabela permissao não encontrada no banco de dados');
      }

      // Verificar se a tabela permission_scope existe
      const scopeTableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permission_scope'`,
      );

      const hasPermissionScope = scopeTableInfo.length > 0;
      this.logger.log(
        `Tabela permission_scope ${hasPermissionScope ? 'encontrada' : 'não encontrada'}`,
      );

      // Criar permissão composta para o módulo
      await this.createCompositePermission(dataSource);

      // Criar permissões granulares
      await this.createGranularPermissions(dataSource, hasPermissionScope);

      this.logger.log(
        'Seed de permissões do módulo de recursos concluído com sucesso!',
      );
    } catch (error) {
      this.logger.error(
        `Erro ao executar seed de permissões de recursos: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de recursos
   */
  private static async createCompositePermission(
    dataSource: DataSource,
  ): Promise<void> {
    this.logger.log('Criando permissão composta recurso.*...');

    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['recurso.*'],
    );

    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão recurso.* já existe, pulando...');
      return;
    }

    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'recurso.*',
        'Todas as permissões do módulo de recursos',
        'recurso',
        '*',
        Status.ATIVO,
      ],
    );

    this.logger.log('Permissão composta recurso.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de recursos
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean,
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de recursos...');

    // Definir permissões granulares
    const permissions = [
      // Permissões básicas de recurso
      {
        nome: 'recurso.listar',
        descricao: 'Listar recursos',
        acao: 'listar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.visualizar',
        descricao: 'Visualizar detalhes do recurso',
        acao: 'visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.criar',
        descricao: 'Criar novo recurso',
        acao: 'criar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.editar',
        descricao: 'Editar recurso',
        acao: 'editar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.excluir',
        descricao: 'Excluir recurso',
        acao: 'excluir',
        escopo: 'UNIDADE',
      },

      // Permissões de protocolo
      {
        nome: 'recurso.protocolar',
        descricao: 'Protocolar recurso',
        acao: 'protocolar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.protocolo.visualizar',
        descricao: 'Visualizar protocolo do recurso',
        acao: 'protocolo.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.protocolo.editar',
        descricao: 'Editar dados do protocolo',
        acao: 'protocolo.editar',
        escopo: 'UNIDADE',
      },

      // Permissões de análise
      {
        nome: 'recurso.analisar',
        descricao: 'Analisar recurso',
        acao: 'analisar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.parecer.criar',
        descricao: 'Criar parecer técnico',
        acao: 'parecer.criar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.parecer.editar',
        descricao: 'Editar parecer técnico',
        acao: 'parecer.editar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.parecer.visualizar',
        descricao: 'Visualizar parecer técnico',
        acao: 'parecer.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.parecer.aprovar',
        descricao: 'Aprovar parecer técnico',
        acao: 'parecer.aprovar',
        escopo: 'UNIDADE',
      },

      // Permissões de decisão
      {
        nome: 'recurso.decidir',
        descricao: 'Decidir sobre recurso',
        acao: 'decidir',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.deferir',
        descricao: 'Deferir recurso',
        acao: 'deferir',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.indeferir',
        descricao: 'Indeferir recurso',
        acao: 'indeferir',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.decisao.fundamentar',
        descricao: 'Fundamentar decisão do recurso',
        acao: 'decisao.fundamentar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.decisao.publicar',
        descricao: 'Publicar decisão do recurso',
        acao: 'decisao.publicar',
        escopo: 'UNIDADE',
      },

      // Permissões de tramitação
      {
        nome: 'recurso.tramitar',
        descricao: 'Tramitar recurso entre setores',
        acao: 'tramitar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.encaminhar',
        descricao: 'Encaminhar recurso para análise',
        acao: 'encaminhar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.devolver',
        descricao: 'Devolver recurso para correção',
        acao: 'devolver',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.receber',
        descricao: 'Receber recurso para análise',
        acao: 'receber',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.historico.tramitacao',
        descricao: 'Visualizar histórico de tramitação',
        acao: 'historico.tramitacao',
        escopo: 'UNIDADE',
      },

      // Permissões de prazo
      {
        nome: 'recurso.prazo.visualizar',
        descricao: 'Visualizar prazos do recurso',
        acao: 'prazo.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.prazo.prorrogar',
        descricao: 'Prorrogar prazo do recurso',
        acao: 'prazo.prorrogar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.prazo.suspender',
        descricao: 'Suspender prazo do recurso',
        acao: 'prazo.suspender',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.prazo.restabelecer',
        descricao: 'Restabelecer prazo suspenso',
        acao: 'prazo.restabelecer',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.prazo.monitorar',
        descricao: 'Monitorar prazos em vencimento',
        acao: 'prazo.monitorar',
        escopo: 'UNIDADE',
      },

      // Permissões de documentação
      {
        nome: 'recurso.documento.anexar',
        descricao: 'Anexar documentos ao recurso',
        acao: 'documento.anexar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.documento.visualizar',
        descricao: 'Visualizar documentos do recurso',
        acao: 'documento.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.documento.remover',
        descricao: 'Remover documentos do recurso',
        acao: 'documento.remover',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.documento.validar',
        descricao: 'Validar documentos anexados',
        acao: 'documento.validar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.documento.solicitar',
        descricao: 'Solicitar documentos complementares',
        acao: 'documento.solicitar',
        escopo: 'UNIDADE',
      },

      // Permissões de notificação
      {
        nome: 'recurso.notificar.interessado',
        descricao: 'Notificar interessado sobre recurso',
        acao: 'notificar.interessado',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.notificar.decisao',
        descricao: 'Notificar decisão do recurso',
        acao: 'notificar.decisao',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.notificar.prazo',
        descricao: 'Notificar sobre prazos',
        acao: 'notificar.prazo',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.notificacao.visualizar',
        descricao: 'Visualizar notificações enviadas',
        acao: 'notificacao.visualizar',
        escopo: 'UNIDADE',
      },

      // Permissões de recurso hierárquico
      {
        nome: 'recurso.hierarquico.criar',
        descricao: 'Criar recurso hierárquico',
        acao: 'hierarquico.criar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.hierarquico.analisar',
        descricao: 'Analisar recurso hierárquico',
        acao: 'hierarquico.analisar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.hierarquico.decidir',
        descricao: 'Decidir recurso hierárquico',
        acao: 'hierarquico.decidir',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.hierarquico.encaminhar',
        descricao: 'Encaminhar para instância superior',
        acao: 'hierarquico.encaminhar',
        escopo: 'UNIDADE',
      },

      // Permissões de comissão de recursos
      {
        nome: 'recurso.comissao.designar',
        descricao: 'Designar comissão de recursos',
        acao: 'comissao.designar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.comissao.participar',
        descricao: 'Participar de comissão de recursos',
        acao: 'comissao.participar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.comissao.presidir',
        descricao: 'Presidir comissão de recursos',
        acao: 'comissao.presidir',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.comissao.votar',
        descricao: 'Votar em comissão de recursos',
        acao: 'comissao.votar',
        escopo: 'GLOBAL',
      },

      // Permissões de relatórios
      {
        nome: 'recurso.relatorio.geral',
        descricao: 'Gerar relatório geral de recursos',
        acao: 'relatorio.geral',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.relatorio.estatistico',
        descricao: 'Gerar relatório estatístico',
        acao: 'relatorio.estatistico',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.relatorio.prazo',
        descricao: 'Gerar relatório de prazos',
        acao: 'relatorio.prazo',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.relatorio.decisao',
        descricao: 'Gerar relatório de decisões',
        acao: 'relatorio.decisao',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.relatorio.exportar',
        descricao: 'Exportar relatórios de recursos',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE',
      },

      // Permissões de auditoria
      {
        nome: 'recurso.auditoria.visualizar',
        descricao: 'Visualizar auditoria de recursos',
        acao: 'auditoria.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.auditoria.exportar',
        descricao: 'Exportar dados de auditoria',
        acao: 'auditoria.exportar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.auditoria.trilha',
        descricao: 'Visualizar trilha de auditoria',
        acao: 'auditoria.trilha',
        escopo: 'UNIDADE',
      },

      // Permissões de configuração
      {
        nome: 'recurso.configuracao.visualizar',
        descricao: 'Visualizar configurações de recursos',
        acao: 'configuracao.visualizar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.configuracao.editar',
        descricao: 'Editar configurações de recursos',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.tipo.configurar',
        descricao: 'Configurar tipos de recursos',
        acao: 'tipo.configurar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.fluxo.configurar',
        descricao: 'Configurar fluxo de tramitação',
        acao: 'fluxo.configurar',
        escopo: 'GLOBAL',
      },
      {
        nome: 'recurso.prazo.configurar',
        descricao: 'Configurar prazos padrão',
        acao: 'prazo.configurar',
        escopo: 'GLOBAL',
      },

      // Permissões de monitoramento
      {
        nome: 'recurso.monitorar.pendencias',
        descricao: 'Monitorar recursos pendentes',
        acao: 'monitorar.pendencias',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.monitorar.prazos',
        descricao: 'Monitorar prazos em vencimento',
        acao: 'monitorar.prazos',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.dashboard.visualizar',
        descricao: 'Visualizar dashboard de recursos',
        acao: 'dashboard.visualizar',
        escopo: 'UNIDADE',
      },
      {
        nome: 'recurso.indicador.visualizar',
        descricao: 'Visualizar indicadores de recursos',
        acao: 'indicador.visualizar',
        escopo: 'UNIDADE',
      },
    ];

    // Inserir cada permissão
    for (const permission of permissions) {
      await this.createPermissionIfNotExists(
        dataSource,
        permission.nome,
        permission.descricao,
        permission.acao,
        hasPermissionScope ? permission.escopo : null,
      );
    }

    this.logger.log(
      `${permissions.length} permissões granulares do módulo de recursos processadas.`,
    );
  }

  /**
   * Cria uma permissão se ela não existir
   */
  private static async createPermissionIfNotExists(
    dataSource: DataSource,
    nome: string,
    descricao: string,
    acao: string,
    escopo: string | null,
  ): Promise<void> {
    try {
      // Verificar se a permissão já existe
      const existingResult = await dataSource.query(
        `SELECT id FROM permissao WHERE nome = $1`,
        [nome],
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
        [nome, descricao, 'recurso', acao, Status.ATIVO],
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
    escopo: string,
  ): Promise<void> {
    try {
      // Verificar se o escopo já existe para esta permissão
      const existingScopeResult = await dataSource.query(
        `SELECT id FROM permission_scope WHERE permission_id = $1 AND scope = $2`,
        [permissionId, escopo],
      );

      if (existingScopeResult && existingScopeResult.length > 0) {
        this.logger.log(
          `Escopo '${escopo}' já existe para permissão ID ${permissionId}, pulando...`,
        );
        return;
      }

      // Inserir novo escopo
      await dataSource.query(
        `INSERT INTO permission_scope (permission_id, scope) VALUES ($1, $2)`,
        [permissionId, escopo],
      );

      this.logger.log(
        `Escopo '${escopo}' criado para permissão ID ${permissionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao criar escopo ${escopo} para permissão ${permissionId}: ${error.message}`,
      );
      // Não propagar o erro para não interromper o seed por problemas de escopo
    }
  }
}
