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

  /**
   * Lista todas as concessões com filtros e paginação
   * Retorna objetos estruturados com beneficiario, tecnico, unidade e beneficio como propriedades aninhadas
   * @param filtro Filtros opcionais para busca
   * @returns Dados paginados com objetos estruturados
   */
  async findAll(
    filtro?: FiltroConcessaoDto,
  ): Promise<{ data: any[]; total: number; limit: number; offset: number }> {
    try {
      // Valor padrão para filtro
      if (!filtro) {
        filtro = new FiltroConcessaoDto();
      }

      // Validação de filtros de data
      if (filtro.data_inicio && filtro.data_fim) {
        if (new Date(filtro.data_inicio) > new Date(filtro.data_fim)) {
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

      // Construir query com joins para carregar objetos relacionados
      const qb = this.concessaoRepo
        .createQueryBuilder('concessao')
        .leftJoinAndSelect('concessao.solicitacao', 'solicitacao')
        .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
        .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacao.unidade', 'unidade')
        .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
        .select([
          // Dados básicos da concessão
          'concessao.id',
          'concessao.dataInicio',
          'concessao.status',
          'concessao.created_at',
          'concessao.updated_at',
          // Dados básicos da solicitação (excluindo o objeto completo)
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.prioridade',
          'solicitacao.determinacao_judicial_flag',
          // Dados básicos do beneficiário
          'beneficiario.id',
          'beneficiario.nome',
          'beneficiario.cpf',
          // Dados básicos do tipo de benefício
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.codigo',
          // Dados básicos da unidade
          'unidade.id',
          'unidade.nome',
          'unidade.codigo',
          // Dados básicos do técnico
          'tecnico.id',
          'tecnico.nome',
        ]);

      // Aplicar filtros de busca
      if (filtro.data_inicio) {
        qb.andWhere('concessao.dataInicio >= :data_inicio', {
          data_inicio: filtro.data_inicio,
        });
      }
      if (filtro.data_fim) {
        qb.andWhere('concessao.dataInicio <= :data_fim', {
          data_fim: filtro.data_fim,
        });
      }
      if (filtro.status) {
        qb.andWhere('concessao.status = :status', { status: filtro.status });
      }
      if (filtro.unidade_id || filtro.unidadeId) {
        qb.andWhere('unidade.id = :unidade_id', {
          unidade_id: filtro.unidade_id || filtro.unidadeId,
        });
      }
      if (filtro.tipo_beneficio_id || filtro.tipoBeneficioId) {
        qb.andWhere('tipo_beneficio.id = :tipo_beneficio_id', {
          tipo_beneficio_id: filtro.tipo_beneficio_id || filtro.tipoBeneficioId,
        });
      }
      if (filtro.determinacao_judicial !== undefined) {
        qb.andWhere('solicitacao.determinacao_judicial_flag = :dj', {
          dj: filtro.determinacao_judicial,
        });
      }
      if (filtro.prioridade) {
        qb.andWhere('solicitacao.prioridade = :prioridade', {
          prioridade: filtro.prioridade,
        });
      }
      if (filtro.search?.trim()) {
        const term = `%${filtro.search.toLowerCase().trim()}%`;
        qb.andWhere(
          '(LOWER(beneficiario.nome) LIKE :term OR beneficiario.cpf LIKE :cpfTerm OR solicitacao.protocolo ILIKE :termProto)',
          {
            term,
            cpfTerm: `%${filtro.search.replace(/\D/g, '')}%`,
            termProto: term,
          },
        );
      }

      // Obter contagem total antes de aplicar paginação
      const total = await qb.getCount();

      // Aplicar paginação e ordenação
      qb.limit(limit)
        .offset(offset)
        .orderBy('concessao.created_at', 'DESC')
        .addOrderBy('solicitacao.prioridade', 'ASC');

      // Buscar dados com objetos relacionados
      const concessoes = await qb.getMany();

      // Transformar dados para estrutura padronizada
      const data = concessoes.map((concessao) => ({
        id: concessao.id,
        data_inicio: concessao.dataInicio,
        status: concessao.status,
        prioridade: concessao.solicitacao.prioridade,
        protocolo: concessao.solicitacao?.protocolo,
        determinacao_judicial:
          concessao.solicitacao?.determinacao_judicial_flag || false,
        created_at: concessao.created_at,
        updated_at: concessao.updated_at,
        // Objetos relacionados estruturados
        beneficiario: concessao.solicitacao?.beneficiario
          ? {
              id: concessao.solicitacao.beneficiario.id,
              nome: concessao.solicitacao.beneficiario.nome,
              cpf: concessao.solicitacao.beneficiario.cpf,
            }
          : null,
        tipo_beneficio: concessao.solicitacao?.tipo_beneficio
          ? {
              id: concessao.solicitacao.tipo_beneficio.id,
              nome: concessao.solicitacao.tipo_beneficio.nome,
              codigo: concessao.solicitacao.tipo_beneficio.codigo,
            }
          : null,
        unidade: concessao.solicitacao?.unidade
          ? {
              id: concessao.solicitacao.unidade.id,
              nome: concessao.solicitacao.unidade.nome,
              codigo: concessao.solicitacao.unidade.codigo,
            }
          : null,
        tecnico: concessao.solicitacao?.tecnico
          ? {
              id: concessao.solicitacao.tecnico.id,
              nome: concessao.solicitacao.tecnico.nome,
            }
          : null,
      }));

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

    const quantidadeParcelasOriginal = pagamentosOriginais.meta.total;

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
        status: StatusConcessao.APTO,
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
          solicitacao.liberador_id,
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
   * Cancela uma concessão ativa e todos os pagamentos vinculados a ela
   *
   * @param concessaoId ID da concessão
   * @param usuarioId ID do usuário que está cancelando
   * @param motivo Motivo do cancelamento
   * @param observacoes Observações adicionais sobre o cancelamento
   * @returns Concessão cancelada
   */
  async cancelarConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
    observacoes?: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.beneficiario'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    if (concessao.status === StatusConcessao.CANCELADO) {
      throw new BadRequestException(
        `A concessão ${concessaoId} já está com status cancelado`,
      );
    }

    try {
      // Buscar todos os pagamentos vinculados à concessão
      const pagamentos = await this.pagamentoService.findByConcessao(concessaoId);
      
      // Cancelar todos os pagamentos que não estão cancelados ou confirmados
      const pagamentosCancelados = [];
      for (const pagamento of pagamentos) {
        try {
          // Só tenta cancelar se o pagamento não estiver cancelado ou confirmado
          if (pagamento.status !== StatusPagamentoEnum.CANCELADO && 
              pagamento.status !== StatusPagamentoEnum.CONFIRMADO) {
            const pagamentoCancelado = await this.pagamentoService.cancelar(
              pagamento.id,
              `Cancelamento automático - Concessão cancelada: ${motivo}`,
              usuarioId
            );
            pagamentosCancelados.push(pagamentoCancelado);
            
            this.logger.info(
              `Pagamento ${pagamento.id} cancelado automaticamente devido ao cancelamento da concessão ${concessaoId}`,
              ConcessaoService.name,
            );
          }
        } catch (pagamentoError) {
          // Log do erro mas não interrompe o processo de cancelamento da concessão
          this.logger.error(
            `Erro ao cancelar pagamento ${pagamento.id} da concessão ${concessaoId}: ${pagamentoError.message}`,
            pagamentoError.stack,
            ConcessaoService.name,
          );
        }
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
        observacoes: observacoes ? 
          `${observacoes}. Pagamentos cancelados: ${pagamentosCancelados.length}/${pagamentos.length}` :
          `Pagamentos cancelados: ${pagamentosCancelados.length}/${pagamentos.length}`,
        alteradoPor: usuarioId,
      });
      await this.historicoRepo.save(historico);

      this.logger.warn(
        `Concessão ${concessaoId} cancelada por usuário ${usuarioId}. ` +
        `${pagamentosCancelados.length} de ${pagamentos.length} pagamentos foram cancelados.`,
        ConcessaoService.name,
      );

      return concessaoSalva;
    } catch (error) {
      this.logger.error(
        `Erro ao cancelar concessão ${concessaoId}: ${error.message}`,
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
        `Erro interno ao cancelar concessão. Verifique os logs para mais detalhes.`,
      );
    }
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
