import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { Logger } from '@nestjs/common';
import { Status } from '@/enums/status.enum';

/**
 * Seed de permissões para o módulo de pagamentos
 * 
 * Este seed cria todas as permissões necessárias para o módulo de pagamentos,
 * incluindo permissões para processar, autorizar e gerenciar pagamentos de benefícios.
 */
export class PermissionPagamentoSeed {
  private static readonly logger = new Logger(PermissionPagamentoSeed.name);

  /**
   * Executa o seed de permissões do módulo de pagamentos
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de pagamentos...');
    
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
      
      this.logger.log('Seed de permissões do módulo de pagamentos concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões de pagamentos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria a permissão composta para o módulo de pagamentos
   */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    this.logger.log('Criando permissão composta pagamento.*...');
    
    // Verificar se já existe
    const existingResult = await dataSource.query(
      `SELECT id FROM permissao WHERE nome = $1`,
      ['pagamento.*']
    );
    
    if (existingResult && existingResult.length > 0) {
      this.logger.log('Permissão pagamento.* já existe, pulando...');
      return;
    }
    
    // Inserir permissão composta
    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'pagamento.*',
        'Todas as permissões do módulo de pagamentos',
        'pagamento',
        '*',
        Status.ATIVO
      ]
    );
    
    this.logger.log('Permissão composta pagamento.* criada com sucesso.');
  }

  /**
   * Cria as permissões granulares para o módulo de pagamentos
   */
  private static async createGranularPermissions(
    dataSource: DataSource,
    hasPermissionScope: boolean
  ): Promise<void> {
    this.logger.log('Criando permissões granulares do módulo de pagamentos...');
    
    // Definir permissões granulares
    const permissions = [
      // Permissões básicas de pagamento
      {
        nome: 'pagamento.listar',
        descricao: 'Listar pagamentos',
        acao: 'listar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.visualizar',
        descricao: 'Visualizar detalhes de pagamento',
        acao: 'visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.criar',
        descricao: 'Criar novo pagamento',
        acao: 'criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.editar',
        descricao: 'Editar pagamento pendente',
        acao: 'editar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.cancelar',
        descricao: 'Cancelar pagamento',
        acao: 'cancelar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de processamento
      {
        nome: 'pagamento.processar',
        descricao: 'Processar pagamento',
        acao: 'processar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.autorizar',
        descricao: 'Autorizar pagamento',
        acao: 'autorizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.rejeitar',
        descricao: 'Rejeitar pagamento',
        acao: 'rejeitar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.confirmar',
        descricao: 'Confirmar pagamento realizado',
        acao: 'confirmar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de lote
      {
        nome: 'pagamento.lote.criar',
        descricao: 'Criar lote de pagamentos',
        acao: 'lote.criar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.lote.visualizar',
        descricao: 'Visualizar lote de pagamentos',
        acao: 'lote.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.lote.processar',
        descricao: 'Processar lote de pagamentos',
        acao: 'lote.processar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.lote.autorizar',
        descricao: 'Autorizar lote de pagamentos',
        acao: 'lote.autorizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.lote.cancelar',
        descricao: 'Cancelar lote de pagamentos',
        acao: 'lote.cancelar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.lote.exportar',
        descricao: 'Exportar lote para banco',
        acao: 'lote.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de validação
      {
        nome: 'pagamento.validar.dados',
        descricao: 'Validar dados bancários',
        acao: 'validar.dados',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.validar.beneficiario',
        descricao: 'Validar dados do beneficiário',
        acao: 'validar.beneficiario',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.validar.valor',
        descricao: 'Validar valor do pagamento',
        acao: 'validar.valor',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.validar.duplicidade',
        descricao: 'Validar duplicidade de pagamentos',
        acao: 'validar.duplicidade',
        escopo: 'UNIDADE'
      },
      
      // Permissões de conciliação
      {
        nome: 'pagamento.conciliar',
        descricao: 'Conciliar pagamentos com retorno bancário',
        acao: 'conciliar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.conciliacao.automatica',
        descricao: 'Executar conciliação automática',
        acao: 'conciliacao.automatica',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.conciliacao.manual',
        descricao: 'Realizar conciliação manual',
        acao: 'conciliacao.manual',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.conciliacao.relatorio',
        descricao: 'Gerar relatório de conciliação',
        acao: 'conciliacao.relatorio',
        escopo: 'UNIDADE'
      },
      
      // Permissões de estorno
      {
        nome: 'pagamento.estornar',
        descricao: 'Estornar pagamento',
        acao: 'estornar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.estorno.autorizar',
        descricao: 'Autorizar estorno de pagamento',
        acao: 'estorno.autorizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.estorno.processar',
        descricao: 'Processar estorno autorizado',
        acao: 'estorno.processar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de consulta
      {
        nome: 'pagamento.consultar.status',
        descricao: 'Consultar status no banco',
        acao: 'consultar.status',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.consultar.historico',
        descricao: 'Consultar histórico de pagamentos',
        acao: 'consultar.historico',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.consultar.extrato',
        descricao: 'Consultar extrato bancário',
        acao: 'consultar.extrato',
        escopo: 'UNIDADE'
      },
      
      // Permissões de configuração bancária
      {
        nome: 'pagamento.banco.configurar',
        descricao: 'Configurar dados bancários',
        acao: 'banco.configurar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.banco.testar',
        descricao: 'Testar conexão bancária',
        acao: 'banco.testar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.banco.listar',
        descricao: 'Listar bancos disponíveis',
        acao: 'banco.listar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de arquivo de retorno
      {
        nome: 'pagamento.retorno.importar',
        descricao: 'Importar arquivo de retorno bancário',
        acao: 'retorno.importar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.retorno.processar',
        descricao: 'Processar arquivo de retorno',
        acao: 'retorno.processar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.retorno.visualizar',
        descricao: 'Visualizar detalhes do retorno',
        acao: 'retorno.visualizar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de relatórios financeiros
      {
        nome: 'pagamento.relatorio.financeiro',
        descricao: 'Gerar relatório financeiro',
        acao: 'relatorio.financeiro',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.relatorio.pagamentos',
        descricao: 'Gerar relatório de pagamentos',
        acao: 'relatorio.pagamentos',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.relatorio.estornos',
        descricao: 'Gerar relatório de estornos',
        acao: 'relatorio.estornos',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.relatorio.exportar',
        descricao: 'Exportar relatórios financeiros',
        acao: 'relatorio.exportar',
        escopo: 'UNIDADE'
      },
      
      // Permissões de auditoria financeira
      {
        nome: 'pagamento.auditoria.visualizar',
        descricao: 'Visualizar auditoria de pagamentos',
        acao: 'auditoria.visualizar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.auditoria.exportar',
        descricao: 'Exportar dados de auditoria',
        acao: 'auditoria.exportar',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.auditoria.trilha',
        descricao: 'Visualizar trilha de auditoria',
        acao: 'auditoria.trilha',
        escopo: 'UNIDADE'
      },
      
      // Permissões de configuração
      {
        nome: 'pagamento.configuracao.visualizar',
        descricao: 'Visualizar configurações de pagamento',
        acao: 'configuracao.visualizar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.configuracao.editar',
        descricao: 'Editar configurações de pagamento',
        acao: 'configuracao.editar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.limite.configurar',
        descricao: 'Configurar limites de pagamento',
        acao: 'limite.configurar',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.calendario.configurar',
        descricao: 'Configurar calendário de pagamentos',
        acao: 'calendario.configurar',
        escopo: 'GLOBAL'
      },
      
      // Permissões de monitoramento
      {
        nome: 'pagamento.monitorar.fila',
        descricao: 'Monitorar fila de pagamentos',
        acao: 'monitorar.fila',
        escopo: 'GLOBAL'
      },
      {
        nome: 'pagamento.monitorar.status',
        descricao: 'Monitorar status dos pagamentos',
        acao: 'monitorar.status',
        escopo: 'UNIDADE'
      },
      {
        nome: 'pagamento.dashboard.visualizar',
        descricao: 'Visualizar dashboard de pagamentos',
        acao: 'dashboard.visualizar',
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
    
    this.logger.log(`${permissions.length} permissões granulares do módulo de pagamentos processadas.`);
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
        [nome, descricao, 'pagamento', acao, Status.ATIVO]
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