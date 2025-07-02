import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FiltroConcessaoDto } from '../dto/filtro-concessao.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concessao } from '../../../entities/concessao.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoService } from '../../pagamento/services/pagamento.service';
import { HistoricoConcessao } from '../../../entities/historico-concessao.entity';
import { ValidacaoBeneficioService } from './validacao-beneficio.service';
import { LoggingService } from '../../../shared/logging/logging.service';
import { StatusPagamentoEnum } from '@/enums';
import {
  OperacaoConcessao,
  MOTIVOS_POR_OPERACAO,
  MotivoOperacao,
} from '../../../enums/operacao-concessao.enum';

@Injectable()
export class ConcessaoService {
  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepo: Repository<Concessao>,
    private readonly pagamentoService: PagamentoService,
    @InjectRepository(HistoricoConcessao)
    private readonly historicoRepo: Repository<HistoricoConcessao>,
    private readonly validacaoBeneficioService: ValidacaoBeneficioService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Valida se a transição de status é permitida
   * @param statusAtual Status atual da concessão
   * @param novoStatus Novo status desejado
   * @returns true se a transição é válida, false caso contrário
   */
  private isValidStatusTransition(
    statusAtual: StatusConcessao,
    novoStatus: StatusConcessao,
  ): boolean {
    // Mapeamento das transições válidas
    const transicoesValidas: Record<StatusConcessao, StatusConcessao[]> = {
      [StatusConcessao.APTO]: [
        StatusConcessao.ATIVO,
        StatusConcessao.CANCELADO,
        StatusConcessao.SUSPENSO,
        StatusConcessao.BLOQUEADO,
      ],
      [StatusConcessao.ATIVO]: [
        StatusConcessao.SUSPENSO,
        StatusConcessao.BLOQUEADO,
        StatusConcessao.CESSADO,
        StatusConcessao.CANCELADO,
      ],
      [StatusConcessao.SUSPENSO]: [
        StatusConcessao.ATIVO,
        StatusConcessao.BLOQUEADO,
        StatusConcessao.CANCELADO,
      ],
      [StatusConcessao.BLOQUEADO]: [
        StatusConcessao.ATIVO,
        StatusConcessao.CANCELADO,
      ],
      [StatusConcessao.CESSADO]: [StatusConcessao.ATIVO],
      [StatusConcessao.CANCELADO]: [
        // Status final - não permite transições
      ],
    };

    const transicoesPermitidas = transicoesValidas[statusAtual] || [];
    return transicoesPermitidas.includes(novoStatus);
  }

  async findAll(
    filtro?: FiltroConcessaoDto,
  ): Promise<{ data: any[]; total: number; limit: number; offset: number }> {
    try {
      const qb = this.concessaoRepo
        .createQueryBuilder('concessao')
        .leftJoin('concessao.solicitacao', 'solicitacao')
        .leftJoin('solicitacao.beneficiario', 'cidadao')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoin('solicitacao.unidade', 'unidade')
        .select([
          'concessao.id',
          'concessao.dataInicio as data_inicio',
          'concessao.status as status',
          'concessao.ordem_prioridade as prioridade',
          'solicitacao.protocolo as protocolo',
          'solicitacao.determinacao_judicial_flag as determinacao_judicial',
          'cidadao.nome as nome_beneficiario',
          'cidadao.cpf as cpf_beneficiario',
          'tipo_beneficio.nome as nome_beneficio',
          'unidade.nome as nome_unidade',
        ]);

      // Valor padrão para filtro
      if (!filtro) {
        filtro = new FiltroConcessaoDto();
      }

      // Validação de filtros de data
      if (filtro.dataInicioDe && filtro.dataInicioAte) {
        if (new Date(filtro.dataInicioDe) > new Date(filtro.dataInicioAte)) {
          throw new BadRequestException(
            'Data de início deve ser anterior à data final',
          );
        }
      }

      // Validação de status
      if (
        filtro.status &&
        !Object.values(StatusConcessao).includes(filtro.status)
      ) {
        throw new BadRequestException(
          `Status '${filtro.status}' inválido. Valores aceitos: ${Object.values(StatusConcessao).join(', ')}`,
        );
      }

      // Validação de paginação
      const limit = Math.min(filtro.limit ?? 100, 1000); // Máximo de 1000 registros por página
      if (limit <= 0) {
        throw new BadRequestException('Limit deve ser maior que zero');
      }

      let offset = filtro.offset ?? 0;
      if (filtro.page !== undefined) {
        if (filtro.page <= 0) {
          throw new BadRequestException('Page deve ser maior que zero');
        }
        offset = (filtro.page - 1) * limit;
      }

      // Aplicar filtros de busca
      if (filtro.dataInicioDe) {
        qb.andWhere('concessao.dataInicio >= :dataInicioDe', {
          dataInicioDe: filtro.dataInicioDe,
        });
      }
      if (filtro.dataInicioAte) {
        qb.andWhere('concessao.dataInicio <= :dataInicioAte', {
          dataInicioAte: filtro.dataInicioAte,
        });
      }
      if (filtro.status) {
        qb.andWhere('concessao.status = :status', { status: filtro.status });
      }
      if (filtro.unidadeId) {
        qb.andWhere('unidade.id = :unidadeId', { unidadeId: filtro.unidadeId });
      }
      if (filtro.tipoBeneficioId) {
        qb.andWhere('tipo_beneficio.id = :tipoBeneficioId', {
          tipoBeneficioId: filtro.tipoBeneficioId,
        });
      }
      if (filtro.determinacaoJudicial !== undefined) {
        qb.andWhere('solicitacao.determinacao_judicial_flag = :dj', {
          dj: filtro.determinacaoJudicial,
        });
      }
      if (filtro.prioridade) {
        qb.andWhere('concessao.ordem_prioridade = :prioridade', {
          prioridade: filtro.prioridade,
        });
      }
      if (filtro.search?.trim()) {
        const term = `%${filtro.search.toLowerCase().trim()}%`;
        qb.andWhere(
          '(LOWER(cidadao.nome) LIKE :term OR cidadao.cpf LIKE :cpfTerm OR solicitacao.protocolo ILIKE :termProto)',
          {
            term,
            cpfTerm: `%${filtro.search.replace(/\D/g, '')}%`,
            termProto: term,
          },
        );
      }

      // Obter contagem total antes de aplicar paginação
      const total = await qb.getCount();

      // Aplicar paginação
      qb.limit(limit);
      qb.offset(offset);

      // Buscar dados paginados
      const data = await qb.getRawMany();

      this.logger.info(
        `Listagem de concessões executada: ${data.length} registros de ${total} total`,
        ConcessaoService.name,
      );

      // Retornar estrutura de dados paginados
      return {
        data,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao listar concessões: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao listar concessões. Verifique os logs para mais detalhes.`,
      );
    }
  }

  async findById(id: string): Promise<Concessao | null> {
    try {
      // Validação de parâmetros de entrada
      if (!id?.trim()) {
        throw new BadRequestException('ID da concessão é obrigatório');
      }

      const concessao = await this.concessaoRepo.findOne({
        where: { id },
        relations: [
          'solicitacao',
          'solicitacao.beneficiario',
          'solicitacao.tipo_beneficio',
        ],
      });

      if (!concessao) {
        this.logger.warn(
          `Concessão com ID ${id} não encontrada`,
          ConcessaoService.name,
        );
      }

      return concessao;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar concessão ${id}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao buscar concessão. Verifique os logs para mais detalhes.`,
      );
    }
  }

  async atualizarStatus(
    id: string,
    status: StatusConcessao,
    usuarioId?: string,
    motivo?: string,
  ): Promise<Concessao | null> {
    try {
      // Validação de parâmetros de entrada
      if (!id?.trim()) {
        throw new BadRequestException('ID da concessão é obrigatório');
      }

      // Validação do enum de status
      if (!Object.values(StatusConcessao).includes(status)) {
        throw new BadRequestException(
          `Status '${status}' inválido. Valores aceitos: ${Object.values(StatusConcessao).join(', ')}`,
        );
      }

      const concessao = await this.concessaoRepo.findOne({ where: { id } });
      if (!concessao) {
        this.logger.warn(
          `Tentativa de atualizar status de concessão inexistente: ${id}`,
          ConcessaoService.name,
        );
        return null;
      }

      const statusAnterior = concessao.status;
      if (statusAnterior === status) {
        this.logger.info(
          `Concessão ${id} já possui o status ${status}`,
          ConcessaoService.name,
        );
        return concessao;
      }

      // Validações de transição de status
      if (!this.isValidStatusTransition(statusAnterior, status)) {
        throw new BadRequestException(
          `Transição de status inválida: de '${statusAnterior}' para '${status}'`,
        );
      }

      concessao.status = status;
      const concessaoSalva = await this.concessaoRepo.save(concessao);

      // registra histórico com tratamento de erro
      try {
        const historico = this.historicoRepo.create({
          concessaoId: concessao.id,
          statusAnterior,
          statusNovo: status,
          motivo: motivo ?? null,
          alteradoPor: usuarioId ?? null,
        });
        await this.historicoRepo.save(historico);
      } catch (historicoError) {
        this.logger.error(
          `Erro ao registrar histórico para concessão ${id}: ${historicoError.message}`,
          historicoError.stack,
          ConcessaoService.name,
        );
        // Não falha a operação principal, mas registra o erro
      }

      this.logger.info(
        `Status da concessão ${id} atualizado de '${statusAnterior}' para '${status}' por ${usuarioId || 'SISTEMA'}`,
        ConcessaoService.name,
      );

      return concessaoSalva;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da concessão ${id}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao atualizar status da concessão. Verifique os logs para mais detalhes.`,
      );
    }
  }

  /**
   * Cria uma prorrogação de concessão (nova concessão vinculada)
   * Prorrogação é sempre por igual período da concessão anterior
   * @param concessaoId ID da concessão a ser prorrogada
   * @param usuarioId ID do usuário que está solicitando a prorrogação
   * @param documentoJudicialId ID opcional do documento judicial para prorrogações judiciais
   * @returns Nova concessão criada
   */
  async prorrogarConcessao(
    concessaoId: string,
    usuarioId: string,
    documentoJudicialId?: string,
  ): Promise<Concessao> {
    // Buscar a concessão original
    const concessaoOriginal = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
    });

    if (!concessaoOriginal) {
      throw new BadRequestException('Concessão não encontrada');
    }

    if (concessaoOriginal.status !== StatusConcessao.CESSADO) {
      throw new BadRequestException(
        'Apenas concessões com status CESSADO podem ser prorrogadas',
      );
    }

    const solicitacaoOriginal = concessaoOriginal.solicitacao;

    // Para solicitações com determinação judicial, verifica se documento está sendo fornecido
    if (
      solicitacaoOriginal.determinacao_judicial_flag &&
      !documentoJudicialId &&
      !solicitacaoOriginal.determinacao_judicial_id
    ) {
      throw new BadRequestException(
        'Documento judicial é obrigatório para prorrogações de concessões com determinação judicial',
      );
    }

    // Validar limite de prorrogações (máximo 1), exceto por determinação judicial
    if (!solicitacaoOriginal.determinacao_judicial_flag) {
      const concessoesRelacionadas = await this.concessaoRepo.find({
        where: { solicitacaoId: solicitacaoOriginal.id },
      });

      if (concessoesRelacionadas.length > 1) {
        throw new BadRequestException(
          'Esta concessão já foi prorrogada uma vez. Limite máximo atingido.',
        );
      }
    }

    // Obter quantidade de parcelas da concessão original
    const pagamentosOriginais = await this.pagamentoService.findAll({
      concessao_id: concessaoOriginal.id,
    }); // Buscar todos os pagamentos da concessão

    const quantidadeParcelasOriginal =
      pagamentosOriginais.pagination.totalItems;

    if (quantidadeParcelasOriginal === 0) {
      throw new BadRequestException(
        'Concessão original não possui pagamentos gerados',
      );
    }

    // Validar se o tipo de benefício permite prorrogação
    const tipoBeneficio = solicitacaoOriginal.tipo_beneficio;
    if (!tipoBeneficio) {
      throw new BadRequestException('Tipo de benefício não encontrado');
    }

    if (!solicitacaoOriginal.determinacao_judicial_flag) {
      if (tipoBeneficio.periodicidade === 'unico') {
        throw new BadRequestException(
          'Benefícios de periodicidade única não podem ser prorrogados',
        );
      }
    }

    // Criar nova concessão vinculada à mesma solicitação
    const novaConcessao = this.concessaoRepo.create({
      solicitacaoId: solicitacaoOriginal.id,
      status: StatusConcessao.APTO,
      ordemPrioridade: solicitacaoOriginal.prioridade ?? 3,
      determinacaoJudicialFlag: solicitacaoOriginal.determinacao_judicial_flag,
      dataInicio: new Date(),
    });

    const concessaoSalva = await this.concessaoRepo.save(novaConcessao);

    // Registrar no histórico
    const historico = this.historicoRepo.create({
      concessaoId: concessaoSalva.id,
      statusAnterior: StatusConcessao.APTO,
      statusNovo: StatusConcessao.APTO,
      motivo: solicitacaoOriginal.determinacao_judicial_flag
        ? 'Prorrogação por determinação judicial'
        : 'Prorrogação de concessão anterior',
      alteradoPor: usuarioId,
    });
    await this.historicoRepo.save(historico);

    // Gerar pagamentos para a nova concessão com a mesma quantidade da original
    await this.pagamentoService.gerarPagamentosParaConcessao(
      concessaoSalva,
      solicitacaoOriginal,
      usuarioId,
    );

    this.logger.info(
      `Concessão ${concessaoId} prorrogada. Nova concessão ${concessaoSalva.id} criada com ${quantidadeParcelasOriginal} parcelas (mesmo período da concessão anterior)`,
    );

    return concessaoSalva;
  }

  async criarSeNaoExistir(solicitacao: Solicitacao): Promise<Concessao> {
    try {
      // Validação de parâmetros de entrada
      if (!solicitacao) {
        throw new BadRequestException('Solicitação é obrigatória');
      }
      if (!solicitacao.id) {
        throw new BadRequestException('ID da solicitação é obrigatório');
      }

      // Ignoramos a validação aqui se a solicitação já passou pelo workflow de aprovação
      // As validações completas são feitas antes no ValidacaoBeneficioService
      // Verifica se já existe concessão para esta solicitação e status ativo
      const existente = await this.concessaoRepo.findOne({
        where: { solicitacaoId: solicitacao.id },
      });
      if (existente) {
        this.logger.info(
          `Concessão já existe para solicitação ${solicitacao.id}: ${existente.id}`,
          ConcessaoService.name,
        );
        return existente;
      }

      // Calcular data de encerramento baseada na duração do benefício
      const dataInicio = new Date();
      let dataEncerramento: Date | null = null;

      // Para benefícios com duração definida, calcular data de encerramento
      if (solicitacao.tipo_beneficio?.especificacoes?.duracao_maxima_meses) {
        dataEncerramento = new Date(dataInicio);
        dataEncerramento.setMonth(
          dataEncerramento.getMonth() +
            solicitacao.tipo_beneficio.especificacoes.duracao_maxima_meses,
        );
      }

      const concessao = this.concessaoRepo.create({
        solicitacaoId: solicitacao.id,
        status: StatusConcessao.ATIVO,
        ordemPrioridade: solicitacao.prioridade ?? 3,
        determinacaoJudicialFlag: solicitacao.determinacao_judicial_flag,
        dataInicio,
        dataEncerramento,
      });

      const saved = await this.concessaoRepo.save(concessao);

      // Gera pagamentos com status PENDENTE para a concessão criada
      // Nota: usuarioId não está disponível neste contexto, usando 'system'
      try {
        await this.pagamentoService.gerarPagamentosParaConcessao(
          saved,
          solicitacao,
          'system',
        );
      } catch (pagamentoError) {
        this.logger.error(
          `Erro ao gerar pagamentos para concessão ${saved.id}: ${pagamentoError.message}`,
          pagamentoError.stack,
          ConcessaoService.name,
        );
        // Não falha a criação da concessão, mas registra o erro
        // Os pagamentos podem ser gerados posteriormente
      }

      this.logger.info(
        `Nova concessão criada: ${saved.id} para solicitação ${solicitacao.id}`,
        ConcessaoService.name,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Erro ao criar concessão para solicitação ${solicitacao?.id}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao criar concessão. Verifique os logs para mais detalhes.`,
      );
    }
  }

  /**
   * Suspende uma concessão ativa
   * @param concessaoId ID da concessão a ser suspensa
   * @param usuarioId ID do usuário que está realizando a suspensão
   * @param motivo Motivo da suspensão
   * @param data_revisao Data prevista para revisão da suspensão
   * @returns Concessão suspensa
   */
  async suspenderConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
    data_revisao?: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.SUSPENSO;
    concessao.motivoSuspensao = motivo;
    if (data_revisao) {
      concessao.dataRevisaoSuspensao = new Date(data_revisao);
    }

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.SUSPENSO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.warn(
      `Concessão ${concessaoId} suspensa por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

  /**
   * Bloqueia uma concessão
   * @param concessaoId ID da concessão a ser bloqueada
   * @param usuarioId ID do usuário que está realizando o bloqueio
   * @param motivo Motivo do bloqueio
   * @returns Concessão bloqueada
   */
  async bloquearConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.BLOQUEADO;
    concessao.motivoBloqueio = motivo;
    concessao.dataBloqueio = new Date();

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.BLOQUEADO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.warn(
      `Concessão ${concessaoId} bloqueada por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

  /**
   * Reativa uma concessão suspensa ou cessada
   * @param concessaoId ID da concessão a ser reativada
   * @param usuarioId ID do usuário que está realizando a reativação
   * @param motivo Motivo da reativação
   * @returns Concessão reativada
   */
  async reativarConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    try {
      // Validação de parâmetros de entrada
      if (!concessaoId?.trim()) {
        throw new BadRequestException('ID da concessão é obrigatório');
      }
      if (!usuarioId?.trim()) {
        throw new BadRequestException('ID do usuário é obrigatório');
      }
      if (!motivo?.trim()) {
        throw new BadRequestException('Motivo da reativação é obrigatório');
      }

      const concessao = await this.concessaoRepo.findOne({
        where: { id: concessaoId },
        relations: ['solicitacao'],
      });

      if (!concessao) {
        throw new NotFoundException(
          `Concessão com ID ${concessaoId} não encontrada`,
        );
      }

      // Validação de status - apenas concessões suspensas ou cessadas podem ser reativadas
      if (
        ![StatusConcessao.SUSPENSO, StatusConcessao.CESSADO].includes(
          concessao.status,
        )
      ) {
        throw new BadRequestException(
          `Concessão está com status '${concessao.status}'. Apenas concessões com status 'SUSPENSO' ou 'CESSADO' podem ser reativadas`,
        );
      }

      const statusAnterior = concessao.status;
      concessao.status = StatusConcessao.ATIVO;
      concessao.motivoBloqueio = motivo;
      concessao.dataRevisaoSuspensao = new Date();

      const concessaoSalva = await this.concessaoRepo.save(concessao);

      // Registra no histórico com tratamento de erro
      try {
        await this.historicoRepo.save({
          concessaoId: concessao.id,
          statusAnterior,
          statusNovo: StatusConcessao.ATIVO,
          usuarioId,
          motivo,
          dataAlteracao: new Date(),
        });
      } catch (historicoError) {
        this.logger.error(
          `Erro ao registrar histórico para concessão ${concessaoId}: ${historicoError.message}`,
          historicoError.stack,
          ConcessaoService.name,
        );
        // Não falha a operação principal, mas registra o erro
      }

      this.logger.info(
        `Concessão ${concessaoId} reativada por ${usuarioId}. Motivo: ${motivo}`,
        ConcessaoService.name,
      );
      return concessaoSalva;
    } catch (error) {
      // Log detalhado do erro para debugging
      this.logger.error(
        `Erro ao reativar concessão ${concessaoId}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao reativar concessão. Verifique os logs para mais detalhes.`,
      );
    }
  }

  /**
   * Desbloqueia uma concessão bloqueada
   * @param concessaoId ID da concessão a ser desbloqueada
   * @param usuarioId ID do usuário que está realizando o desbloqueio
   * @param motivo Motivo do desbloqueio
   * @returns Concessão desbloqueada
   */
  async desbloquearConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    try {
      // Validação de parâmetros de entrada
      if (!concessaoId?.trim()) {
        throw new BadRequestException('ID da concessão é obrigatório');
      }
      if (!usuarioId?.trim()) {
        throw new BadRequestException('ID do usuário é obrigatório');
      }
      if (!motivo?.trim()) {
        throw new BadRequestException('Motivo do desbloqueio é obrigatório');
      }

      const concessao = await this.concessaoRepo.findOne({
        where: { id: concessaoId },
        relations: ['solicitacao'],
      });

      if (!concessao) {
        throw new NotFoundException(
          `Concessão com ID ${concessaoId} não encontrada`,
        );
      }

      // Validação de status com mensagem mais específica
      if (concessao.status !== StatusConcessao.BLOQUEADO) {
        throw new BadRequestException(
          `Concessão está com status '${concessao.status}'. Apenas concessões com status 'BLOQUEADO' podem ser desbloqueadas`,
        );
      }

      const statusAnterior = concessao.status;
      // Retorna ao status anterior ao bloqueio (geralmente ATIVO)
      concessao.status = StatusConcessao.ATIVO;
      concessao.motivoDesbloqueio = motivo;
      concessao.dataDesbloqueio = new Date();

      const concessaoSalva = await this.concessaoRepo.save(concessao);

      // Registra no histórico com tratamento de erro
      try {
        await this.historicoRepo.save({
          concessaoId: concessao.id,
          statusAnterior,
          statusNovo: StatusConcessao.ATIVO,
          usuarioId,
          motivo,
          dataAlteracao: new Date(),
        });
      } catch (historicoError) {
        this.logger.error(
          `Erro ao registrar histórico para concessão ${concessaoId}: ${historicoError.message}`,
          historicoError.stack,
          ConcessaoService.name,
        );
        // Não falha a operação principal, mas registra o erro
      }

      this.logger.info(
        `Concessão ${concessaoId} desbloqueada por ${usuarioId}. Motivo: ${motivo}`,
        ConcessaoService.name,
      );
      return concessaoSalva;
    } catch (error) {
      // Log detalhado do erro para debugging
      this.logger.error(
        `Erro ao desbloquear concessão ${concessaoId}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao desbloquear concessão. Verifique os logs para mais detalhes.`,
      );
    }
  }

  /**
   * Cancela uma concessão ativa
   *
   * @param concessaoId ID da concessão
   * @param motivo Motivo do cancelamento
   * @param usuarioId ID do usuário que está cancelando
   * @returns Concessão cancelada
   */
  async cancelarConcessao(
    concessaoId: string,
    motivo: string,
    usuarioId: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.cidadao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    if (concessao.status !== StatusConcessao.ATIVO) {
      throw new BadRequestException(
        'Apenas concessões ativas podem ser canceladas',
      );
    }

    // Atualizar status da concessão
    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.CANCELADO;
    concessao.dataEncerramento = new Date();
    concessao.motivoEncerramento = motivo;

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registrar no histórico
    const historico = this.historicoRepo.create({
      concessaoId: concessaoSalva.id,
      statusAnterior,
      statusNovo: StatusConcessao.CANCELADO,
      motivo,
      alteradoPor: usuarioId,
    });
    await this.historicoRepo.save(historico);

    this.logger.warn(
      `Concessão ${concessaoId} cancelada por usuário ${usuarioId}`,
      ConcessaoService.name,
    );

    return concessaoSalva;
  }

  /**
   * Verifica se todos os pagamentos de uma concessão estão liberados
   * e encerra automaticamente a concessão se necessário
   *
   * @param concessaoId ID da concessão
   * @returns Concessão atualizada ou null se não precisou ser alterada
   */
  async verificarEncerramentoAutomatico(
    concessaoId: string,
  ): Promise<Concessao | null> {
    try {
      // Validação de parâmetros de entrada
      if (!concessaoId?.trim()) {
        throw new BadRequestException('ID da concessão é obrigatório');
      }

      const concessao = await this.concessaoRepo.findOne({
        where: { id: concessaoId },
        relations: ['pagamentos'],
      });

      if (!concessao) {
        this.logger.warn(
          `Tentativa de verificar encerramento de concessão inexistente: ${concessaoId}`,
          ConcessaoService.name,
        );
        throw new NotFoundException(
          `Concessão com ID ${concessaoId} não encontrada`,
        );
      }

      // Só verifica concessões ativas
      if (concessao.status !== StatusConcessao.ATIVO) {
        this.logger.debug(
          `Concessão ${concessaoId} não está ativa (status: ${concessao.status}), pulando verificação de encerramento`,
          ConcessaoService.name,
        );
        return null;
      }

      // Verifica se há pagamentos
      if (!concessao.pagamentos || concessao.pagamentos.length === 0) {
        this.logger.debug(
          `Concessão ${concessaoId} não possui pagamentos, pulando verificação de encerramento`,
          ConcessaoService.name,
        );
        return null;
      }

      // Verifica se todos os pagamentos estão liberados
      const todosLiberados = concessao.pagamentos.every(
        (pagamento) => pagamento.status === StatusPagamentoEnum.LIBERADO,
      );

      if (todosLiberados) {
        const statusAnterior = concessao.status;
        concessao.status = StatusConcessao.CESSADO;
        concessao.dataEncerramento = new Date();
        concessao.motivoEncerramento =
          'Encerramento automático - todos os pagamentos liberados';

        const concessaoSalva = await this.concessaoRepo.save(concessao);

        // Registra no histórico com tratamento de erro
        try {
          await this.historicoRepo.save({
            concessaoId: concessao.id,
            statusAnterior,
            statusNovo: StatusConcessao.CESSADO,
            motivo: 'Encerramento automático - todos os pagamentos liberados',
            alteradoPor: 'SISTEMA',
            dataAlteracao: new Date(),
          });
        } catch (historicoError) {
          this.logger.error(
            `Erro ao registrar histórico para encerramento automático da concessão ${concessaoId}: ${historicoError.message}`,
            historicoError.stack,
            ConcessaoService.name,
          );
          // Não falha a operação principal, mas registra o erro
        }

        this.logger.info(
          `Concessão ${concessaoId} encerrada automaticamente - todos os ${concessao.pagamentos.length} pagamentos liberados`,
          ConcessaoService.name,
        );
        return concessaoSalva;
      } else {
        const pagamentosLiberados = concessao.pagamentos.filter(
          (pagamento) => pagamento.status === StatusPagamentoEnum.LIBERADO,
        ).length;
        this.logger.debug(
          `Concessão ${concessaoId}: ${pagamentosLiberados}/${concessao.pagamentos.length} pagamentos liberados`,
          ConcessaoService.name,
        );
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar encerramento automático da concessão ${concessaoId}: ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao verificar encerramento automático. Verifique os logs para mais detalhes.`,
      );
    }
  }

  /**
   * Busca os motivos disponíveis para uma operação específica
   *
   * @param operacao Tipo de operação (bloqueio, desbloqueio, suspensão, reativação, cancelamento)
   * @returns Lista de motivos disponíveis para a operação
   */
  async buscarMotivosPorOperacao(
    operacao: OperacaoConcessao,
  ): Promise<MotivoOperacao[]> {
    try {
      // Validação de parâmetros de entrada
      if (!operacao) {
        throw new BadRequestException('Operação é obrigatória');
      }

      // Verifica se a operação é válida
      if (!Object.values(OperacaoConcessao).includes(operacao)) {
        throw new BadRequestException(
          `Operação '${operacao}' inválida. Valores aceitos: ${Object.values(OperacaoConcessao).join(', ')}`,
        );
      }

      // Busca os motivos para a operação específica
      const motivos = MOTIVOS_POR_OPERACAO[operacao] || [];

      // Filtra apenas motivos ativos
      const motivosAtivos = motivos.filter((motivo) => motivo.ativo);

      this.logger.info(
        `Busca de motivos para operação '${operacao}': ${motivosAtivos.length} motivos encontrados`,
        ConcessaoService.name,
      );

      return motivosAtivos;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar motivos para operação '${operacao}': ${error.message}`,
        error.stack,
        ConcessaoService.name,
      );

      // Re-throw erros conhecidos
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Para erros não tratados, lança um erro genérico mas informativo
      throw new BadRequestException(
        `Erro interno ao buscar motivos. Verifique os logs para mais detalhes.`,
      );
    }
  }
}
