import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '../../../enums/status.enum';

/**
 * Seed de permissões para o módulo de ocorrências
 * 
 * Este seed cria todas as permissões necessárias para o módulo de ocorrências,
 * incluindo permissões para gerenciar incidentes, problemas e eventos do sistema.
 */
export class PermissionOcorrenciaSeed {
  private static readonly logger = new Logger(PermissionOcorrenciaSeed.name);

  /**
   * Executa o seed de permissões do módulo de ocorrências
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de ocorrências...');
    
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
      
      this.logger.log('Seed de permissões do módulo de ocorrências concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de ocorrências: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de ocorrências
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta ocorrencia.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['ocorrencia.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão ocorrencia.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'ocorrencia.*',
        'Todas as permissões do módulo de ocorrências',
        'ocorrencia',
        '*',
        Status.ATIVO
      ]
    );
    
    this.logger.log('Permissão composta ocorrencia.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de ocorrências
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de ocorrências...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões básicas de ocorrência
      {
        nome: 'ocorrencia.listar',
        descricao: 'Listar ocorrências',
        acao: 'listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.visualizar',
        descricao: 'Visualizar detalhes de ocorrência',
        acao: 'visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.criar',
        descricao: 'Criar nova ocorrência',
        acao: 'criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.editar',
        descricao: 'Editar ocorrência existente',
        acao: 'editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.excluir',
        descricao: 'Excluir ocorrência',
        acao: 'excluir',
        escopo: 'UNIDADE'
      },
      
      // Permissões de status de ocorrência
      {
        nome: 'ocorrencia.abrir',
        descricao: 'Abrir nova ocorrência',
        acao: 'abrir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.fechar',
        descricao: 'Fechar ocorrência',
        acao: 'fechar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.reabrir',
        descricao: 'Reabrir ocorrência fechada',
        acao: 'reabrir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.cancelar',
        descricao: 'Cancelar ocorrência',
        acao: 'cancelar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de prioridade
      {
        nome: 'ocorrencia.prioridade.alterar',
        descricao: 'Alterar prioridade da ocorrência',
        acao: 'prioridade.alterar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.prioridade.critica',
        descricao: 'Definir ocorrência como crítica',
        acao: 'prioridade.critica',
        escopo: 'UNIDADE'
      },
      
      // Permissões de atribuição
      {
        nome: 'ocorrencia.atribuir',
        descricao: 'Atribuir ocorrência a usuário',
        acao: 'atribuir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.reatribuir',
        descricao: 'Reatribuir ocorrência para outro usuário',
        acao: 'reatribuir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.assumir',
        descricao: 'Assumir responsabilidade pela ocorrência',
        acao: 'assumir',
        escopo: 'USUARIO'
      },
      
      // Permissões de comentários e atualizações
      {
        nome: 'ocorrencia.comentar',
        descricao: 'Adicionar comentário à ocorrência',
        acao: 'comentar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.comentario.editar',
        descricao: 'Editar comentário próprio',
        acao: 'comentario.editar',
        escopo: 'USUARIO'
      },
      {
        nome: 'ocorrencia.comentario.excluir',
        descricao: 'Excluir comentário',
        acao: 'comentario.excluir',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.atualizar',
        descricao: 'Atualizar status da ocorrência',
        acao: 'atualizar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de anexos
      {
        nome: 'ocorrencia.anexo.adicionar',
        descricao: 'Adicionar anexo à ocorrência',
        acao: 'anexo.adicionar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.anexo.visualizar',
        descricao: 'Visualizar anexos da ocorrência',
        acao: 'anexo.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.anexo.download',
        descricao: 'Fazer download de anexos',
        acao: 'anexo.download',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.anexo.excluir',
        descricao: 'Excluir anexo da ocorrência',
        acao: 'anexo.excluir',
        escopo: 'UNIDADE'
      },
      
      // Permissões de categorização
      {
        nome: 'ocorrencia.categoria.alterar',
        descricao: 'Alterar categoria da ocorrência',
        acao: 'categoria.alterar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.categoria.criar',
        descricao: 'Criar nova categoria de ocorrência',
        acao: 'categoria.criar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'ocorrencia.categoria.editar',
        descricao: 'Editar categoria de ocorrência',
        acao: 'categoria.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'ocorrencia.categoria.excluir',
        descricao: 'Excluir categoria de ocorrência',
        acao: 'categoria.excluir',
        escopo: 'GLOBAL'
      },
      
      // Permissões de escalação
      {
        nome: 'ocorrencia.escalar',
        descricao: 'Escalar ocorrência para nível superior',
        acao: 'escalar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.desescalar',
        descricao: 'Desescalar ocorrência',
        acao: 'desescalar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de notificação
      {
        nome: 'ocorrencia.notificar',
        descricao: 'Enviar notificação sobre ocorrência',
        acao: 'notificar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.notificacao.configurar',
        descricao: 'Configurar notificações automáticas',
        acao: 'notificacao.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de relatórios
      {
        nome: 'ocorrencia.relatorio.gerar',
        descricao: 'Gerar relatório de ocorrências',
        acao: 'relatorio.gerar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.relatorio.exportar',
        descricao: 'Exportar relatório de ocorrências',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.estatistica.visualizar',
        descricao: 'Visualizar estatísticas de ocorrências',
        acao: 'estatistica.visualizar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de histórico
      {
        nome: 'ocorrencia.historico.visualizar',
        descricao: 'Visualizar histórico da ocorrência',
        acao: 'historico.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.historico.exportar',
        descricao: 'Exportar histórico da ocorrência',
        acao: 'historico.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de configuração
      {
        nome: 'ocorrencia.configuracao.visualizar',
        descricao: 'Visualizar configurações de ocorrências',
        acao: 'configuracao.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'ocorrencia.configuracao.editar',
        descricao: 'Editar configurações de ocorrências',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'ocorrencia.template.criar',
        descricao: 'Criar template de ocorrência',
        acao: 'template.criar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'ocorrencia.template.editar',
        descricao: 'Editar template de ocorrência',
        acao: 'template.editar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de auditoria
      {
        nome: 'ocorrencia.auditoria.visualizar',
        descricao: 'Visualizar auditoria de ocorrências',
        acao: 'auditoria.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'ocorrencia.auditoria.exportar',
        descricao: 'Exportar dados de auditoria',
        acao: 'auditoria.exportar',
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de ocorrências processadas.`);
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
        [nome, descricao, 'ocorrencia', acao, Status.ATIVO]
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