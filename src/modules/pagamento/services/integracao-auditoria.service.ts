import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoAuditoriaService,
  IContextoUsuario,
  IResultadoOperacao,
  IEventoAuditoria,
  IFiltrosAuditoria,
  IPaginatedAuditoria,
  IParametrosRelatorio,
  IRelatorioAuditoria,
  IPeriodoVerificacao,
  IVerificacaoIntegridade,
  ICriteriosArquivamento,
  IResultadoArquivamento,
  IRegistroAuditoria,
  IProblemaIntegridade
} from '../interfaces';
import { LogAuditoria } from '../../../entities';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums';

/**
 * Serviço de integração com auditoria
 * Implementação concreta da interface IIntegracaoAuditoriaService
 * Utiliza os serviços reais do sistema para operações de auditoria
 */
@Injectable()
export class IntegracaoAuditoriaService implements IIntegracaoAuditoriaService {
  private readonly logger = new Logger(IntegracaoAuditoriaService.name);

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly auditoriaRepository: Repository<LogAuditoria>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra evento de auditoria
   * @param evento Dados do evento de auditoria
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async registrarEvento(
    evento: IEventoAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    const resultado = await this.registrarEventoPagamento(evento, contextoUsuario);
    return {
      sucesso: resultado.sucesso,
      erro: resultado.erro,
      codigo: resultado.codigo,
      timestamp: resultado.timestamp,
    };
  }

  /**
   * Registra evento de auditoria para operações de pagamento
   * @param evento Dados do evento de auditoria
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async registrarEventoPagamento(
    evento: IEventoAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<string>> {
    try {
      this.logger.log(`Registrando evento de auditoria: ${evento.operacao}`);

      // Validar entrada
      if (!evento.operacao || !evento.entidade) {
        return {
          sucesso: false,
          erro: 'Operação e entidade são obrigatórias',
          codigo: 'PARAMETROS_INVALIDOS',
          timestamp: new Date(),
        };
      }

      // Criar DTO para auditoria
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = evento.operacao;
      logDto.entidade_afetada = evento.entidade;
      logDto.entidade_id = evento.entidadeId;
      logDto.usuario_id = contextoUsuario.id;
      logDto.ip_origem = 'N/A'; // IP não disponível no contexto
      logDto.user_agent = 'Sistema'; // User agent não disponível no contexto
      logDto.dados_anteriores = evento.dadosAnteriores;
      logDto.dados_novos = evento.dadosNovos;
      logDto.descricao = evento.observacoes;
      logDto.data_hora = new Date();

      // Criar registro de auditoria
      const auditoria = await this.auditoriaService.create(logDto);

      // Determinar criticidade
      const criticidade = this.determinarCriticidade(evento.operacao);

      // Verificar se é operação crítica e registrar alerta se necessário
      if (criticidade === 'ALTA') {
        await this.registrarAlertaCriticidade(auditoria.id, evento);
      }

      this.logger.log(`Evento de auditoria registrado com ID: ${auditoria.id}`);

      return {
        sucesso: true,
        dados: auditoria.id,
        timestamp: new Date(),
        metadata: {
          operacao: evento.operacao,
          entidade: evento.entidade,
          criticidade: criticidade,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao registrar evento de auditoria:`, error);

      return {
        sucesso: false,
        erro: 'Erro interno ao registrar auditoria',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Busca histórico de auditoria por entidade
   * @param entidadeId ID da entidade
   * @param tipoEntidade Tipo da entidade
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de auditoria
   */
  async buscarHistoricoEntidade(
    entidadeId: string,
    tipoEntidade: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IRegistroAuditoria[]>> {
    const filtros: IFiltrosAuditoria = {
      entidadeId,
      entidade: [tipoEntidade],
      page: 1,
      limit: 100,
    };
    
    const resultado = await this.buscarLogs(filtros, contextoUsuario);
    
    if (!resultado.sucesso) {
      return {
        sucesso: false,
        erro: resultado.erro,
        codigo: resultado.codigo,
        timestamp: resultado.timestamp,
      };
    }
    
    return {
      sucesso: true,
      dados: resultado.dados?.registros || [],
      timestamp: new Date(),
    };
  }

  /**
   * Busca logs de auditoria com filtros
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Logs de auditoria paginados
   */
  async buscarLogs(
    filtros: IFiltrosAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IPaginatedAuditoria>> {
    return this.buscarHistoricoAuditoria(filtros, contextoUsuario);
  }

  /**
   * Busca histórico de auditoria com filtros
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de auditoria paginado
   */
  async buscarHistoricoAuditoria(
    filtros: IFiltrosAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IPaginatedAuditoria>> {
    try {
      this.logger.log(`Buscando histórico de auditoria`);

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcessoAuditoria(contextoUsuario)) {
        await this.registrarEventoPagamento(
          {
            operacao: TipoOperacao.ACCESS,
            entidade: 'Auditoria',
            entidadeId: 'sistema',
            dadosNovos: { filtros, usuarioId: contextoUsuario.id },
            observacoes: 'Tentativa de acesso negado ao histórico de auditoria',
            origem: 'SISTEMA',
            criticidade: 'ALTA',
            categoria: 'SEGURANCA',
          },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado ao histórico de auditoria',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Construir query
      const queryBuilder = this.auditoriaRepository
        .createQueryBuilder('auditoria')
        .leftJoinAndSelect('auditoria.usuario', 'usuario')
        .orderBy('auditoria.created_at', 'DESC');

      // Aplicar filtros
      if (filtros.usuarioId) {
        queryBuilder.andWhere('auditoria.usuario_id = :usuarioId', {
          usuarioId: filtros.usuarioId,
        });
      }

      if (filtros.operacao) {
        queryBuilder.andWhere('auditoria.tipo_operacao = :operacao', {
          operacao: filtros.operacao,
        });
      }

      if (filtros.entidade) {
        queryBuilder.andWhere('auditoria.entidade_afetada = :entidade', {
          entidade: filtros.entidade,
        });
      }

      if (filtros.entidadeId) {
        queryBuilder.andWhere('auditoria.entidade_id = :entidadeId', {
          entidadeId: filtros.entidadeId,
        });
      }

      if (filtros.dataInicio) {
        queryBuilder.andWhere('auditoria.created_at >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros.dataFim) {
        queryBuilder.andWhere('auditoria.created_at <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      // Filtrar por módulo de pagamento por padrão
      queryBuilder.andWhere(
        '(auditoria.entidade_afetada IN (:...entidadesPagamento) OR auditoria.observacoes LIKE :moduloPagamento)',
        {
          entidadesPagamento: ['Pagamento', 'LotePagamento', 'ComprovantePagamento'],
          moduloPagamento: '%PAGAMENTO%',
        }
      );

      // Aplicar paginação
      if (filtros.limit) {
        queryBuilder.limit(filtros.limit);
      }

      if (filtros.page && filtros.limit) {
        const offset = (filtros.page - 1) * filtros.limit;
        queryBuilder.offset(offset);
      }

      // Executar query
      const auditorias = await queryBuilder.getMany();

      // Formatar eventos
      const eventos: IEventoAuditoria[] = auditorias.map(auditoria => ({
        operacao: auditoria.tipo_operacao,
        entidade: auditoria.entidade_afetada,
        entidadeId: auditoria.entidade_id || '',
        dadosAnteriores: auditoria.dados_anteriores,
        dadosNovos: auditoria.dados_novos,
        observacoes: auditoria.descricao,
        ip: auditoria.ip_origem,
        userAgent: auditoria.user_agent,
        origem: 'SISTEMA' as const,
        criticidade: 'MEDIA' as const,
        categoria: 'PAGAMENTO',
        subcategoria: 'HISTORICO',
        metadados: {
          id: auditoria.id,
          usuarioId: auditoria.usuario_id,
          timestamp: auditoria.created_at,
        },
      }));

      // Registrar acesso ao histórico
      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.READ,
          entidade: 'Auditoria',
          entidadeId: 'consulta-historico',
          dadosNovos: { filtros, quantidadeEncontrada: eventos.length },
          observacoes: 'Consulta ao histórico de auditoria realizada',
          origem: 'SISTEMA',
          criticidade: 'BAIXA',
          categoria: 'CONSULTA'
        },
        contextoUsuario
      );

      // Criar objeto paginado
      const paginatedResult: IPaginatedAuditoria = {
        registros: eventos.map(evento => ({
          id: evento.metadados?.id || '',
          timestamp: evento.metadados?.timestamp || new Date(),
          usuarioId: evento.metadados?.usuarioId || '',
          usuarioNome: evento.metadados?.usuarioNome || '',
          operacao: evento.operacao,
          entidade: evento.entidade,
          entidadeId: evento.entidadeId,
          dadosAnteriores: evento.dadosAnteriores,
          dadosNovos: evento.dadosNovos,
          observacoes: evento.observacoes || '',
          ip: evento.ip || '',
          userAgent: evento.userAgent || '',
          origem: evento.origem,
          criticidade: evento.criticidade,
          categoria: evento.categoria,
          subcategoria: evento.subcategoria,
          hash: evento.metadados?.hash || '',
          assinatura: evento.metadados?.assinatura,
          metadados: evento.metadados,
        })),
        total: eventos.length,
        page: filtros.page || 1,
        limit: filtros.limit || 10,
        totalPages: Math.ceil(eventos.length / (filtros.limit || 10)),
         hasNext: false,
         hasPrevious: (filtros.page || 1) > 1,
      };

      return {
        sucesso: true,
        dados: paginatedResult,
        timestamp: new Date(),
        metadata: {
          total: eventos.length,
          filtros: filtros,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar histórico de auditoria:`, error);

      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.READ,
          entidade: 'Auditoria',
          entidadeId: 'erro-consulta-historico',
          dadosNovos: { filtros, erro: error.message },
          observacoes: 'Erro ao consultar histórico de auditoria',
          origem: 'SISTEMA',
          criticidade: 'ALTA',
          categoria: 'ERRO'
        },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao buscar histórico de auditoria',
        codigo: 'ERRO_BUSCA_AUDITORIA',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verifica integridade dos dados de auditoria
   * @param periodo Período para verificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da verificação
   */
  async verificarIntegridade(
    periodo: IPeriodoVerificacao,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IVerificacaoIntegridade>> {
    try {
      this.logger.log(`Verificando integridade da auditoria para período ${periodo.inicio} - ${periodo.fim}`);

      // Verificar permissão de acesso
      if (!this.verificarPermissaoVerificacaoIntegridade(contextoUsuario)) {
        await this.registrarEventoPagamento(
          {
            operacao: TipoOperacao.ACCESS,
            entidade: 'Auditoria',
            entidadeId: 'verificacao-integridade',
            dadosNovos: { periodo, usuarioId: contextoUsuario.id },
            observacoes: 'Tentativa de acesso negado à verificação de integridade',
            origem: 'SISTEMA',
            criticidade: 'ALTA',
            categoria: 'SEGURANCA'
          },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado à verificação de integridade',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Buscar registros de auditoria no período
      const queryBuilder = this.auditoriaRepository
        .createQueryBuilder('auditoria')
        .where('auditoria.created_at >= :inicio', { inicio: periodo.inicio })
        .andWhere('auditoria.created_at <= :fim', { fim: periodo.fim })
        .orderBy('auditoria.created_at', 'ASC');

      if (!periodo.incluirArquivados) {
        queryBuilder.andWhere('auditoria.arquivado = :arquivado', { arquivado: false });
      }

      const registros = await queryBuilder.getMany();

      if (registros.length === 0) {
        const verificacao: IVerificacaoIntegridade = {
          valida: true,
          totalRegistros: 0,
          registrosVerificados: 0,
          registrosComProblema: 0,
          problemas: [],
          hashGlobal: '',
          dataVerificacao: new Date(),
          tempoProcessamento: 0
        };

        return {
          sucesso: true,
          dados: verificacao,
          timestamp: new Date(),
        };
      }

      // Verificar integridade dos registros
      const verificacao = await this.executarVerificacaoIntegridade(registros);

      // Registrar resultado da verificação
      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.READ,
          entidade: 'Auditoria',
          entidadeId: 'verificacao-integridade',
          dadosNovos: {
            periodo,
            registrosAnalisados: registros.length,
            integridadeOk: verificacao.valida,
            problemas: verificacao.problemas,
          },
          observacoes: `Verificação de integridade ${verificacao.valida ? 'bem-sucedida' : 'com problemas'}`,
          origem: 'SISTEMA',
          criticidade: verificacao.valida ? 'BAIXA' : 'ALTA',
          categoria: 'AUDITORIA'
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: verificacao,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar integridade da auditoria:`, error);

      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.READ,
          entidade: 'Auditoria',
          entidadeId: 'verificacao-integridade-erro',
          dadosNovos: { periodo, erro: error.message },
          observacoes: 'Erro durante verificação de integridade',
          origem: 'SISTEMA',
          criticidade: 'ALTA',
          categoria: 'ERRO'
        },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao verificar integridade da auditoria',
        codigo: 'ERRO_VERIFICACAO_INTEGRIDADE',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Gera relatório de auditoria
   * @param parametros Parâmetros para o relatório
   * @param contextoUsuario Contexto do usuário logado
   * @returns Relatório de auditoria
   */
  async gerarRelatorioAuditoria(
    parametros: IParametrosRelatorio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IRelatorioAuditoria>> {
    try {
      this.logger.log(`Gerando relatório de auditoria`);

      // Verificar permissão de acesso
      if (!this.verificarPermissaoRelatorioAuditoria(contextoUsuario)) {
        await this.registrarEventoPagamento(
          {
            operacao: TipoOperacao.ACCESS,
            entidade: 'Auditoria',
            entidadeId: 'relatorio-auditoria',
            dadosNovos: { parametros, usuarioId: contextoUsuario.id },
            observacoes: 'Tentativa de acesso negado ao relatório de auditoria',
            origem: 'SISTEMA',
            criticidade: 'ALTA',
            categoria: 'SEGURANCA'
          },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado ao relatório de auditoria',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      // Buscar dados para o relatório
      const dadosRelatorio = await this.coletarDadosRelatorio(parametros.filtros || {});

      // Gerar estatísticas
      const estatisticas = this.gerarEstatisticasRelatorio(dadosRelatorio);

      // Registrar geração do relatório
      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.EXPORT,
          entidade: 'Auditoria',
          entidadeId: 'relatorio-auditoria',
          dadosNovos: {
            parametros,
            registrosAnalisados: dadosRelatorio.length,
            estatisticas,
          },
          observacoes: 'Relatório de auditoria gerado',
          origem: 'SISTEMA',
          criticidade: 'MEDIA',
          categoria: 'RELATORIO'
        },
        contextoUsuario
      );

      const relatorio: IRelatorioAuditoria = {
        id: `relatorio-${Date.now()}`,
        tipo: parametros.tipo,
        periodo: parametros.periodo,
        dataGeracao: new Date(),
        geradoPor: contextoUsuario.id,
        arquivo: {
          nome: `relatorio-auditoria-${Date.now()}.${parametros.formato.toLowerCase()}`,
          tamanho: JSON.stringify(dadosRelatorio).length,
          url: '',
          hash: ''
        },
        estatisticas,
        resumo: `Relatório de auditoria gerado com ${dadosRelatorio.length} registros`
      };

      return {
        sucesso: true,
        dados: relatorio,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório de auditoria:`, error);

      await this.registrarEventoPagamento(
        {
          operacao: TipoOperacao.EXPORT,
          entidade: 'Auditoria',
          entidadeId: 'relatorio-auditoria',
          dadosNovos: { parametros, erro: error.message },
          observacoes: 'Erro durante geração do relatório de auditoria',
          origem: 'SISTEMA',
          criticidade: 'ALTA',
          categoria: 'ERRO'
        },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao gerar relatório de auditoria',
        codigo: 'ERRO_GERACAO_RELATORIO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS ==========

  /**
   * Determina a criticidade de uma operação
   * @param operacao Tipo da operação
   * @returns Nível de criticidade
   */
  private determinarCriticidade(operacao: TipoOperacao): 'BAIXA' | 'MEDIA' | 'ALTA' {
    const operacoesCriticas = [
      TipoOperacao.DELETE,
      TipoOperacao.UPDATE,
    ];

    const operacoesMedias = [
      TipoOperacao.CREATE,
      TipoOperacao.READ,
      TipoOperacao.EXPORT,
      TipoOperacao.ACCESS,
    ];

    if (operacoesCriticas.includes(operacao)) {
      return 'ALTA';
    }

    if (operacoesMedias.includes(operacao)) {
      return 'MEDIA';
    }

    return 'BAIXA';
  }

  /**
   * Registra alerta para operações de alta criticidade
   * @param auditoriaId ID do registro de auditoria
   * @param evento Dados do evento
   */
  private async registrarAlertaCriticidade(
    auditoriaId: string,
    evento: any
  ): Promise<void> {
    try {
      // Aqui seria implementada a lógica de alerta
      // Por exemplo, envio de notificação para supervisores
      this.logger.warn(
        `Operação crítica detectada: ${evento.operacao} - Auditoria ID: ${auditoriaId}`
      );
    } catch (error) {
      this.logger.error('Erro ao registrar alerta de criticidade:', error);
    }
  }

  /**
   * Verifica se o usuário tem permissão para acessar auditoria
   * @param contextoUsuario Contexto do usuário
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoAcessoAuditoria(contextoUsuario: IContextoUsuario): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Supervisor tem acesso limitado
    if (contextoUsuario.isSupervisor) {
      return true;
    }

    // Usuários com permissão específica
    if (contextoUsuario.permissoes?.includes('CONSULTAR_AUDITORIA')) {
      return true;
    }

    return false;
  }

  /**
   * Verifica se o usuário tem permissão para verificação de integridade
   * @param contextoUsuario Contexto do usuário
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoVerificacaoIntegridade(contextoUsuario: IContextoUsuario): boolean {
    // Apenas admin e auditores
    return contextoUsuario.isAdmin || contextoUsuario.permissoes?.includes('VERIFICAR_INTEGRIDADE_AUDITORIA');
  }

  /**
   * Verifica se o usuário tem permissão para gerar relatórios
   * @param contextoUsuario Contexto do usuário
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoRelatorioAuditoria(contextoUsuario: IContextoUsuario): boolean {
    // Admin, supervisor e usuários com permissão específica
    return (
      contextoUsuario.isAdmin ||
      contextoUsuario.isSupervisor ||
      contextoUsuario.permissoes?.includes('GERAR_RELATORIO_AUDITORIA')
    );
  }

  /**
   * Executa verificação de integridade dos registros
   * @param registros Lista de registros de auditoria
   * @returns Resultado da verificação
   */
  private async executarVerificacaoIntegridade(registros: LogAuditoria[]): Promise<IVerificacaoIntegridade> {
    const problemas: IProblemaIntegridade[] = [];
    const detalhes: any = {
      registrosAnalisados: registros.length,
      verificacoes: [],
    };

    // Verificar sequência temporal
    for (let i = 1; i < registros.length; i++) {
      if (registros[i].created_at < registros[i - 1].created_at) {
        problemas.push({
           registroId: registros[i].id,
           tipo: 'DADOS_CORROMPIDOS',
           descricao: `Sequência temporal incorreta entre registros ${registros[i - 1].id} e ${registros[i].id}`,
           gravidade: 'ALTA',
           dataDeteccao: new Date(),
           podeCorrigir: false
         });
      }
    }

    // Verificar consistência de dados
    const operacoesInconsistentes = this.verificarConsistenciaOperacoes(registros);
    problemas.push(...operacoesInconsistentes);

    // Verificar campos obrigatórios
    const camposObrigatorios = this.verificarCamposObrigatorios(registros);
    problemas.push(...camposObrigatorios);

    // Calcular hash global
    const hashGlobal = this.calcularHashGlobal(registros);
    const dataVerificacao = new Date();
    const tempoProcessamento = Date.now() - dataVerificacao.getTime();

    detalhes.verificacoes = [
      'Sequência temporal',
      'Consistência de operações',
      'Campos obrigatórios',
    ];

    return {
      valida: problemas.length === 0,
      totalRegistros: registros.length,
      registrosVerificados: registros.length,
      registrosComProblema: problemas.length,
      problemas,
      hashGlobal,
      dataVerificacao,
      tempoProcessamento
    };
  }

  /**
   * Verifica consistência das operações
   * @param registros Lista de registros
   * @returns Lista de problemas encontrados
   */
  private verificarConsistenciaOperacoes(registros: LogAuditoria[]): IProblemaIntegridade[] {
    const problemas: IProblemaIntegridade[] = [];

    // Verificar se operações de criação não têm dados anteriores
    registros
      .filter(r => r.tipo_operacao === TipoOperacao.CREATE)
      .forEach(r => {
        if (r.dados_anteriores) {
          problemas.push({
            registroId: r.id,
            tipo: 'DADOS_CORROMPIDOS',
            descricao: `Operação de criação ${r.id} possui dados anteriores`,
            gravidade: 'MEDIA',
            dataDeteccao: new Date(),
            podeCorrigir: false
          });
        }
      });

    // Verificar se operações de atualização têm dados anteriores
    registros
      .filter(r => r.tipo_operacao === TipoOperacao.UPDATE)
      .forEach(r => {
        if (!r.dados_anteriores) {
          problemas.push({
            registroId: r.id,
            tipo: 'REGISTRO_FALTANTE',
            descricao: `Operação de atualização ${r.id} não possui dados anteriores`,
            gravidade: 'ALTA',
            dataDeteccao: new Date(),
            podeCorrigir: false
          });
        }
      });

    return problemas;
  }

  /**
   * Verifica campos obrigatórios
   * @param registros Lista de registros
   * @returns Lista de problemas encontrados
   */
  private verificarCamposObrigatorios(registros: LogAuditoria[]): IProblemaIntegridade[] {
    const problemas: IProblemaIntegridade[] = [];

    registros.forEach(registro => {
      if (!registro.usuario_id) {
        problemas.push({
          registroId: registro.id,
          tipo: 'REGISTRO_FALTANTE',
          descricao: `Registro ${registro.id} sem usuário`,
          gravidade: 'ALTA',
          dataDeteccao: new Date(),
          podeCorrigir: false
        });
      }
      if (!registro.tipo_operacao) {
        problemas.push({
          registroId: registro.id,
          tipo: 'REGISTRO_FALTANTE',
          descricao: `Registro ${registro.id} sem operação`,
          gravidade: 'ALTA',
          dataDeteccao: new Date(),
          podeCorrigir: false
        });
      }
      if (!registro.entidade_afetada) {
        problemas.push({
          registroId: registro.id,
          tipo: 'REGISTRO_FALTANTE',
          descricao: `Registro ${registro.id} sem entidade`,
          gravidade: 'ALTA',
          dataDeteccao: new Date(),
          podeCorrigir: false
        });
      }
    });

    return problemas;
  }

  /**
   * Coleta dados para o relatório
   * @param filtros Filtros aplicados
   * @returns Dados coletados
   */
  private async coletarDadosRelatorio(filtros: IFiltrosAuditoria): Promise<any[]> {
    const queryBuilder = this.auditoriaRepository
      .createQueryBuilder('auditoria')
      .orderBy('auditoria.created_at', 'DESC');

    // Aplicar filtros (mesmo código da busca)
    if (filtros.usuarioId) {
      queryBuilder.andWhere('auditoria.usuario_id = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    }

    if (filtros.operacao) {
      queryBuilder.andWhere('auditoria.tipo_operacao = :operacao', {
        operacao: filtros.operacao,
      });
    }

    if (filtros.entidade) {
      queryBuilder.andWhere('auditoria.entidade_afetada = :entidade', {
        entidade: filtros.entidade,
      });
    }

    if (filtros.dataInicio) {
      queryBuilder.andWhere('auditoria.created_at >= :dataInicio', {
        dataInicio: filtros.dataInicio,
      });
    }

    if (filtros.dataFim) {
      queryBuilder.andWhere('auditoria.created_at <= :dataFim', {
        dataFim: filtros.dataFim,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Gera estatísticas do relatório
   * @param dados Dados coletados
   * @returns Estatísticas geradas
   */
  private gerarEstatisticasRelatorio(dados: any[]): any {
    const estatisticas = {
      totalRegistros: dados.length,
      operacoesPorTipo: {},
      usuariosMaisAtivos: {},
      entidadesMaisAcessadas: {},
      distribuicaoPorDia: {},
    };

    dados.forEach(registro => {
      // Contar operações por tipo
      estatisticas.operacoesPorTipo[registro.tipo_operacao] =
        (estatisticas.operacoesPorTipo[registro.tipo_operacao] || 0) + 1;

      // Contar usuários mais ativos
      const usuarioNome = registro.usuario?.nome || 'N/A';
      estatisticas.usuariosMaisAtivos[usuarioNome] =
        (estatisticas.usuariosMaisAtivos[usuarioNome] || 0) + 1;

      // Contar entidades mais acessadas
      estatisticas.entidadesMaisAcessadas[registro.entidade_afetada] =
        (estatisticas.entidadesMaisAcessadas[registro.entidade_afetada] || 0) + 1;

      // Distribuição por dia
      const dia = registro.created_at.toISOString().split('T')[0];
      estatisticas.distribuicaoPorDia[dia] =
        (estatisticas.distribuicaoPorDia[dia] || 0) + 1;
    });

    return estatisticas;
  }

  /**
   * Calcula hash global dos registros
   * @param registros Lista de registros
   * @returns Hash global
   */
  private calcularHashGlobal(registros: LogAuditoria[]): string {
    const crypto = require('crypto');
    const dados = registros.map(r => ({
      id: r.id,
      tipo_operacao: r.tipo_operacao,
      entidade_afetada: r.entidade_afetada,
      entidade_id: r.entidade_id,
      usuario_id: r.usuario_id,
      created_at: r.created_at
    }));
    
    const dadosString = JSON.stringify(dados);
    return crypto.createHash('sha256').update(dadosString).digest('hex');
  }

  /**
   * Arquiva logs antigos
   * @param criterios Critérios de arquivamento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do arquivamento
   */
  async arquivarLogs(
    criterios: ICriteriosArquivamento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoArquivamento>> {
    try {
      this.logger.log('Iniciando arquivamento de logs');

      // Verificar permissão
      if (!this.verificarPermissaoArquivamento(contextoUsuario)) {
        return {
          sucesso: false,
          erro: 'Usuário não possui permissão para arquivar logs',
          codigo: 'PERMISSAO_NEGADA',
          timestamp: new Date(),
        };
      }

      // Simular arquivamento (implementação específica dependeria dos requisitos)
       const resultado: IResultadoArquivamento = {
         totalRegistros: 0,
         registrosArquivados: 0,
         registrosMantidos: 0,
         tamanhoArquivo: 0,
         localArquivo: 'sistema-arquivo',
         hashArquivo: '',
         dataArquivamento: new Date(),
         tempoProcessamento: 0,
       };

      return {
        sucesso: true,
        dados: resultado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao arquivar logs:', error);
      return {
        sucesso: false,
        erro: 'Erro interno ao arquivar logs',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica se o usuário tem permissão para arquivar logs
   * @param contextoUsuario Contexto do usuário
   * @returns True se tem permissão
   */
  private verificarPermissaoArquivamento(contextoUsuario: IContextoUsuario): boolean {
    return ['ADMIN', 'GESTOR_SISTEMA'].includes(contextoUsuario.perfil) || false;
  }
}