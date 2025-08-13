import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Entities
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { Aprovador } from '../entities/aprovador.entity';
import { HistoricoAprovacao } from '../entities/historico-aprovacao.entity';
import { DelegacaoAprovacao } from '../entities/delegacao-aprovacao.entity';

// DTOs
import { CreateSolicitacaoAprovacaoDto } from '../dtos/create-solicitacao-aprovacao.dto';
import { AprovarSolicitacaoDto } from '../dtos/aprovar-solicitacao.dto';
import { RejeitarSolicitacaoDto } from '../dtos/rejeitar-solicitacao.dto';
import { FiltroSolicitacaoDto } from '../dtos/filtro-solicitacao.dto';
import { RespostaPaginadaSolicitacaoDto } from '../dtos/resposta-paginada.dto';

// Enums
import {
  StatusSolicitacaoAprovacao,
  AcaoAprovacao,
  TipoAcaoCritica,
  EstrategiaAprovacao,
} from '../enums/aprovacao.enums';

// Interfaces
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Serviço principal para gerenciamento do sistema de aprovação de ações críticas.
 *
 * Responsabilidades:
 * - Verificar se uma ação requer aprovação
 * - Criar solicitações de aprovação
 * - Processar decisões de aprovação/rejeição
 * - Gerenciar o workflow de aprovação
 * - Integrar com sistema de auditoria e notificações
 */
@Injectable()
export class AprovacaoService {
  private readonly logger = new Logger(AprovacaoService.name);

  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    @InjectRepository(ConfiguracaoAprovacao)
    private readonly configuracaoRepository: Repository<ConfiguracaoAprovacao>,
    @InjectRepository(AcaoCritica)
    private readonly acaoCriticaRepository: Repository<AcaoCritica>,
    @InjectRepository(Aprovador)
    private readonly aprovadorRepository: Repository<Aprovador>,
    @InjectRepository(HistoricoAprovacao)
    private readonly historicoRepository: Repository<HistoricoAprovacao>,
    @InjectRepository(DelegacaoAprovacao)
    private readonly delegacaoRepository: Repository<DelegacaoAprovacao>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Verifica se uma ação específica requer aprovação para o usuário informado
   *
   * @param tipoAcao - Tipo da ação crítica a ser verificada
   * @param usuario - Usuário que está tentando executar a ação
   * @param contexto - Contexto adicional da ação (dados, parâmetros, etc.)
   * @returns Promise<boolean> - true se requer aprovação, false caso contrário
   */
  async verificarSeRequerAprovacao(
    tipoAcao: TipoAcaoCritica,
    usuario: Usuario,
    contexto: any = {},
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Verificando se ação ${tipoAcao} requer aprovação para usuário ${usuario.id}`,
      );

      // Buscar configuração da ação crítica
      const configuracao = await this.obterConfiguracaoAprovacao(tipoAcao);

      if (!configuracao || !configuracao.ativa) {
        this.logger.debug(
          `Ação ${tipoAcao} não possui configuração ativa - execução direta permitida`,
        );
        return false;
      }

      // Verificar se permite auto-aprovação
      if (configuracao.permite_auto_aprovacao) {
        const podeAutoAprovar = await this.verificarAutoAprovacao(
          configuracao,
          usuario,
          contexto,
        );

        if (podeAutoAprovar) {
          this.logger.debug(
            `Usuário ${usuario.id} pode auto-aprovar ação ${tipoAcao}`,
          );
          return false;
        }
      }

      this.logger.debug(
        `Ação ${tipoAcao} requer aprovação para usuário ${usuario.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar se ação ${tipoAcao} requer aprovação: ${error.message}`,
        error.stack,
      );
      // Em caso de erro, por segurança, assumir que requer aprovação
      return true;
    }
  }

  /**
   * Cria uma nova solicitação de aprovação
   *
   * @param dados - Dados da solicitação de aprovação
   * @returns Promise<SolicitacaoAprovacao> - Solicitação criada
   */
  async criarSolicitacaoAprovacao(
    dados: CreateSolicitacaoAprovacaoDto,
  ): Promise<SolicitacaoAprovacao> {
    try {
      this.logger.debug(
        `Criando solicitação de aprovação para ação ${dados.acao_critica_id}`,
      );

      // Buscar ação crítica
      const acaoCritica = await this.acaoCriticaRepository.findOne({
        where: { codigo: dados.acao_critica_id },
      });

      if (!acaoCritica) {
        throw new NotFoundException(
          `Ação crítica ${dados.acao_critica_id} não encontrada`,
        );
      }

      // Buscar configuração de aprovação
      const configuracao = await this.configuracaoRepository.findOne({
        where: {
          acao_critica_id: acaoCritica.id,
          ativa: true,
        },
      });

      if (!configuracao) {
        throw new BadRequestException(
          `Configuração de aprovação não encontrada para ação ${dados.acao_critica_id}`,
        );
      }

      // Calcular prazo limite
      const prazoLimite = new Date();
      prazoLimite.setHours(
        prazoLimite.getHours() + configuracao.tempo_limite_horas,
      );

      // Criar solicitação
      const solicitacao = this.solicitacaoRepository.create({
        usuario_solicitante_id: dados.usuario_solicitante_id,
        perfil_solicitante: dados.perfil,
        unidade_solicitante: dados.unidade,
        justificativa: dados.justificativa,
        contexto: dados.contexto,
        dados_originais: dados.dados_originais,
        dados_propostos: dados.dados_propostos,
        valor_envolvido: dados.valor_envolvido,
        data_expiracao: prazoLimite,
        ip_solicitante: dados.ip_solicitante,
        user_agent: dados.user_agent,
        status: StatusSolicitacaoAprovacao.PENDENTE,
        aprovacoes_necessarias: configuracao.min_aprovacoes,
        acao_critica: acaoCritica,
      });

      const solicitacaoSalva: SolicitacaoAprovacao =
        await this.solicitacaoRepository.save(solicitacao);

      this.logger.log(
        `Solicitação de aprovação ${solicitacaoSalva.id} criada com sucesso`,
      );

      // Emitir evento de solicitação criada
      this.eventEmitter.emit('solicitacao-aprovacao.criada', {
        solicitacao: solicitacaoSalva,
        configuracao,
        acao_critica: acaoCritica,
      });

      return solicitacaoSalva;
    } catch (error) {
      this.logger.error(
        `Erro ao criar solicitação de aprovação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria uma nova solicitação de aprovação
   *
   * @param dados - Dados da solicitação
   * @param usuario - Usuário solicitante
   * @param contextoRequisicao - Contexto da requisição
   * @returns Promise<SolicitacaoAprovacao> - Solicitação criada
   */
  async criarSolicitacao(
    dados: CreateSolicitacaoAprovacaoDto,
    usuario: Usuario,
    contextoRequisicao: any,
  ): Promise<SolicitacaoAprovacao> {
    return this.criarSolicitacaoAprovacao({
      ...dados,
      usuario_solicitante_id: usuario.id,
      ip_solicitante: contextoRequisicao.ip,
      user_agent: contextoRequisicao.userAgent,
    });
  }

  /**
   * Cancela uma solicitação de aprovação
   *
   * @param id - ID da solicitação
   * @param dados - Dados do cancelamento
   * @param usuario - Usuário que está cancelando
   * @returns Promise<void>
   */
  async cancelarSolicitacao(
    id: string,
    dados: any,
    usuario: Usuario,
  ): Promise<void> {
    const solicitacao = await this.buscarSolicitacaoPorId(id);
    
    // Verificar se o usuário tem permissão para cancelar
    if (solicitacao.usuario_solicitante_id !== usuario.id) {
      throw new ForbiddenException('Usuário não tem permissão para cancelar esta solicitação');
    }

    if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser canceladas');
    }

    await this.solicitacaoRepository.update(id, {
      status: StatusSolicitacaoAprovacao.CANCELADA,
      data_conclusao: new Date(),
      observacoes_internas: dados.motivo || 'Cancelada pelo solicitante',
    });

    this.logger.log(`Solicitação ${id} cancelada por usuário ${usuario.id}`);
  }

  /**
   * Processa uma aprovação de solicitação
   *
   * @param solicitacaoId - ID da solicitação
   * @param dados - Dados da aprovação
   * @param aprovadorId - ID do aprovador
   * @returns Promise<SolicitacaoAprovacao> - Solicitação atualizada
   */
  async aprovarSolicitacao(
    solicitacaoId: string,
    dados: AprovarSolicitacaoDto,
    aprovadorId: string,
  ): Promise<SolicitacaoAprovacao> {
    return this.processarDecisaoAprovacao(
      solicitacaoId,
      AcaoAprovacao.APROVAR,
      aprovadorId,
      dados.justificativa,
    );
  }

  /**
   * Processa uma rejeição de solicitação
   *
   * @param solicitacaoId - ID da solicitação
   * @param dados - Dados da rejeição
   * @param aprovadorId - ID do aprovador
   * @returns Promise<SolicitacaoAprovacao> - Solicitação atualizada
   */
  async rejeitarSolicitacao(
    solicitacaoId: string,
    dados: RejeitarSolicitacaoDto,
    aprovadorId: string,
  ): Promise<SolicitacaoAprovacao> {
    return this.processarDecisaoAprovacao(
      solicitacaoId,
      AcaoAprovacao.REJEITAR,
      aprovadorId,
      dados.justificativa,
      dados.motivo_rejeicao,
    );
  }

  /**
   * Lista solicitações de aprovação com filtros e paginação
   *
   * @param filtros - Filtros de busca
   * @returns Promise<RespostaPaginadaSolicitacaoDto> - Lista paginada
   */
  async listarSolicitacoes(
    filtros: FiltroSolicitacaoDto,
  ): Promise<RespostaPaginadaSolicitacaoDto> {
    try {
      const {
        pagina = 1,
        limite = 20,
        status,
        usuario_solicitante_id,
        acao_critica_id,
        data_inicio,
        data_fim,
        unidade,
      } = filtros;

      const queryBuilder = this.solicitacaoRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.acao_critica', 'ac')
        .orderBy('s.created_at', 'DESC');

      // Aplicar filtros
      if (status) {
        queryBuilder.andWhere('s.status = :status', { status });
      }

      if (usuario_solicitante_id) {
        queryBuilder.andWhere(
          's.usuario_solicitante_id = :usuario_solicitante_id',
          {
            usuario_solicitante_id,
          },
        );
      }

      if (acao_critica_id) {
        queryBuilder.andWhere('ac.codigo = :acao_critica_id', {
          acao_critica_id,
        });
      }

      if (unidade) {
        queryBuilder.andWhere('s.unidade = :unidade', {
          unidade,
        });
      }

      if (data_inicio) {
        queryBuilder.andWhere('s.created_at >= :data_inicio', { data_inicio });
      }

      if (data_fim) {
        queryBuilder.andWhere('s.created_at <= :data_fim', { data_fim });
      }

      // Paginação
      const offset = (pagina - 1) * limite;
      queryBuilder.skip(offset).take(limite);

      const [solicitacoes, total] = await queryBuilder.getManyAndCount();

      const estatisticas = {
        total_pendentes: await this.contarPorStatus(
          StatusSolicitacaoAprovacao.PENDENTE,
        ),
        total_aprovadas: await this.contarPorStatus(
          StatusSolicitacaoAprovacao.APROVADA,
        ),
        total_rejeitadas: await this.contarPorStatus(
          StatusSolicitacaoAprovacao.REJEITADA,
        ),
        total_expiradas: await this.contarPorStatus(
          StatusSolicitacaoAprovacao.EXPIRADA,
        ),
        valor_total_envolvido: await this.calcularValorTotalEnvolvido(filtros),
        tempo_medio_aprovacao_horas: await this.calcularTempoMedioAprovacao(filtros)
      };

      const resposta = new RespostaPaginadaSolicitacaoDto(
        solicitacoes,
        total,
        pagina,
        limite,
        {
          status,
          usuario_solicitante_id,
          acao_critica_id,
          data_inicio,
          data_fim,
          unidade,
        },
      );
      resposta.estatisticas = estatisticas;

      return resposta;
    } catch (error) {
      this.logger.error(
        `Erro ao listar solicitações: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca uma solicitação específica por ID
   *
   * @param id - ID da solicitação
   * @returns Promise<SolicitacaoAprovacao> - Solicitação encontrada
   */
  async buscarSolicitacaoPorId(id: string): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['acao_critica'],
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação ${id} não encontrada`);
    }

    return solicitacao;
  }

  // Métodos privados auxiliares

  /**
   * Obtém a configuração de aprovação para uma ação crítica
   */
  private async obterConfiguracaoAprovacao(
    tipoAcao: TipoAcaoCritica,
  ): Promise<ConfiguracaoAprovacao | null> {
    const acaoCritica = await this.acaoCriticaRepository.findOne({
      where: { codigo: tipoAcao },
    });

    if (!acaoCritica) {
      return null;
    }

    return this.configuracaoRepository.findOne({
      where: {
        acao_critica_id: acaoCritica.id,
        ativa: true,
      },
    });
  }

  /**
   * Verifica se o usuário pode auto-aprovar a ação
   */
  private async verificarAutoAprovacao(
    configuracao: ConfiguracaoAprovacao,
    usuario: Usuario,
    contexto: any,
  ): Promise<boolean> {
    // Implementar lógica de auto-aprovação baseada em:
    // - Perfil do usuário
    // - Permissões específicas
    // - Condições configuradas
    // - Valor envolvido
    // - Unidade/escopo

    // Por enquanto, implementação básica
    if (!configuracao.permite_auto_aprovacao) {
      return false;
    }

    // Aqui seria implementada a lógica específica de auto-aprovação
    // baseada nas condições configuradas
    return false;
  }

  /**
   * Processa uma decisão de aprovação (aprovação ou rejeição)
   */
  private async processarDecisaoAprovacao(
    solicitacaoId: string,
    decisao: AcaoAprovacao,
    aprovadorId: string,
    justificativa?: string,
    observacoes?: string,
  ): Promise<SolicitacaoAprovacao> {
    try {
      this.logger.debug(
        `Processando decisão ${decisao} para solicitação ${solicitacaoId}`,
      );

      // Buscar solicitação
      const solicitacao = await this.buscarSolicitacaoPorId(solicitacaoId);

      // Verificar se está pendente
      if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
        throw new BadRequestException(
          `Solicitação ${solicitacaoId} não está pendente de aprovação`,
        );
      }

      // Verificar se não expirou
      if (
        solicitacao.data_expiracao &&
        new Date() > solicitacao.data_expiracao
      ) {
        throw new BadRequestException(`Solicitação ${solicitacaoId} expirou`);
      }

      // Verificar permissão do aprovador
      const podeAprovar = await this.verificarPermissaoAprovacao(
        solicitacao,
        aprovadorId,
      );

      if (!podeAprovar) {
        throw new ForbiddenException(
          `Usuário ${aprovadorId} não tem permissão para aprovar esta solicitação`,
        );
      }

      // Registrar no histórico
      await this.registrarHistoricoAprovacao({
        solicitacao_aprovacao_id: solicitacaoId,
        aprovador_id: aprovadorId,
        acao: decisao,
        justificativa,
        observacoes,
      });

      // Atualizar contadores
      if (decisao === AcaoAprovacao.APROVAR) {
        solicitacao.aprovacoes_recebidas += 1;
        if (solicitacao.aprovacoes_recebidas === 1) {
          solicitacao.data_primeira_aprovacao = new Date();
        }
      } else if (decisao === AcaoAprovacao.REJEITAR) {
        solicitacao.rejeicoes_recebidas += 1;
      }

      // Determinar novo status
      const novoStatus = await this.determinarNovoStatus(solicitacao, decisao);
      solicitacao.status = novoStatus;

      if (novoStatus !== StatusSolicitacaoAprovacao.PENDENTE) {
        solicitacao.data_conclusao = new Date();
      }

      const solicitacaoAtualizada =
        await this.solicitacaoRepository.save(solicitacao);

      this.logger.log(
        `Decisão ${decisao} processada para solicitação ${solicitacaoId} - novo status: ${novoStatus}`,
      );

      // Emitir evento
      this.eventEmitter.emit('aprovacao.processada', {
        solicitacao: solicitacaoAtualizada,
        decisao,
        aprovador_id: aprovadorId,
      });

      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao processar decisão ${decisao} para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem permissão para aprovar a solicitação
   */
  private async verificarPermissaoAprovacao(
    solicitacao: SolicitacaoAprovacao,
    aprovadorId: string,
  ): Promise<boolean> {
    // Buscar aprovadores configurados para esta ação
    const aprovadores = await this.aprovadorRepository.find({
      where: {
        configuracao_aprovacao: {
          acao_critica_id: solicitacao.acao_critica_id,
        },
        ativo: true,
      },
    });

    // Verificar se o usuário está na lista de aprovadores
    const aprovadorEncontrado = aprovadores.find(
      (aprovador) => aprovador.usuario_id === aprovadorId,
    );

    return !!aprovadorEncontrado;
  }

  /**
   * Determina o novo status da solicitação baseado na decisão
   */
  private async determinarNovoStatus(
    solicitacao: SolicitacaoAprovacao,
    decisao: AcaoAprovacao,
  ): Promise<StatusSolicitacaoAprovacao> {
    if (decisao === AcaoAprovacao.REJEITAR) {
      return StatusSolicitacaoAprovacao.REJEITADA;
    }

    if (decisao === AcaoAprovacao.APROVAR) {
      // Verificar se já tem aprovações suficientes
      if (
        solicitacao.aprovacoes_recebidas >= solicitacao.aprovacoes_necessarias
      ) {
        return StatusSolicitacaoAprovacao.APROVADA;
      }
    }

    return StatusSolicitacaoAprovacao.PENDENTE;
  }

  /**
   * Registra uma entrada no histórico de aprovação
   */
  private async registrarHistoricoAprovacao(dados: {
    solicitacao_aprovacao_id: string;
    aprovador_id: string;
    acao: AcaoAprovacao;
    justificativa?: string;
    observacoes?: string;
  }): Promise<HistoricoAprovacao> {
    const historico = this.historicoRepository.create({
      solicitacao_aprovacao_id: dados.solicitacao_aprovacao_id,
      aprovador_id: dados.aprovador_id,
      acao: dados.acao,
      justificativa: dados.justificativa,
      observacoes: dados.observacoes,
    });

    return this.historicoRepository.save(historico);
  }

  /**
   * Conta solicitações por status
   */
  private async contarPorStatus(
    status: StatusSolicitacaoAprovacao,
  ): Promise<number> {
    return this.solicitacaoRepository.count({
      where: { status },
    });
  }

  /**
   * Solicita informações adicionais para uma solicitação
   */
  async solicitarInformacoes(
    solicitacaoId: string,
    dados: { mensagem: string; campos_solicitados?: string[] },
    usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.buscarSolicitacaoPorId(solicitacaoId);
    
    // Registrar no histórico
    await this.registrarHistoricoAprovacao({
      solicitacao_aprovacao_id: solicitacaoId,
      aprovador_id: usuario.id,
      acao: AcaoAprovacao.SOLICITAR_INFORMACOES,
      justificativa: dados.mensagem,
    });

    // Emitir evento
    this.eventEmitter.emit('aprovacao.informacoes-solicitadas', {
      solicitacao,
      mensagem: dados.mensagem,
      campos_solicitados: dados.campos_solicitados,
      solicitante: usuario,
    });

    return solicitacao;
  }

  /**
   * Obtém o histórico de uma solicitação
   */
  async obterHistoricoSolicitacao(
    solicitacaoId: string,
    usuario: Usuario,
  ): Promise<HistoricoAprovacao[]> {
    return this.historicoRepository.find({
      where: { solicitacao_aprovacao_id: solicitacaoId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Obtém solicitações pendentes para um aprovador
   */
  async obterSolicitacoesPendentesParaAprovador(
    usuario: Usuario,
    filtros: FiltroSolicitacaoDto,
  ): Promise<RespostaPaginadaSolicitacaoDto> {
    const { pagina = 1, limite = 20 } = filtros;
    
    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.acao_critica', 'ac')
      .innerJoin('configuracao_aprovacao', 'ca', 'ca.acao_critica_id = ac.id')
      .innerJoin('aprovador', 'a', 'a.configuracao_aprovacao_id = ca.id')
      .where('s.status = :status', { status: StatusSolicitacaoAprovacao.PENDENTE })
      .andWhere('a.usuario_id = :usuarioId', { usuarioId: usuario.id })
      .andWhere('a.ativo = true')
      .orderBy('s.created_at', 'DESC');

    const offset = (pagina - 1) * limite;
    queryBuilder.skip(offset).take(limite);

    const [solicitacoes, total] = await queryBuilder.getManyAndCount();

    return new RespostaPaginadaSolicitacaoDto(
      solicitacoes,
      total,
      pagina,
      limite,
      filtros,
    );
  }

  /**
   * Obtém solicitações por solicitante
   */
  async obterSolicitacoesPorSolicitante(
    usuario: Usuario,
    filtros: FiltroSolicitacaoDto,
  ): Promise<RespostaPaginadaSolicitacaoDto> {
    const filtrosComUsuario = {
      ...filtros,
      usuario_solicitante_id: usuario.id,
    };
    
    return this.listarSolicitacoes(filtrosComUsuario);
  }

  /**
   * Obtém estatísticas de solicitações
   */
  async obterEstatisticasSolicitacoes(
    periodo: { data_inicio: Date; data_fim: Date },
    unidadeId?: string,
    usuario?: Usuario,
  ): Promise<any> {
    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('s')
      .where('s.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio: periodo.data_inicio,
        dataFim: periodo.data_fim,
      });

    if (unidadeId) {
      queryBuilder.andWhere('s.unidade = :unidadeId', { unidadeId });
    }

    const [total, pendentes, aprovadas, rejeitadas, expiradas] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('s.status = :status', { status: StatusSolicitacaoAprovacao.PENDENTE }).getCount(),
      queryBuilder.clone().andWhere('s.status = :status', { status: StatusSolicitacaoAprovacao.APROVADA }).getCount(),
      queryBuilder.clone().andWhere('s.status = :status', { status: StatusSolicitacaoAprovacao.REJEITADA }).getCount(),
      queryBuilder.clone().andWhere('s.status = :status', { status: StatusSolicitacaoAprovacao.EXPIRADA }).getCount(),
    ]);

    return {
      total,
      pendentes,
      aprovadas,
      rejeitadas,
      expiradas,
      taxa_aprovacao: total > 0 ? (aprovadas / total) * 100 : 0,
      taxa_rejeicao: total > 0 ? (rejeitadas / total) * 100 : 0,
    };
  }

  /**
   * Obtém métricas gerais do sistema
   */
  async obterMetricasGerais(
    periodo: { data_inicio: Date; data_fim: Date },
    unidadeId?: string,
  ): Promise<any> {
    return this.obterEstatisticasSolicitacoes(periodo, unidadeId);
  }

  /**
   * Obtém métricas de aprovadores
   */
  async obterMetricasAprovadores(
    periodo: { data_inicio: Date; data_fim: Date },
    unidadeId?: string,
    top?: number,
  ): Promise<any> {
    const queryBuilder = this.historicoRepository
      .createQueryBuilder('h')
      .select('h.aprovador_id', 'aprovador_id')
      .addSelect('COUNT(*)', 'total_acoes')
      .addSelect('SUM(CASE WHEN h.acao = :aprovar THEN 1 ELSE 0 END)', 'total_aprovacoes')
      .addSelect('SUM(CASE WHEN h.acao = :rejeitar THEN 1 ELSE 0 END)', 'total_rejeicoes')
      .where('h.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio: periodo.data_inicio,
        dataFim: periodo.data_fim,
      })
      .setParameter('aprovar', AcaoAprovacao.APROVAR)
      .setParameter('rejeitar', AcaoAprovacao.REJEITAR)
      .groupBy('h.aprovador_id')
      .orderBy('total_acoes', 'DESC');

    if (top) {
      queryBuilder.limit(top);
    }

    return queryBuilder.getRawMany();
  }

  /**
   * Gera relatório de aprovações
   */
  async gerarRelatorioAprovacoes(
    parametros: {
      data_inicio: Date;
      data_fim: Date;
      formato?: 'json' | 'excel' | 'csv';
      incluir_detalhes?: boolean;
    },
    usuario: Usuario,
  ): Promise<any> {
    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.acao_critica', 'ac')
      .where('s.created_at BETWEEN :dataInicio AND :dataFim', {
        dataInicio: parametros.data_inicio,
        dataFim: parametros.data_fim,
      })
      .orderBy('s.created_at', 'DESC');

    const solicitacoes = await queryBuilder.getMany();
    
    const relatorio = {
      periodo: {
        inicio: parametros.data_inicio,
        fim: parametros.data_fim,
      },
      total_solicitacoes: solicitacoes.length,
      solicitacoes: parametros.incluir_detalhes ? solicitacoes : undefined,
      estatisticas: await this.obterEstatisticasSolicitacoes({
        data_inicio: parametros.data_inicio,
        data_fim: parametros.data_fim,
      }),
      gerado_em: new Date(),
      gerado_por: usuario.id,
    };

    return relatorio;
  }

  /**
   * Verifica se o aprovador tem permissão para aprovar uma solicitação específica
   */
  async verificarPermissaoAprovador(
    aprovadorId: string,
    solicitacaoId: string,
  ): Promise<boolean> {
    try {
      // Buscar a solicitação com suas relações
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['acao_critica'],
      });

      if (!solicitacao) {
        return false;
      }

      // Buscar aprovadores configurados para esta ação
      const aprovador = await this.aprovadorRepository.findOne({
        where: {
          usuario_id: aprovadorId,
          ativo: true,
        },
        relations: ['configuracao_aprovacao'],
      });

      if (!aprovador) {
        return false;
      }

      // Verificar se o aprovador está configurado para esta ação crítica
      const configuracao = await this.configuracaoRepository.findOne({
        where: {
          id: aprovador.configuracao_aprovacao_id,
          acao_critica_id: solicitacao.acao_critica.id,
          ativa: true,
        },
      });

      return !!configuracao;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão do aprovador ${aprovadorId} para solicitação ${solicitacaoId}:`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Verifica se um usuário é um aprovador ativo
   */
  async verificarSeEhAprovador(usuarioId: string): Promise<boolean> {
    try {
      const aprovador = await this.aprovadorRepository.findOne({
        where: {
          usuario_id: usuarioId,
          ativo: true,
        },
      });

      return !!aprovador;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar se usuário ${usuarioId} é aprovador:`,
        error.stack,
      );
      return false;
    }
   }

   /**
    * Verifica se um usuário está ativo
    */
   async verificarUsuarioAtivo(usuarioId: string): Promise<boolean> {
     try {
       /**
       * Implementar integração com serviço de usuários
       * para verificar status ativo do usuário
       */
       return true;
     } catch (error) {
       this.logger.error(
         `Erro ao verificar se usuário ${usuarioId} está ativo:`,
         error.stack,
       );
       return false;
     }
   }

   /**
    * Busca solicitação pendente por critérios
    */
   async buscarSolicitacaoPendente(
     solicitanteId: string,
     tipoAcao: TipoAcaoCritica,
     chaveContexto?: string,
   ): Promise<SolicitacaoAprovacao | null> {
     try {
       const where: any = {
         usuario_solicitante_id: solicitanteId,
         status: StatusSolicitacaoAprovacao.PENDENTE,
       };

       if (chaveContexto) {
         where.contexto = chaveContexto;
       }

       return await this.solicitacaoRepository.findOne({
         where,
         relations: ['acao_critica'],
       });
     } catch (error) {
       this.logger.error(
         `Erro ao buscar solicitação pendente:`,
         error.stack,
       );
       return null;
     }
   }

   /**
    * Obtém status em tempo real do sistema de aprovação
    */
   async obterStatusTempoReal(): Promise<any> {
     try {
       const solicitacoesPendentes = await this.solicitacaoRepository.count({
         where: { status: StatusSolicitacaoAprovacao.PENDENTE },
       });

       const solicitacoesVencendo = await this.solicitacaoRepository.count({
         where: {
           status: StatusSolicitacaoAprovacao.PENDENTE,
           data_expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000), // próximas 24h
         },
       });

       const aprovadoresOnline = await this.aprovadorRepository.count({
         where: { ativo: true },
       });

       return {
         timestamp: new Date().toISOString(),
         solicitacoes_pendentes: solicitacoesPendentes,
         solicitacoes_vencendo: solicitacoesVencendo,
         aprovadores_online: aprovadoresOnline,
         tempo_medio_fila: await this.calcularTempoMedioFila(),
         alertas_ativos: [],
         performance: {
           cpu_usage: 0,
           memory_usage: 0,
           response_time: 0,
           throughput: 0,
         },
       };
     } catch (error) {
       this.logger.error('Erro ao obter status em tempo real:', error.stack);
       throw error;
     }
   }

   /**
    * Obtém alertas ativos do sistema
    */
   async obterAlertasAtivos(filtros?: { severidade?: string; tipo?: string }): Promise<any[]> {
     try {
       /**
        * Sistema de alertas será implementado em versão futura
        * com integração ao sistema de monitoramento
        */
       return [];
     } catch (error) {
       this.logger.error('Erro ao obter alertas ativos:', error.stack);
       throw error;
     }
   }

   /**
    * Executa limpeza de dados antigos
    */
   async executarLimpezaDados(
     parametros: {
       dias_retencao: number;
       tipos_dados?: string[];
       modo_teste?: boolean;
     },
     usuario: Usuario,
   ): Promise<any> {
     try {
       this.logger.log('Executando limpeza de dados', { parametros, usuarioId: usuario.id });
       
       /**
        * Implementação de limpeza de dados será adicionada
        * conforme políticas de retenção definidas
        */
       return {
         registros_removidos: 0,
         espaco_liberado: '0 MB',
         tempo_execucao: 0,
         detalhes: {
           modo_teste: parametros.modo_teste || false,
           tipos_processados: parametros.tipos_dados || [],
         },
       };
     } catch (error) {
       this.logger.error('Erro ao executar limpeza de dados:', error.stack);
       throw error;
     }
   }

   /**
    * Reprocessa solicitações com erro
    */
   async reprocessarSolicitacoes(
     parametros: {
       solicitacao_ids?: string[];
       filtros?: {
         data_inicio?: string;
         data_fim?: string;
         tipos_erro?: string[];
       };
       modo_teste?: boolean;
     },
     usuario: Usuario,
   ): Promise<any> {
     try {
       this.logger.log('Reprocessando solicitações', { parametros, usuarioId: usuario.id });
       
       /**
        * Sistema de reprocessamento será implementado
        * com base em filas de retry e logs de erro
        */
       return {
         solicitacoes_reprocessadas: 0,
         sucessos: 0,
         falhas: 0,
         detalhes: [],
       };
     } catch (error) {
       this.logger.error('Erro ao reprocessar solicitações:', error.stack);
       throw error;
     }
   }

   /**
    * Verifica saúde do sistema de aprovação
    */
   async healthCheck(): Promise<any> {
     try {
       const dbStatus = await this.verificarStatusDatabase();
       const cacheStatus = await this.verificarStatusCache();
       
       const status = dbStatus && cacheStatus ? 'healthy' : 'degraded';
       
       return {
         status,
         timestamp: new Date().toISOString(),
         componentes: {
           database: { status: dbStatus ? 'ok' : 'error' },
           cache: { status: cacheStatus ? 'ok' : 'error' },
           queue: { status: 'ok' },
           notifications: { status: 'ok' },
           escalation: { status: 'ok' },
         },
         metricas: {
           uptime: process.uptime(),
           requests_per_minute: 0,
           error_rate: 0,
           response_time_avg: 0,
         },
       };
     } catch (error) {
       this.logger.error('Erro no health check:', error.stack);
       return {
         status: 'unhealthy',
         timestamp: new Date().toISOString(),
         error: error.message,
       };
     }
   }

   /**
    * Verifica status do banco de dados
    */
   private async verificarStatusDatabase(): Promise<boolean> {
     try {
       await this.solicitacaoRepository.query('SELECT 1');
       return true;
     } catch (error) {
       return false;
     }
   }

   /**
    * Delega uma solicitação de aprovação para outro aprovador
    */
   async delegarSolicitacao(
     solicitacaoId: string,
     dados: {
       delegado_para_usuario_id: string;
       justificativa: string;
       dados_contexto?: Record<string, any>;
     },
     usuario: Usuario,
   ): Promise<SolicitacaoAprovacao> {
     try {
       // Buscar a solicitação
       const solicitacao = await this.buscarSolicitacaoPorId(solicitacaoId);
       if (!solicitacao) {
         throw new NotFoundException('Solicitação não encontrada');
       }

       // Verificar se o usuário tem permissão para delegar
       const temPermissao = await this.verificarPermissaoAprovador(
         usuario.id,
         solicitacao.configuracao_aprovacao_id,
       );
       if (!temPermissao) {
         throw new ForbiddenException('Usuário não tem permissão para delegar esta solicitação');
       }

       // Verificar se o aprovador destino existe e está ativo
       const aprovadorDestino = await this.aprovadorRepository.findOne({
         where: {
           id: dados.delegado_para_usuario_id,
           ativo: true,
         },
       });
       if (!aprovadorDestino) {
         throw new NotFoundException('Aprovador destino não encontrado ou inativo');
       }

       // Criar registro de delegação
       const delegacao = this.delegacaoRepository.create({
         aprovador_origem_id: usuario.id,
         aprovador_delegado_id: dados.delegado_para_usuario_id,
         motivo: dados.justificativa,
         data_inicio: new Date(),
         data_fim: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
         escopo: 'GLOBAL',
         ativo: true,
       });

       await this.delegacaoRepository.save(delegacao);

       // Atualizar a solicitação
       await this.solicitacaoRepository.save(solicitacao);

       this.logger.log(
         `Solicitação ${solicitacaoId} delegada de ${usuario.id} para ${dados.delegado_para_usuario_id}`,
       );

       return solicitacao;
     } catch (error) {
       this.logger.error(
         `Erro ao delegar solicitação ${solicitacaoId}:`,
         error.stack,
       );
       throw error;
     }
   }

   /**
    * Verifica status do cache
    */
   private async verificarStatusCache(): Promise<boolean> {
     try {
       /**
        * Verificação de cache será implementada
        * quando sistema de cache for integrado
        */
       return true;
     } catch (error) {
       return false;
     }
   }

   /**
    * Calcula o valor total envolvido nas solicitações
    */
   private async calcularValorTotalEnvolvido(filtros: FiltroSolicitacaoDto): Promise<number> {
     try {
       const queryBuilder = this.solicitacaoRepository
         .createQueryBuilder('s')
         .select('SUM(s.valor_envolvido)', 'total');

       // Aplicar os mesmos filtros da listagem
       if (filtros.status) {
         queryBuilder.andWhere('s.status = :status', { status: filtros.status });
       }
       if (filtros.usuario_solicitante_id) {
         queryBuilder.andWhere('s.usuario_solicitante_id = :usuario_solicitante_id', {
           usuario_solicitante_id: filtros.usuario_solicitante_id,
         });
       }
       if (filtros.data_inicio) {
         queryBuilder.andWhere('s.created_at >= :data_inicio', { data_inicio: filtros.data_inicio });
       }
       if (filtros.data_fim) {
         queryBuilder.andWhere('s.created_at <= :data_fim', { data_fim: filtros.data_fim });
       }

       const result = await queryBuilder.getRawOne();
       return parseFloat(result?.total || '0');
     } catch (error) {
       this.logger.error('Erro ao calcular valor total envolvido:', error.stack);
       return 0;
     }
   }

   /**
    * Calcula o tempo médio de aprovação em horas
    */
   private async calcularTempoMedioAprovacao(filtros: FiltroSolicitacaoDto): Promise<number> {
     try {
       const queryBuilder = this.solicitacaoRepository
         .createQueryBuilder('s')
         .select('AVG(EXTRACT(EPOCH FROM (s.data_conclusao - s.created_at)) / 3600)', 'tempo_medio')
         .where('s.status = :status', { status: StatusSolicitacaoAprovacao.APROVADA })
         .andWhere('s.data_conclusao IS NOT NULL');

       // Aplicar filtros de data
       if (filtros.data_inicio) {
         queryBuilder.andWhere('s.created_at >= :data_inicio', { data_inicio: filtros.data_inicio });
       }
       if (filtros.data_fim) {
         queryBuilder.andWhere('s.created_at <= :data_fim', { data_fim: filtros.data_fim });
       }

       const result = await queryBuilder.getRawOne();
       return parseFloat(result?.tempo_medio || '0');
     } catch (error) {
       this.logger.error('Erro ao calcular tempo médio de aprovação:', error.stack);
       return 0;
     }
   }

   /**
    * Calcula o tempo médio de permanência na fila em horas
    */
   private async calcularTempoMedioFila(): Promise<number> {
     try {
       const queryBuilder = this.solicitacaoRepository
         .createQueryBuilder('s')
         .select('AVG(EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 3600)', 'tempo_medio')
         .where('s.status = :status', { status: StatusSolicitacaoAprovacao.PENDENTE });

       const result = await queryBuilder.getRawOne();
       return parseFloat(result?.tempo_medio || '0');
     } catch (error) {
       this.logger.error('Erro ao calcular tempo médio da fila:', error.stack);
       return 0;
     }
   }
 }
