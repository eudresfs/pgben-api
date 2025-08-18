import {
  Injectable,
  forwardRef,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  throwSolicitacaoNotFound,
  throwInvalidStatusTransition,
  throwAccessDenied,
  throwSolicitacaoAlreadyExists,
  throwWorkflowStepRequired,
  throwApprovalRequired,
  throwSolicitacaoCannotDelete,
  throwProcessoJudicialNotFound,
  throwProcessoJudicialAlreadyLinked,
  throwProcessoJudicialNotLinked,
  throwDeterminacaoJudicialNotFound,
  throwDeterminacaoJudicialAlreadyLinked,
  throwDeterminacaoJudicialNotLinked,
  throwCidadaoNotInComposicaoFamiliar,
  throwInternalError,
} from '../../../shared/exceptions/error-catalog/domains/solicitacao.errors';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  ILike,
  Connection,
  In,
  DataSource,
  SelectQueryBuilder,
  Brackets,
} from 'typeorm';
import { SolicitacaoRepository } from '../repositories/solicitacao.repository';
import {
  Solicitacao,
  StatusSolicitacao,
  HistoricoSolicitacao,
  ProcessoJudicial,
  DeterminacaoJudicial,
  StatusPendencia,
  Pendencia,
  Contato,
  TipoBeneficio,
} from '../../../entities';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { VincularProcessoJudicialDto } from '../dto/vincular-processo-judicial.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { VincularDeterminacaoJudicialDto } from '../dto/vincular-determinacao-judicial.dto';

import { ProcessoJudicialRepository } from '../../judicial/repositories/processo-judicial.repository';
import { ROLES } from '../../../shared/constants/roles.constants';
import { ValidacaoExclusividadeService } from './validacao-exclusividade.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { Logger } from '@nestjs/common';

export interface FindAllOptions {
  search?: string;
  page?: number;
  limit?: number;
  status?: StatusSolicitacao;
  usuario_id?: string;
  unidade_id?: string;
  beneficio_id?: string;
  beneficiario_id?: string;
  protocolo?: string;
  data_inicio?: string;
  data_fim?: string;
  sortBy?: 'data_abertura' | 'data_aprovacao';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Serviço de Solicitações
 *
 * Responsável pela lógica de negócio relacionada às solicitações de benefícios
 */
@Injectable()
export class SolicitacaoService {
  private readonly logger: Logger;

  constructor(
    private solicitacaoRepository: SolicitacaoRepository,

    @InjectRepository(HistoricoSolicitacao)
    private historicoRepository: Repository<HistoricoSolicitacao>,

    @InjectRepository(Pendencia)
    private pendenciaRepository: Repository<Pendencia>,

    private processoJudicialRepository: ProcessoJudicialRepository,

    @InjectRepository(DeterminacaoJudicial)
    private determinacaoJudicialRepository: Repository<DeterminacaoJudicial>,

    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,

    private connection: Connection,
    private dataSource: DataSource,

    @Inject(forwardRef(() => ValidacaoExclusividadeService))
    private validacaoExclusividadeService: ValidacaoExclusividadeService,

    @Inject(forwardRef(() => CidadaoService))
    private cidadaoService: CidadaoService,
  ) {
    this.logger = new Logger('SolicitacaoService');
  }

  /**
   * Lista todas as solicitações com paginação e filtros
   * @param options Opções de filtro, paginação e ordenação
   * @returns Lista paginada de solicitações
   */
  async findAll(
    options: FindAllOptions,
  ): Promise<PaginatedResponse<Solicitacao>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const sortBy = options.sortBy || 'data_abertura';
    const sortOrder = options.sortOrder || 'DESC';

    const allowedSortFields = ['data_abertura', 'data_aprovacao'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Campo de ordenação '${sortBy}' não permitido`,
      );
    }

    let dataInicio: Date | undefined;
    let dataFim: Date | undefined;

    if (options.data_inicio) {
      dataInicio = new Date(options.data_inicio);
      if (isNaN(dataInicio.getTime())) {
        throw new BadRequestException('Data de início inválida');
      }
    }

    if (options.data_fim) {
      dataFim = new Date(options.data_fim);
      if (isNaN(dataFim.getTime())) {
        throw new BadRequestException('Data de fim inválida');
      }
      dataFim.setHours(23, 59, 59, 999);
    }

    const queryBuilder = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .select([
        // Dados básicos da solicitação
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.valor',
        'solicitacao.data_abertura',
        'solicitacao.data_aprovacao',
        'solicitacao.observacoes',
        'solicitacao.determinacao_judicial_flag',
        'solicitacao.prioridade',
        // Dados básicos do beneficiário
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
        // Dados básicos do benefício
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.codigo',
        // Dados básicos do técnico
        'tecnico.id',
        'tecnico.nome',
        // Dados básicos da unidade
        'unidade.id',
        'unidade.nome',
      ]);

    // Aplicar filtro de busca se fornecido
    if (options.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(beneficiario.nome) LIKE LOWER(:search)', {
            search: `%${options.search}%`,
          })
            .orWhere('beneficiario.cpf LIKE :searchExact', {
              searchExact: `%${options.search}%`,
            })
            .orWhere('LOWER(solicitacao.protocolo) LIKE LOWER(:search)', {
              search: `%${options.search}%`,
            })
            .orWhere('LOWER(tipo_beneficio.nome) LIKE LOWER(:search)', {
              search: `%${options.search}%`,
            })
            .orWhere('LOWER(tipo_beneficio.codigo) LIKE LOWER(:search)', {
              search: `%${options.search}%`,
            });
        }),
      );
    }

    this.applyFilters(queryBuilder, {
      status: options.status,
      tecnico_id: options.usuario_id,
      unidade_id: options.unidade_id,
      beneficio_id: options.beneficio_id,
      beneficiario_id: options.beneficiario_id,
      protocolo: options.protocolo,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });

    const skip = (page - 1) * limit;
    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`solicitacao.${sortBy}`, sortOrder);

    const startTime = Date.now();
    const [items, total] = await queryBuilder.getManyAndCount();
    const executionTime = Date.now() - startTime;

    if (executionTime > 1000) {
      this.logger.warn(`Query lenta detectada: ${executionTime}ms`, {
        filters: options,
        resultCount: items.length,
        totalCount: total,
      });
    }

    const pages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Aplica filtros condicionais ao query builder
   * @param queryBuilder Instance do query builder
   * @param filters Objeto com os filtros a serem aplicados
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Solicitacao>,
    filters: any,
  ) {
    if (filters.status) {
      queryBuilder.andWhere('solicitacao.status = :status', {
        status: filters.status,
      });
    }

    if (filters.unidade_id) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id: filters.unidade_id,
      });
    }

    if (filters.beneficio_id) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :beneficio_id', {
        beneficio_id: filters.beneficio_id,
      });
    }

    if (filters.tecnico_id) {
      queryBuilder.andWhere('solicitacao.tecnico_id = :tecnico_id', {
        tecnico_id: filters.tecnico_id,
      });
    }

    if (filters.beneficiario_id) {
      queryBuilder.andWhere('solicitacao.beneficiario_id = :beneficiario_id', {
        beneficiario_id: filters.beneficiario_id,
      });
    }

    if (filters.protocolo) {
      queryBuilder.andWhere('solicitacao.protocolo ILIKE :protocolo', {
        protocolo: `%${filters.protocolo}%`,
      });
    }

    if (filters.data_inicio && filters.data_fim) {
      queryBuilder.andWhere(
        'solicitacao.data_abertura BETWEEN :inicio AND :fim',
        { inicio: filters.data_inicio, fim: filters.data_fim },
      );
    } else if (filters.data_inicio) {
      queryBuilder.andWhere('solicitacao.data_abertura >= :inicio', {
        inicio: filters.data_inicio,
      });
    } else if (filters.data_fim) {
      queryBuilder.andWhere('solicitacao.data_abertura <= :fim', {
        fim: filters.data_fim,
      });
    }
  }

  /**
   * Busca uma solicitação pelo ID
   */
  async findById(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.solicitante', 'solicitante')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .leftJoinAndSelect('solicitacao.documentos', 'documentos')
      .leftJoinAndSelect('solicitacao.concessao', 'concessao')
      .select([
        // Dados Solicitação
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.valor',
        'solicitacao.parecer_semtas',
        'solicitacao.dados_complementares',
        'solicitacao.data_abertura',
        'solicitacao.observacoes',
        // Dados Benefíciário
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
        'beneficiario.rg',
        'beneficiario.nis',
        'beneficiario.data_nascimento',
        'beneficiario.nome_mae',
        'beneficiario.naturalidade',
        'beneficiario.sexo',
        'beneficiario.estado_civil',
        // Dados Solicitante
        'solicitante.id',
        'solicitante.nome',
        'solicitante.cpf',
        'solicitante.nis',
        'solicitante.data_nascimento',
        // Dados Benefício
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.descricao',
        'tipo_beneficio.codigo',
        // Dados Técnico
        'tecnico.id',
        'tecnico.nome',
        // Dados Unidade
        'unidade.id',
        'unidade.nome',
        'unidade.sigla',
        // Dados Concessão
        'concessao.id',
      ])
      .where('solicitacao.id = :id', { id })
      .getOne();

    if (!solicitacao) {
      throwSolicitacaoNotFound(id);
    }

    // Busca contatos em paralelo
    const [contatoBeneficiario, contatoSolicitante] = await Promise.all([
      solicitacao.beneficiario
        ? this.buscarContatoMaisRecente(solicitacao.beneficiario.id)
        : null,
      solicitacao.solicitante
        ? this.buscarContatoMaisRecente(solicitacao.solicitante.id)
        : null,
    ]);

    // Adiciona os contatos encontrados
    if (contatoBeneficiario && solicitacao.beneficiario) {
      solicitacao.beneficiario.contatos = [contatoBeneficiario];
    }
    if (contatoSolicitante && solicitacao.solicitante) {
      solicitacao.solicitante.contatos = [contatoSolicitante];
    }

    return solicitacao;
  }

  /**
   * Busca o contato mais recente de um cidadão
   * Prioriza contatos com proprietario = true, depois proprietario = false
   */
  private async buscarContatoMaisRecente(
    cidadaoId: string,
  ): Promise<Contato | null> {
    // Tenta buscar contato com proprietario = true primeiro
    let contato = await this.dataSource.getRepository(Contato).findOne({
      where: { cidadao_id: cidadaoId, proprietario: true },
      order: { created_at: 'DESC' },
    });

    // Se não encontrou, busca com proprietario = false
    if (!contato) {
      contato = await this.dataSource.getRepository(Contato).findOne({
        where: { cidadao_id: cidadaoId, proprietario: false },
        order: { created_at: 'DESC' },
      });
    }

    return contato;
  }

  /**
   * Cria uma nova solicitação
   */
  async create(
    createSolicitacaoDto: CreateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    this.logger.log(
      `Iniciando criação de solicitação para beneficiário: ${createSolicitacaoDto.beneficiario_id}`,
    );

    try {
      // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====

      // Validar se o beneficiário existe e obter seus dados
      let beneficiario;
      try {
        beneficiario = await this.cidadaoService.findById(
          createSolicitacaoDto.beneficiario_id,
          true, // incluir relações para obter a unidade
        );
      } catch (error) {
        if (error.status === 404) {
          throw new BadRequestException('Beneficiário não encontrado');
        }
        throw error;
      }

      // Validar se o solicitante existe (quando informado)
      if (createSolicitacaoDto.solicitante_id) {
        try {
          await this.cidadaoService.findById(
            createSolicitacaoDto.solicitante_id,
            false,
          );
        } catch (error) {
          if (error.status === 404) {
            throw new BadRequestException('Solicitante não encontrado');
          }
          throw error;
        }
      }

      // Validar que solicitante não pode ser o mesmo que beneficiário
      if (
        createSolicitacaoDto.solicitante_id &&
        createSolicitacaoDto.solicitante_id ===
          createSolicitacaoDto.beneficiario_id
      ) {
        throw new BadRequestException(
          'Solicitante não pode ser o mesmo que o beneficiário',
        );
      }

      // Validar se o tipo de benefício existe e está ativo
      const tipoBeneficio = await this.dataSource
        .getRepository(TipoBeneficio)
        .findOne({
          where: { id: createSolicitacaoDto.tipo_beneficio_id },
          select: ['id', 'status', 'nome'],
        });

      if (!tipoBeneficio) {
        throw new BadRequestException('Tipo de benefício não encontrado');
      }

      // REGRA DE NEGÓCIO 2: Validar se o benefício está ativo
      if (tipoBeneficio.status !== 'ativo') {
        throw new BadRequestException(
          `Uma solicitação só pode ser criada para benefícios ativos. O benefício "${tipoBeneficio.nome}" está inativo.`,
        );
      }

      // REGRA DE NEGÓCIO 1: Validar se a unidade do beneficiário é igual à unidade do técnico
      // Determinar a unidade do técnico
      let unidadeTecnico: string;
      if (!user.unidade_id) {
        if (!createSolicitacaoDto.unidade_id) {
          throwWorkflowStepRequired('unidade_id', {
            data: { context: 'unidade_validation' },
          });
        }
        unidadeTecnico = createSolicitacaoDto.unidade_id;
      } else {
        unidadeTecnico = user.unidade_id;
      }

      // Validar se a unidade do beneficiário é igual à unidade do técnico
      if (beneficiario.unidade_id !== unidadeTecnico) {
        throw new BadRequestException(
          'Solicitações só podem ser feitas pela unidade atual do beneficiário. ' +
            'Em caso de mudança de endereço, transfira o beneficiário de unidade antes.',
        );
      }

      // Validar exclusividade para o beneficiário
      await this.validacaoExclusividadeService.validarExclusividade(
        createSolicitacaoDto.beneficiario_id,
        createSolicitacaoDto.tipo_beneficio_id,
      );

      // Verificar se já existe uma solicitação em andamento para o mesmo cidadão e tipo de benefício
      const statusEmAndamento = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.PENDENTE,
        StatusSolicitacao.EM_ANALISE,
        StatusSolicitacao.APROVADA,
      ];

      // Verifica se existe uma solicitação em andamento para o mesmo beneficiário e benefício
      const solicitacaoExistente = await this.solicitacaoRepository.findOne({
        where: {
          beneficiario_id: createSolicitacaoDto.beneficiario_id,
          tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
          status: In(statusEmAndamento),
        },
      });

      // Se existir, retorna os dados da solicitação existente
      if (solicitacaoExistente) {
        this.logger.log(
          `Solicitação já existe para este beneficiário e tipo de benefício: ${solicitacaoExistente.id}`,
        );
        return solicitacaoExistente;
      }

      // Usar a unidade já validada nas regras de negócio
      const unidadeId = unidadeTecnico;

      // Normalizar enums nos dados complementares antes de salvar
      const dadosComplementares =
        createSolicitacaoDto.dados_complementares || {};
      const normalizedDadosComplementares =
        normalizeEnumFields(dadosComplementares);

      // Buscar valor de referência do benefício se não foi fornecido
      let valorSolicitacao = createSolicitacaoDto.valor;
      if (!valorSolicitacao) {
        const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
          where: { id: createSolicitacaoDto.tipo_beneficio_id },
          select: ['valor'],
        });
        
        if (tipoBeneficio && tipoBeneficio.valor) {
          valorSolicitacao = tipoBeneficio.valor;
          this.logger.log(
            `Valor de referência do benefício aplicado: ${valorSolicitacao} para tipo de benefício ${createSolicitacaoDto.tipo_beneficio_id}`,
          );
        }
      }

      // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
      const solicitacaoSalva = await this.dataSource.transaction(
        async (manager) => {
          // Criar uma nova instância de Solicitacao com repositório tipado
          const repo = manager.getRepository(Solicitacao);

          // Criar objeto de solicitação
          const solicitacao = repo.create({
            beneficiario_id: createSolicitacaoDto.beneficiario_id,
            solicitante_id: createSolicitacaoDto.solicitante_id,
            tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
            unidade_id: unidadeId,
            tecnico_id: user.id,
            status: StatusSolicitacao.RASCUNHO,
            data_abertura: new Date(),
            dados_complementares: normalizedDadosComplementares,
            valor: valorSolicitacao,
          });

          // Salvar a solicitação
          const savedSolicitacao = await repo.save(solicitacao);

          // Registrar no histórico
          const historicoRepo = manager.getRepository(HistoricoSolicitacao);
          const historico = historicoRepo.create({
            solicitacao_id: savedSolicitacao.id,
            usuario_id: user.id,
            status_atual: StatusSolicitacao.RASCUNHO,
            observacao: createSolicitacaoDto.determinacao_judicial_flag
              ? 'Solicitação criada por determinação judicial'
              : 'Solicitação criada',
            dados_alterados: createSolicitacaoDto.determinacao_judicial_flag
              ? {
                  acao: 'criacao',
                  determinacao_judicial: true,
                  determinacao_judicial_id:
                    createSolicitacaoDto.determinacao_judicial_id,
                }
              : { acao: 'criacao' },
            ip_usuario: user.ip || '0.0.0.0',
          });

          await historicoRepo.save(historico);

          return savedSolicitacao.id;
        },
      );

      // ===== CONSULTA PÓS-TRANSAÇÃO =====
      // Buscar a solicitação completa após a transação
      const solicitacaoCompleta = await this.solicitacaoRepository
        .createScopedQueryBuilder('solicitacao')
        .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
        .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
        .leftJoinAndSelect('tecnico.unidade', 'tecnico_unidade')
        .leftJoinAndSelect('solicitacao.documentos', 'documentos')
        .select([
          // Dados básicos da solicitação
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.status',
          'solicitacao.data_abertura',
          'solicitacao.observacoes',
          // Dados básicos do beneficiário
          'beneficiario.id',
          'beneficiario.nome',
          // Dados básicos do benefício
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.codigo',
          // Dados básicos do técnico
          'tecnico.id',
          'tecnico.nome',
          // Dados básicos da unidade do técnico
          'tecnico_unidade.id',
          'tecnico_unidade.nome',
          // Dados dos documentos
          'documentos.id',
          'documentos.tipo',
          'documentos.nome_original',
          'documentos.verificado',
          'documentos.data_upload',
        ])
        .where('solicitacao.id = :id', { id: solicitacaoSalva })
        .getOne();

      if (!solicitacaoCompleta) {
        throwSolicitacaoNotFound(solicitacaoSalva);
      }

      // Solicitação criada com sucesso
      return solicitacaoCompleta;
    } catch (error) {
      this.logger.error(
        `Erro ao criar solicitação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza uma solicitação existente
   */
  async update(
    id: string,
    updateSolicitacaoDto: UpdateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    // Iniciando atualização da solicitação

    try {
      // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====

      // Buscar a solicitação fora da transação
      const solicitacao = await this.findById(id);

      // Check if request status allows editing based on business rules
      const EDITABLE_STATUSES = [
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.PENDENTE,
      ];

      if (!EDITABLE_STATUSES.includes(solicitacao.status)) {
        throwInvalidStatusTransition(solicitacao.status, 'EDITABLE', {
          data: {
            solicitacaoId: id,
            statusAtual: solicitacao.status,
            statusPossiveis: EDITABLE_STATUSES,
          },
        });
      }

      // Preparar dados para atualização
      const dadosAtualizacao: any = {};
      const camposAlterados: string[] = [];

      // Nota: beneficiario_id não pode ser atualizado conforme definido no DTO
      if (updateSolicitacaoDto.tipo_beneficio_id) {
        dadosAtualizacao.tipo_beneficio_id =
          updateSolicitacaoDto.tipo_beneficio_id;
        camposAlterados.push('tipo_beneficio_id');
      }

      if (updateSolicitacaoDto.dados_complementares) {
        // Normalizar enums nos dados complementares antes de salvar
        dadosAtualizacao.dados_complementares = normalizeEnumFields(
          updateSolicitacaoDto.dados_complementares,
        );
        camposAlterados.push('dados_complementares');
      }

      // Se não há dados para atualizar, retornar a solicitação sem modificações
      if (camposAlterados.length === 0) {
        this.logger.log(`Nenhum dado para atualizar na solicitação: ${id}`);
        return solicitacao;
      }

      // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
      await this.connection.transaction(async (manager) => {
        // Usar repositórios tipados
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitação
        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no histórico
        const historico = historicoRepo.create({
          solicitacao_id: id,
          usuario_id: user.id,
          status_anterior: solicitacao.status,
          status_atual: solicitacao.status,
          observacao: 'Solicitação atualizada',
          dados_alterados: {
            campos_alterados: camposAlterados,
          },
          ip_usuario: user.ip || '0.0.0.0',
        });

        await historicoRepo.save(historico);
      });

      // ===== CONSULTA PÓS-TRANSAÇÃO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Solicitação atualizada com sucesso
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar solicitação ${id}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Submete uma solicitação para análise
   */
  async submeterSolicitacao(id: string, user: any): Promise<Solicitacao> {
    // Iniciando submissão da solicitação

    try {
      // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====

      // Buscar a solicitação fora da transação
      const solicitacao = await this.findById(id);

      // Verificar se a solicitação está em estado que permite submissão
      if (
        ![StatusSolicitacao.ABERTA, StatusSolicitacao.PENDENTE].includes(
          solicitacao.status,
        )
      ) {
        throwInvalidStatusTransition(
          solicitacao.status,
          StatusSolicitacao.EM_ANALISE,
          {
            data: {
              solicitacaoId: id,
            },
          },
        );
      }

      // Preparar dados para atualização
      const dadosAtualizacao = {
        status: StatusSolicitacao.EM_ANALISE,
        updated_at: new Date(),
      };

      // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
      await this.connection.transaction(async (manager) => {
        // Usar repositórios tipados
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitação
        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no histórico
        const historico = historicoRepo.create({
          solicitacao_id: id,
          usuario_id: user.id,
          status_anterior: StatusSolicitacao.ABERTA,
          status_atual: StatusSolicitacao.EM_ANALISE,
          observacao: 'Solicitação submetida para análise',
          dados_alterados: {
            status: StatusSolicitacao.EM_ANALISE,
          },
          ip_usuario: user.ip || '0.0.0.0',
        });

        await historicoRepo.save(historico);
      });

      // ===== CONSULTA PÓS-TRANSAÇÃO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Solicitação submetida para análise com sucesso
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao submeter solicitação ${id}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Avalia uma solicitação (aprovar/pendenciar)
   */
  async avaliarSolicitacao(
    id: string,
    avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    // Iniciando avaliação da solicitação

    try {
      // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====

      // Buscar a solicitação fora da transação
      const solicitacao = await this.findById(id);

      // Verificar se a solicitação está em estado que permite avaliação
      if (
        solicitacao.status !== StatusSolicitacao.PENDENTE &&
        solicitacao.status !== StatusSolicitacao.EM_ANALISE
      ) {
        throwInvalidStatusTransition(solicitacao.status, 'AVALIACAO', {
          data: {
            solicitacaoId: id,
            statusesPermitidos: [
              StatusSolicitacao.PENDENTE,
              StatusSolicitacao.EM_ANALISE,
            ],
          },
        });
      }

      // Determinar o novo status
      const novoStatus = avaliarSolicitacaoDto.aprovado
        ? StatusSolicitacao.APROVADA
        : StatusSolicitacao.PENDENTE;

      // Preparar dados para atualização
      const dadosAtualizacao: any = {
        status: novoStatus,
        updated_at: new Date(),
      };

      // Adicionar dados específicos para solicitações aprovadas
      if (avaliarSolicitacaoDto.aprovado) {
        dadosAtualizacao.aprovador_id = user.id;
        dadosAtualizacao.data_aprovacao = new Date();
        dadosAtualizacao.parecer_semtas = avaliarSolicitacaoDto.parecer;
      }

      // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
      await this.connection.transaction(async (manager) => {
        // Usar repositórios tipados
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);
        const pendenciaRepo = manager.getRepository(Pendencia);

        // Atualizar a solicitação
        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no histórico
        const historico = historicoRepo.create({
          solicitacao_id: id,
          usuario_id: user.id,
          status_anterior: solicitacao.status,
          status_atual: novoStatus,
          observacao:
            avaliarSolicitacaoDto.parecer ||
            (avaliarSolicitacaoDto.aprovado
              ? 'Solicitação aprovada'
              : 'Solicitação com pendências'),
          dados_alterados: {
            status: novoStatus,
            aprovado: avaliarSolicitacaoDto.aprovado,
          },
          ip_usuario: user.ip || '0.0.0.0',
        });

        await historicoRepo.save(historico);

        // Registrar pendências quando não aprovado
        if (
          !avaliarSolicitacaoDto.aprovado &&
          avaliarSolicitacaoDto.pendencias &&
          avaliarSolicitacaoDto.pendencias.length > 0
        ) {
          // Criar array de pendências para inserção em lote
          const pendencias = avaliarSolicitacaoDto.pendencias.map(
            (descricaoTexto) => {
              return pendenciaRepo.create({
                solicitacao_id: id,
                descricao: descricaoTexto,
                status: StatusPendencia.ABERTA,
                registrado_por_id: user.id,
              });
            },
          );

          // Salvar todas as pendências de uma vez
          await pendenciaRepo.save(pendencias);
        }
      });

      // ===== CONSULTA PÓS-TRANSAÇÃO =====
      const solicitacaoAtualizada = await this.findById(id);

      this.logger.log(
        `Solicitação ${id} avaliada com sucesso. Status: ${novoStatus}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao avaliar solicitação ${id}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  // Método liberarBeneficio removido - no novo ciclo de vida simplificado,
  // APROVADA é um status final que indica que o benefício foi deferido

  /**
   * Cancela uma solicitação
   */
  async cancelarSolicitacao(id: string, user: any): Promise<Solicitacao> {
    // Iniciando cancelamento da solicitação

    try {
      // ===== VALIDAÇÕES E LEITURAS FORA DA TRANSAÇÃO =====

      // Buscar a solicitação fora da transação
      const solicitacao = await this.findById(id);

      // No novo ciclo de vida simplificado, solicitações aprovadas não podem ser canceladas
      if (solicitacao.status === StatusSolicitacao.APROVADA) {
        throwSolicitacaoCannotDelete(id, solicitacao.status, {
          data: {
            motivo: 'Solicitação aprovada não pode ser cancelada',
          },
        });
      }

      // Preparar dados para atualização
      const dadosAtualizacao = {
        status: StatusSolicitacao.CANCELADA,
        updated_at: new Date(),
      };

      // ===== TRANSAÇÃO MÍNIMA APENAS PARA OPERAÇÕES DE ESCRITA =====
      await this.connection.transaction(async (manager) => {
        // Usar repositórios tipados
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitação
        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no histórico
        const historico = historicoRepo.create({
          solicitacao_id: id,
          usuario_id: user.id,
          status_anterior: solicitacao.status,
          status_atual: StatusSolicitacao.CANCELADA,
          observacao: 'Solicitação cancelada pelo usuário',
          dados_alterados: {
            status: StatusSolicitacao.CANCELADA,
          },
          ip_usuario: user.ip || '0.0.0.0',
        });

        await historicoRepo.save(historico);
      });

      // ===== CONSULTA PÓS-TRANSAÇÃO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Solicitação cancelada com sucesso
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao cancelar solicitação ${id}: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lista o histórico de uma solicitação
   */
  async getHistorico(solicitacaoId: string) {
    // Verificar se a solicitação existe
    await this.findById(solicitacaoId);

    // Buscar o histórico
    return this.historicoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      order: { created_at: 'DESC' },
      relations: ['usuario'],
    });
  }

  /**
   * Lista as pendências de uma solicitação
   */
  async getPendencias(solicitacaoId: string) {
    // Verificar se a solicitação existe
    await this.findById(solicitacaoId);

    // Buscar as pendências
    return this.pendenciaRepository.find({
      where: { solicitacao_id: solicitacaoId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Vincula um processo judicial a uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param vincularDto Dados do vínculo
   * @param user Usuário que está realizando a operação
   * @returns Solicitação atualizada
   */
  async vincularProcessoJudicial(
    solicitacaoId: string,
    vincularDto: VincularProcessoJudicialDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      try {
        // Verificar se a solicitação existe
        const solicitacao = await this.findById(solicitacaoId);

        // Verificar se o processo judicial existe
        const processoJudicial = await this.processoJudicialRepository.findOne({
          where: { id: vincularDto.processo_judicial_id },
        });

        if (!processoJudicial) {
          throwProcessoJudicialNotFound(vincularDto.processo_judicial_id, {
            data: {
              solicitacaoId,
            },
          });
        }

        // Verificar se a solicitação já tem este processo vinculado
        if (
          solicitacao.processo_judicial_id === vincularDto.processo_judicial_id
        ) {
          throwProcessoJudicialAlreadyLinked(
            vincularDto.processo_judicial_id,
            solicitacaoId,
            {
              data: {
                numeroProcesso: processoJudicial.numero_processo,
              },
            },
          );
        }

        // Atualizar a solicitação
        solicitacao.processo_judicial_id = vincularDto.processo_judicial_id;

        // Registrar no histórico
        const historicoEntry = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: solicitacaoId,
            status_anterior: solicitacao.status,
            status_atual: solicitacao.status,
            usuario_id: user.id,
            observacao: vincularDto.observacao || 'Processo judicial vinculado',
            dados_alterados: {
              processo_judicial: {
                id: vincularDto.processo_judicial_id,
                numero: processoJudicial.numero_processo,
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        // Salvar as alterações
        await manager.save(solicitacao);
        await manager.save(historicoEntry);

        return this.findById(solicitacaoId);
      } catch (error) {
        // Se for um erro do catálogo, relançar
        if (error.name === 'AppError') {
          throw error;
        }

        this.logger.error(
          `Erro ao vincular processo judicial: ${error.message}`,
          error.stack,
        );
        throwInternalError('Erro ao vincular processo judicial à solicitação', {
          data: {
            solicitacaoId,
            processoJudicialId: vincularDto.processo_judicial_id,
            errorMessage: error.message,
          },
        });
      }
    });
  }

  /**
   * Desvincula um processo judicial de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param user Usuário que está realizando a operação
   * @returns Solicitação atualizada
   */
  async desvincularProcessoJudicial(
    solicitacaoId: string,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      try {
        // Verificar se a solicitação existe
        const solicitacao = await this.findById(solicitacaoId);

        // Verificar se o usuário tem permissão
        if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
          throwAccessDenied(solicitacaoId, user.id, {
            data: {
              acao: 'desvincular_processo_judicial',
              roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR],
              roleAtual: user.role,
            },
          });
        }

        // Verificar se a solicitação tem processo vinculado
        if (!solicitacao.processo_judicial_id) {
          throwProcessoJudicialNotLinked(solicitacaoId, {
            data: {
              motivo: 'Solicitação não possui processo judicial vinculado',
            },
          });
        }

        // Guardar informação do processo para o histórico
        const processoJudicialId = solicitacao.processo_judicial_id;
        const processoJudicial = await this.processoJudicialRepository.findOne({
          where: { id: processoJudicialId },
        });

        // Atualizar a solicitação
        solicitacao.processo_judicial_id = null as unknown as string;

        // Registrar no histórico
        const historicoEntry = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: solicitacaoId,
            status_anterior: solicitacao.status,
            status_atual: solicitacao.status,
            usuario_id: user.id,
            observacao: 'Processo judicial desvinculado',
            dados_alterados: {
              processo_judicial: {
                id: processoJudicialId,
                numero: processoJudicial
                  ? processoJudicial.numero_processo
                  : 'Desconhecido',
                acao: 'removido',
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        // Salvar as alterações
        await manager.save(solicitacao);
        await manager.save(historicoEntry);

        return this.findById(solicitacaoId);
      } catch (error) {
        // Se for um erro do catálogo, relançar
        if (error.name === 'AppError') {
          throw error;
        }

        this.logger.error(
          `Erro ao desvincular processo judicial: ${error.message}`,
          error.stack,
        );
        throwInternalError(
          'Erro ao desvincular processo judicial da solicitação',
          {
            data: {
              solicitacaoId,
              errorMessage: error.message,
            },
          },
        );
      }
    });
  }

  /**
   * Vincula uma determinação judicial a uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param vincularDto Dados do vínculo
   * @param user Usuário que está realizando a operação
   * @returns Solicitação atualizada
   */
  async vincularDeterminacaoJudicial(
    solicitacaoId: string,
    vincularDto: VincularDeterminacaoJudicialDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      try {
        // Verificar se a solicitação existe
        const solicitacao = await this.findById(solicitacaoId);

        // Verificar se o usuário tem permissão
        if (![ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO].includes(user.role)) {
          throwAccessDenied(solicitacaoId, user.id, {
            data: {
              acao: 'vincular_determinacao_judicial',
              roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO],
              roleAtual: user.role,
            },
          });
        }

        // Verificar se a determinação judicial existe
        const determinacaoJudicial =
          await this.determinacaoJudicialRepository.findOne({
            where: { id: vincularDto.determinacao_judicial_id },
          });

        if (!determinacaoJudicial) {
          throwDeterminacaoJudicialNotFound(
            vincularDto.determinacao_judicial_id,
            {
              data: {
                solicitacaoId,
              },
            },
          );
        }

        // Verificar se a solicitação já tem esta determinação vinculada
        if (
          solicitacao.determinacao_judicial_id ===
          vincularDto.determinacao_judicial_id
        ) {
          throwDeterminacaoJudicialAlreadyLinked(
            vincularDto.determinacao_judicial_id,
            solicitacaoId,
            {
              data: {
                numeroDeterminacao: determinacaoJudicial.numero_determinacao,
              },
            },
          );
        }

        // Atualizar a solicitação
        solicitacao.determinacao_judicial_id =
          vincularDto.determinacao_judicial_id;

        // Registrar no histórico
        const historicoEntry = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: solicitacaoId,
            status_anterior: solicitacao.status,
            status_atual: solicitacao.status,
            usuario_id: user.id,
            observacao:
              vincularDto.observacao || 'Determinação judicial vinculada',
            dados_alterados: {
              determinacao_judicial: {
                id: vincularDto.determinacao_judicial_id,
                numero: determinacaoJudicial.numero_determinacao,
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        // Salvar as alterações
        await manager.save(solicitacao);
        await manager.save(historicoEntry);

        return this.findById(solicitacaoId);
      } catch (error) {
        // Se for um erro do catálogo, relançar
        if (error.name === 'AppError') {
          throw error;
        }

        this.logger.error(
          `Erro ao vincular determinação judicial: ${error.message}`,
          error.stack,
        );
        throwInternalError(
          'Erro ao vincular determinação judicial à solicitação',
          {
            data: {
              solicitacaoId,
              determinacaoJudicialId: vincularDto.determinacao_judicial_id,
              errorMessage: error.message,
            },
          },
        );
      }
    });
  }

  async desvincularDeterminacaoJudicial(
    solicitacaoId: string,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      try {
        // Verificar se a solicitação existe
        const solicitacao = await this.findById(solicitacaoId);

        // Verificar se o usuário tem permissão
        if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
          throwAccessDenied(solicitacaoId, user.id, {
            data: {
              acao: 'desvincular_determinacao_judicial',
              roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR],
              roleAtual: user.role,
            },
          });
        }

        // Verificar se a solicitação tem determinação vinculada
        if (!solicitacao.determinacao_judicial_id) {
          throwDeterminacaoJudicialNotLinked(solicitacaoId, {
            data: {
              motivo: 'Solicitação não possui determinação judicial vinculada',
            },
          });
        }

        // Guardar informação da determinação para o histórico
        const determinacaoJudicialId = solicitacao.determinacao_judicial_id;
        const determinacaoJudicial =
          await this.determinacaoJudicialRepository.findOne({
            where: { id: determinacaoJudicialId },
          });

        // Atualizar a solicitação
        solicitacao.determinacao_judicial_id = null as unknown as string;

        // Registrar no histórico
        const historicoEntry = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: solicitacaoId,
            status_anterior: solicitacao.status,
            status_atual: solicitacao.status,
            usuario_id: user.id,
            observacao: 'Determinação judicial desvinculada',
            dados_alterados: {
              determinacao_judicial: {
                id: determinacaoJudicialId,
                numero: determinacaoJudicial
                  ? determinacaoJudicial.numero_determinacao
                  : 'Desconhecida',
                acao: 'removida',
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        // Salvar as alterações
        await manager.save(solicitacao);
        await manager.save(historicoEntry);

        return this.findById(solicitacaoId);
      } catch (error) {
        // Se for um erro do catálogo, relançar
        if (error.name === 'AppError') {
          throw error;
        }

        this.logger.error(
          `Erro ao desvincular determinação judicial: ${error.message}`,
          error.stack,
        );
        throwInternalError(
          'Erro ao desvincular determinação judicial da solicitação',
          {
            data: {
              solicitacaoId,
              errorMessage: error.message,
            },
          },
        );
      }
    });
  }

  /**
   * Realiza o soft delete de uma solicitação
   * @param solicitacaoId ID da solicitação a ser removida
   * @param user Usuário que está realizando a exclusão
   * @returns void
   * @throws NotFoundException se a solicitação não for encontrada
   * @throws BadRequestException se o status não permitir exclusão
   */
  async removerSolicitacao(
    solicitacaoId: string,
    user: any,
  ): Promise<void> {
    this.logger.log(`Iniciando remoção da solicitação: ${solicitacaoId}`);

    try {
      // Buscar a solicitação para validar
      const solicitacao = await this.findById(solicitacaoId);

      // Validar se o status permite exclusão (apenas RASCUNHO ou ABERTA)
      const statusPermitidos = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
      ];

      if (!statusPermitidos.includes(solicitacao.status)) {
        throwSolicitacaoCannotDelete(solicitacaoId, solicitacao.status, {
          data: {
            motivo: `Apenas solicitações com status 'RASCUNHO' ou 'ABERTA' podem ser excluídas. Status atual: '${solicitacao.status}'`,
            statusPermitidos,
          },
        });
      }

      // Realizar o soft delete utilizando o método do repositório
      await this.solicitacaoRepository.remover(solicitacaoId);

      // Registrar a exclusão no histórico
      await this.historicoRepository.save({
        solicitacao_id: solicitacaoId,
        status_anterior: solicitacao.status,
        status_atual: solicitacao.status,
        usuario_id: user.id,
        observacao: `Solicitação removida (soft delete) pelo usuário`,
        dados_alterados: {
          acao: 'soft_delete',
          status_anterior: solicitacao.status,
          motivo: 'Exclusão lógica da solicitação',
        },
        ip_usuario: user.ip || '0.0.0.0',
      });

      this.logger.log(`Solicitação ${solicitacaoId} removida com sucesso`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
