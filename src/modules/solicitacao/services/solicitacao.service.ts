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
import { SolicitacaoFiltrosAvancadosDto } from '../dto/solicitacao-filtros-avancados.dto';
import { FiltrosAvancadosService } from '../../../common/services';
import { IResultadoFiltros } from '../../../common/interfaces';
import { PeriodoPredefinido, Prioridade } from '../../../enums';

import { ProcessoJudicialRepository } from '../../judicial/repositories/processo-judicial.repository';
import { ROLES } from '../../../shared/constants/roles.constants';
import { ValidacaoExclusividadeService } from './validacao-exclusividade.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { Logger } from '@nestjs/common';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { EventosService } from './eventos.service';
import { v4 as uuidv4 } from 'uuid';
import { processAdvancedSearchParam } from '../../../shared/utils/cpf-search.util';

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
 * Servico de Solicitacoes
 *
 * Responsavel pela logica de negocio relacionada as solicitacoes de beneficios
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

    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly filtrosAvancadosService: FiltrosAvancadosService,
    private readonly eventosService: EventosService,
  ) {
    this.logger = new Logger('SolicitacaoService');
  }

  /**
   * Lista todas as solicitacoes com paginacao e filtros
   * @param options Opcoes de filtro, paginacao e ordenacao
   * @returns Lista paginada de solicitacoes
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
        `Campo de ordenacao '${sortBy}' nao permitido`,
      );
    }

    let dataInicio: Date | undefined;
    let dataFim: Date | undefined;

    if (options.data_inicio) {
      dataInicio = new Date(options.data_inicio);
      if (isNaN(dataInicio.getTime())) {
        throw new BadRequestException('Data de inicio invalida');
      }
    }

    if (options.data_fim) {
      dataFim = new Date(options.data_fim);
      if (isNaN(dataFim.getTime())) {
        throw new BadRequestException('Data de fim invalida');
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
        // Dados basicos da solicitacao
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.valor',
        'solicitacao.data_abertura',
        'solicitacao.data_aprovacao',
        'solicitacao.observacoes',
        'solicitacao.determinacao_judicial_flag',
        'solicitacao.prioridade',
        // Dados basicos do beneficiario
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
        // Dados basicos do beneficio
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.codigo',
        // Dados basicos do tecnico
        'tecnico.id',
        'tecnico.nome',
        // Dados basicos da unidade
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
   * Busca solicitações com filtros avançados
   * 
   * Implementa o novo padrão de filtros avançados do sistema,
   * permitindo filtros por múltiplos valores, períodos predefinidos
   * e funcionalidades avançadas de busca.
   * 
   * @param filtros DTO com filtros avançados
   * @returns Resultado paginado com metadados de filtros aplicados
   */
  async findAllComFiltrosAvancados(
    filtros: SolicitacaoFiltrosAvancadosDto,
  ): Promise<IResultadoFiltros<Solicitacao>> {
    const startTime = Date.now();

    // Criar query builder base com joins necessários
    const queryBuilder = this.solicitacaoRepository
      .createScopedQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('beneficiario.enderecos', 'endereco')
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
        'solicitacao.updated_at as data_atualizacao',
        'solicitacao.prazo_analise',
        // Dados básicos do beneficiário
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
        // Dados do endereço (para filtro por bairro)
        'endereco.id',
        'endereco.bairro',
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

    // Aplicar filtros por múltiplos valores
    if (filtros.unidades?.length) {
      queryBuilder.andWhere('solicitacao.unidade_id IN (:...unidades)', {
        unidades: filtros.unidades,
      });
    }

    if (filtros.status?.length) {
      queryBuilder.andWhere('solicitacao.status IN (:...status)', {
        status: filtros.status,
      });
    }

    if (filtros.beneficios?.length) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id IN (:...beneficios)', {
        beneficios: filtros.beneficios,
      });
    }

    if (filtros.usuarios?.length) {
      queryBuilder.andWhere('solicitacao.tecnico_id IN (:...usuarios)', {
        usuarios: filtros.usuarios,
      });
    }

    if (filtros.beneficiarios?.length) {
      queryBuilder.andWhere('solicitacao.beneficiario_id IN (:...beneficiarios)', {
        beneficiarios: filtros.beneficiarios,
      });
    }

    if (filtros.bairros?.length) {
      queryBuilder.andWhere('LOWER(endereco.bairro) IN (:...bairros)', {
        bairros: filtros.bairros.map(b => b.toLowerCase()),
      });
    }

    if (filtros.prioridades?.length) {
      queryBuilder.andWhere('solicitacao.prioridade IN (:...prioridades)', {
        prioridades: filtros.prioridades,
      });
    }

    // Aplicar filtros de período
    if (filtros.periodo || filtros.data_inicio_personalizada || filtros.data_fim_personalizada) {
      let dataInicio: Date | undefined;
      let dataFim: Date | undefined;

      if (filtros.periodo && filtros.periodo !== PeriodoPredefinido.PERSONALIZADO) {
        const { dataInicio: inicio, dataFim: fim } = this.filtrosAvancadosService.calcularPeriodoPredefinido(filtros.periodo);
        dataInicio = inicio;
        dataFim = fim;
      } else if (filtros.data_inicio_personalizada || filtros.data_fim_personalizada) {
        if (filtros.data_inicio_personalizada) {
          dataInicio = new Date(filtros.data_inicio_personalizada);
        }
        if (filtros.data_fim_personalizada) {
          dataFim = new Date(filtros.data_fim_personalizada);
        }
      }

      if (dataInicio) {
        queryBuilder.andWhere('solicitacao.data_abertura >= :dataInicio', { dataInicio });
      }
      if (dataFim) {
        queryBuilder.andWhere('solicitacao.data_abertura <= :dataFim', { dataFim });
      }
    }

    // Aplicar filtros de busca textual
    if (filtros.search) {
      const searchParams = processAdvancedSearchParam(filtros.search);
      
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(beneficiario.nome) LIKE LOWER(:search)', {
            search: `%${searchParams.processedSearch}%`,
          })
            .orWhere('beneficiario.cpf ILIKE ANY(:cpfVariations)', {
              cpfVariations: searchParams.variations.map(cpf => `%${cpf}%`),
            })
            .orWhere('LOWER(solicitacao.protocolo) LIKE LOWER(:search)', {
              search: `%${searchParams.processedSearch}%`,
            })
            .orWhere('LOWER(tipo_beneficio.nome) LIKE LOWER(:search)', {
              search: `%${searchParams.processedSearch}%`,
            })
            .orWhere('LOWER(tipo_beneficio.codigo) LIKE LOWER(:search)', {
              search: `%${searchParams.processedSearch}%`,
            });
        }),
      );
    }

    if (filtros.protocolos?.length) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          filtros.protocolos.forEach((protocolo, index) => {
            if (index === 0) {
              qb.where('LOWER(solicitacao.protocolo) LIKE LOWER(:protocolo' + index + ')', {
                ['protocolo' + index]: `%${protocolo}%`,
              });
            } else {
              qb.orWhere('LOWER(solicitacao.protocolo) LIKE LOWER(:protocolo' + index + ')', {
                ['protocolo' + index]: `%${protocolo}%`,
              });
            }
          });
        })
      );
    }

    // Aplicar filtros específicos
    if (filtros.apenas_determinacao_judicial !== undefined) {
      queryBuilder.andWhere('solicitacao.determinacao_judicial_flag = :determinacao', {
        determinacao: filtros.apenas_determinacao_judicial,
      });
    }

    // Aplicar ordenação
    const sortBy = filtros.sort_by || 'data_abertura';
    const sortOrder = filtros.sort_order || 'DESC';

    const allowedSortFields = ['data_abertura', 'data_aprovacao', 'protocolo', 'status', 'prioridade'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Campo de ordenação '${sortBy}' não permitido`,
      );
    }

    queryBuilder.orderBy(`solicitacao.${sortBy}`, sortOrder);

    // Aplicar paginação
    const page = filtros.page || 1;
    const limit = Math.min(filtros.limit || 10, 100); // Máximo 100 itens por página
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Executar query
    const [items, total] = await queryBuilder.getManyAndCount();

    const resultado = {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };

    const executionTime = Date.now() - startTime;

    // Log de performance para queries lentas
    if (executionTime > 1000) {
      this.logger.warn(`Query lenta detectada: ${executionTime}ms`, {
        filtros,
        resultCount: resultado.items.length,
        totalCount: resultado.meta.total,
      });
    }

    // Construir metadados de filtros aplicados
    const filtrosAplicados = {
      unidades: filtros.unidades?.length || 0,
      status: filtros.status?.length || 0,
      beneficios: filtros.beneficios?.length || 0,
      usuarios: filtros.usuarios?.length || 0,
      bairros: filtros.bairros?.length || 0,
      beneficiarios: filtros.beneficiarios?.length || 0,
      prioridades: filtros.prioridades?.length || 0,
      periodo: filtros.periodo || (filtros.data_inicio_personalizada && filtros.data_fim_personalizada ? 'PERSONALIZADO' : undefined),
      search: !!filtros.search,
      protocolos: filtros.protocolos?.length || 0,
      apenas_determinacao_judicial: filtros.apenas_determinacao_judicial
    };

    return {
      items: resultado.items,
      total: resultado.meta.total,
      filtros_aplicados: filtros,
      meta: {
        limit: resultado.meta.limit,
        offset: (resultado.meta.page - 1) * resultado.meta.limit,
        page: resultado.meta.page,
        pages: resultado.meta.pages,
        hasNext: resultado.meta.has_next,
        hasPrev: resultado.meta.has_prev
      },
      tempo_execucao: executionTime
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
   * Busca uma solicitacao pelo ID
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
        // Dados Solicitacao
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.valor',
        'solicitacao.parecer_semtas',
        'solicitacao.dados_complementares',
        'solicitacao.data_abertura',
        'solicitacao.observacoes',
        // Dados Beneficiario
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
        // Dados Beneficio
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.descricao',
        'tipo_beneficio.codigo',
        // Dados Tecnico
        'tecnico.id',
        'tecnico.nome',
        // Dados Unidade
        'unidade.id',
        'unidade.nome',
        'unidade.sigla',
        // Dados Concessao
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
   * Busca o contato mais recente de um cidadao
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

    // Se nao encontrou, busca com proprietario = false
    if (!contato) {
      contato = await this.dataSource.getRepository(Contato).findOne({
        where: { cidadao_id: cidadaoId, proprietario: false },
        order: { created_at: 'DESC' },
      });
    }

    return contato;
  }

  /**
   * Cria uma nova solicitacao
   */
  async create(
    createSolicitacaoDto: CreateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    this.logger.log(
      `Iniciando criacao de solicitacao para beneficiario: ${createSolicitacaoDto.beneficiario_id}`,
    );

    try {
      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Validar se o beneficiario existe e obter seus dados
      let beneficiario;
      try {
        beneficiario = await this.cidadaoService.findById(
          createSolicitacaoDto.beneficiario_id,
          true, // incluir relacoes para obter a unidade
        );
      } catch (error) {
        if (error.status === 404) {
          throw new BadRequestException('Beneficiario nao encontrado');
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
            throw new BadRequestException('Solicitante nao encontrado');
          }
          throw error;
        }
      }

      // Validar que solicitante nao pode ser o mesmo que beneficiario
      if (
        createSolicitacaoDto.solicitante_id &&
        createSolicitacaoDto.solicitante_id ===
        createSolicitacaoDto.beneficiario_id
      ) {
        throw new BadRequestException(
          'Solicitante nao pode ser o mesmo que o beneficiario',
        );
      }

      // Validar se o tipo de beneficio existe e esta ativo
      const tipoBeneficio = await this.dataSource
        .getRepository(TipoBeneficio)
        .findOne({
          where: { id: createSolicitacaoDto.tipo_beneficio_id },
          select: ['id', 'status', 'nome'],
        });

      if (!tipoBeneficio) {
        throw new BadRequestException('Tipo de beneficio nao encontrado');
      }

      // REGRA DE NEGOCIO 2: Validar se o beneficio esta ativo
      if (tipoBeneficio.status !== 'ativo') {
        throw new BadRequestException(
          `Uma solicitacao so pode ser criada para beneficios ativos. O beneficio "${tipoBeneficio.nome}" esta inativo.`,
        );
      }

      // REGRA DE NEGOCIO 1: Validar se a unidade do beneficiario e igual a unidade do tecnico
      // Determinar a unidade do tecnico
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

      // VALIDACAO ESPECIAL: Verificar se o cidadao esta na unidade MIGRATION
      // Se sim, transferir automaticamente para a unidade do tecnico
      await this.verificarETransferirCidadaoSeNecessario(beneficiario, unidadeTecnico, user.id);

      // VALIDACAO DE ESTADO CONSISTENTE: Verificar se o beneficiário tem a unidade correta após possível transferência
      await this.validarEstadoConsistenteBeneficiario(beneficiario, unidadeTecnico, user);

      // Validar se a unidade do beneficiario e igual a unidade do tecnico
      if (beneficiario.unidade_id !== unidadeTecnico && user.escopo !== 'GLOBAL') {
        throw new BadRequestException(
          `Solicitações só podem ser feitas pela unidade: ${beneficiario.unidade.nome}. ` +
          `Solicite a transferência à Coordenação de Benefícios.`
        );
      }

      // Validar exclusividade para o beneficiario
      await this.validacaoExclusividadeService.validarExclusividade(
        createSolicitacaoDto.beneficiario_id,
        createSolicitacaoDto.tipo_beneficio_id,
      );

      // Verificar se ja existe uma solicitacao em andamento para o mesmo cidadao e tipo de beneficio
      const statusEmAndamento = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.PENDENTE,
        StatusSolicitacao.EM_ANALISE,
      ];

      // Verifica se existe uma solicitacao em andamento para o mesmo beneficiario e beneficio
      const solicitacaoExistente = await this.solicitacaoRepository.findOne({
        where: {
          beneficiario_id: createSolicitacaoDto.beneficiario_id,
          tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
          status: In(statusEmAndamento),
        },
      });

      // Se existir, retorna os dados da solicitacao existente
      if (solicitacaoExistente) {
        this.logger.log(
          `Solicitacao ja existe para este beneficiario e tipo de beneficio: ${solicitacaoExistente.id}`,
        );
        return solicitacaoExistente;
      }

      // Usar a unidade ja validada nas regras de negocio
      const unidadeId = unidadeTecnico;

      // Normalizar enums nos dados complementares antes de salvar
      const dadosComplementares =
        createSolicitacaoDto.dados_complementares || {};
      const normalizedDadosComplementares =
        normalizeEnumFields(dadosComplementares);

      // Buscar valor de referencia do beneficio se nao foi fornecido
      let valorSolicitacao = createSolicitacaoDto.valor;
      if (!valorSolicitacao) {
        const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
          where: { id: createSolicitacaoDto.tipo_beneficio_id },
          select: ['valor'],
        });

        if (tipoBeneficio && tipoBeneficio.valor) {
          valorSolicitacao = tipoBeneficio.valor;
          this.logger.log(
            `Valor de referencia do beneficio aplicado: ${valorSolicitacao} para tipo de beneficio ${createSolicitacaoDto.tipo_beneficio_id}`,
          );
        }
      }

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      const solicitacaoSalva = await this.dataSource.transaction(
        async (manager) => {
          // Criar uma nova instancia de Solicitacao com repositorio tipado
          const repo = manager.getRepository(Solicitacao);

          // Buscar o codigo do tipo de beneficio para gerar o protocolo
          const tipoBeneficio = await manager.getRepository(TipoBeneficio).findOne({
            where: { id: createSolicitacaoDto.tipo_beneficio_id },
            select: ['codigo']
          });

          // Gerar um UUID unico para usar no protocolo e como ID da solicitacao
          const { v4: uuidv4 } = await import('uuid');
          const uniqueId = uuidv4();

          // Criar objeto de solicitacao
          const solicitacao = repo.create({
            id: uniqueId, // Definir o ID explicitamente
            beneficiario_id: createSolicitacaoDto.beneficiario_id,
            solicitante_id: createSolicitacaoDto.solicitante_id,
            tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
            unidade_id: unidadeId,
            tecnico_id: user.id,
            valor: valorSolicitacao,
            status: StatusSolicitacao.RASCUNHO,
            dados_complementares: normalizedDadosComplementares,
            observacoes: createSolicitacaoDto.observacoes,
            determinacao_judicial_flag: createSolicitacaoDto.determinacao_judicial_flag || false,
            determinacao_judicial_id: createSolicitacaoDto.determinacao_judicial_id,
            data_abertura: new Date(),
          });

          // Gerar o protocolo com o codigo do beneficio e o UUID unico
          const protocolo = await this.generateProtocol(tipoBeneficio?.codigo, uniqueId);
          solicitacao.protocolo = protocolo;

          // Salvar a solicitacao com o protocolo ja gerado
          const solicitacaoSalva = await repo.save(solicitacao);

          // Registrar no historico
          const historicoRepo = manager.getRepository(HistoricoSolicitacao);
          await historicoRepo.save({
            solicitacao_id: solicitacaoSalva.id,
            status_anterior: null,
            status_atual: StatusSolicitacao.RASCUNHO,
            usuario_id: user.id,
            observacao: createSolicitacaoDto.determinacao_judicial_flag
              ? 'Solicitacao criada por determinacao judicial'
              : 'Solicitacao criada',
          });

          return solicitacaoSalva;
        },
      );

      // ===== CONSULTA POS-TRANSACAO =====
      // Buscar a solicitacao completa apos a transacao
      const solicitacaoCompleta = await this.solicitacaoRepository
        .createScopedQueryBuilder('solicitacao')
        .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
        .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoinAndSelect('solicitacao.unidade', 'unidade')
        .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
        .select([
          // Dados basicos da solicitacao
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.status',
          'solicitacao.valor',
          'solicitacao.data_abertura',
          'solicitacao.observacoes',
          // Dados basicos do beneficiario
          'beneficiario.id',
          'beneficiario.nome',
          'beneficiario.cpf',
          // Dados basicos do beneficio
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.codigo',
          // Dados basicos do tecnico
          'tecnico.id',
          'tecnico.nome',
          // Dados basicos da unidade do tecnico
          'unidade.id',
          'unidade.nome',
        ])
        .where('solicitacao.id = :id', { id: solicitacaoSalva.id })
        .getOne();

      if (!solicitacaoCompleta) {
        throwInternalError('Erro ao buscar solicitacao apos criacao', {
          data: {
            solicitacao_id: solicitacaoSalva.id,
            context: 'post_creation_fetch',
          },
        });
      }

      // Emitir evento de auditoria para criacao da solicitacao
      await this.auditEventEmitter.emitEntityCreated(
        'Solicitacao',
        solicitacaoCompleta.id,
        {
          beneficiario_id: createSolicitacaoDto.beneficiario_id,
          tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
          status: StatusSolicitacao.RASCUNHO,
          protocolo: solicitacaoCompleta.protocolo,
          valor: valorSolicitacao,
          determinacao_judicial_flag: createSolicitacaoDto.determinacao_judicial_flag,
        },
        user.id
      );

      // Emitir evento CREATED para notificacoes
      this.eventosService.emitirEventoCriacao(solicitacaoCompleta);
      this.logger.debug(`Evento CREATED emitido para solicitacao: ${solicitacaoCompleta.id}`);

      // Solicitacao criada com sucesso
      this.logger.log(`Solicitacao criada com sucesso: ${solicitacaoCompleta.id}`);
      return solicitacaoCompleta;
    } catch (error) {
      this.logger.error(
        `Erro ao criar solicitacao: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza uma solicitacao existente
   */
  async update(
    id: string,
    updateSolicitacaoDto: UpdateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    try {
      // Iniciando atualizacao da solicitacao
      this.logger.log(`Iniciando atualizacao da solicitacao: ${id}`);

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao fora da transacao
      const solicitacaoExistente = await this.solicitacaoRepository.findOne({
        where: { id },
        select: [
          'id',
          'status',
          'beneficiario_id',
          'tipo_beneficio_id',
          'unidade_id',
          'tecnico_id',
          'valor',
          'observacoes',
          'dados_complementares',
          'determinacao_judicial_flag',
          'determinacao_judicial_id',
        ],
      });

      if (!solicitacaoExistente) {
        throwSolicitacaoNotFound(id);
      }

      // Preparar dados para atualizacao
      const dadosAtualizacao: Partial<Solicitacao> = {};

      // Nota: beneficiario_id nao pode ser atualizado conforme definido no DTO
      if (updateSolicitacaoDto.solicitante_id !== undefined) {
        dadosAtualizacao.solicitante_id = updateSolicitacaoDto.solicitante_id;
      }
      if (updateSolicitacaoDto.valor !== undefined) {
        dadosAtualizacao.valor = updateSolicitacaoDto.valor;
      }
      if (updateSolicitacaoDto.observacoes !== undefined) {
        dadosAtualizacao.observacoes = updateSolicitacaoDto.observacoes;
      }
      if (updateSolicitacaoDto.dados_complementares !== undefined) {
        dadosAtualizacao.dados_complementares = normalizeEnumFields(
          updateSolicitacaoDto.dados_complementares,
        );
      }
      if (updateSolicitacaoDto.determinacao_judicial_flag !== undefined) {
        dadosAtualizacao.determinacao_judicial_flag = updateSolicitacaoDto.determinacao_judicial_flag;
      }
      if (updateSolicitacaoDto.determinacao_judicial_id !== undefined) {
        dadosAtualizacao.determinacao_judicial_id = updateSolicitacaoDto.determinacao_judicial_id;
      }

      // Se nao ha dados para atualizar, retornar a solicitacao sem modificacoes
      if (Object.keys(dadosAtualizacao).length === 0) {
        this.logger.log(`Nenhum dado para atualizar na solicitacao: ${id}`);
        return await this.findById(id);
      }

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        // Usar repositorios tipados
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitacao
        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: id,
          status_anterior: solicitacaoExistente.status,
          status_atual: solicitacaoExistente.status, // Status permanece o mesmo
          usuario_id: user.id,
          observacao: 'Solicitacao atualizada',
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Emitir evento de auditoria para atualizacao da solicitacao
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        id,
        dadosAtualizacao,
        {}, // dados anteriores - pode ser obtido antes da atualização se necessário
        user.id
      );

      // Solicitacao atualizada com sucesso
      this.logger.log(`Solicitacao atualizada com sucesso: ${id}`);
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar solicitacao ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Submete uma solicitacao para analise
   */
  async submeterSolicitacao(id: string, user: any): Promise<Solicitacao> {
    try {
      // Iniciando submissao da solicitacao
      this.logger.log(`Iniciando submissao da solicitacao: ${id}`);

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao fora da transacao
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id },
        select: ['id', 'status', 'protocolo'],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(id);
      }

      // Verificar se a solicitacao esta em estado que permite submissao
      if (solicitacao.status !== StatusSolicitacao.RASCUNHO) {
        throwInvalidStatusTransition(
          solicitacao.status,
          StatusSolicitacao.ABERTA,
          {
            data: {
              solicitacao_id: id,
              protocolo: solicitacao.protocolo,
              context: 'submissao_validation',
            },
          },
        );
      }

      // Preparar dados para atualizacao
      const novoStatus = StatusSolicitacao.ABERTA;
      const dataSubmissao = new Date();

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar status da solicitacao
        await solicitacaoRepo.update(id, {
          status: novoStatus,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: id,
          status_anterior: StatusSolicitacao.RASCUNHO,
          status_atual: novoStatus,
          usuario_id: user.id,
          observacao: 'Solicitacao submetida para analise',
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Emitir evento de auditoria para submissao da solicitacao
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        id,
        {
          status: novoStatus,
        },
        { status: StatusSolicitacao.RASCUNHO }, // dados anteriores
        user.id
      );

      this.logger.log(`Solicitacao submetida com sucesso: ${id}`);
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao submeter solicitacao ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Avalia uma solicitacao (aprova ou rejeita)
   */
  async avaliarSolicitacao(
    id: string,
    avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    try {
      this.logger.log(`Iniciando avaliacao da solicitacao: ${id}`);

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao fora da transacao
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id },
        select: [
          'id',
          'status',
          'protocolo',
          'beneficiario_id',
          'tipo_beneficio_id',
        ],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(id);
      }

      // Verificar se a solicitacao esta em estado que permite avaliacao
      const statusPermitidos = [
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.EM_ANALISE,
        StatusSolicitacao.PENDENTE,
      ];

      if (!statusPermitidos.includes(solicitacao.status)) {
        throwInvalidStatusTransition(
          solicitacao.status,
          avaliarSolicitacaoDto.aprovado
            ? StatusSolicitacao.APROVADA
            : StatusSolicitacao.INDEFERIDA,
          {
            data: {
              solicitacao_id: id,
              protocolo: solicitacao.protocolo,
              context: 'avaliacao_validation',
            },
          },
        );
      }

      // Preparar dados para atualizacao
      const novoStatus = avaliarSolicitacaoDto.aprovado
        ? StatusSolicitacao.APROVADA
        : StatusSolicitacao.PENDENTE;
      const dataAvaliacao = new Date();

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitacao
        const dadosAtualizacao: Partial<Solicitacao> = {
          status: novoStatus,
          parecer_semtas: avaliarSolicitacaoDto.parecer,
        };

        if (avaliarSolicitacaoDto.aprovado) {
          dadosAtualizacao.data_aprovacao = dataAvaliacao;
        }

        await solicitacaoRepo.update(id, dadosAtualizacao);

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: id,
          status_anterior: solicitacao.status,
          status_atual: novoStatus,
          usuario_id: user.id,
          observacao: avaliarSolicitacaoDto.aprovado
            ? `Solicitacao aprovada: ${avaliarSolicitacaoDto.parecer || 'Sem observacoes'}`
            : `Solicitacao rejeitada: ${avaliarSolicitacaoDto.pendencias?.[0] || 'Sem motivo especificado'}`,
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Emitir evento de auditoria para avaliacao da solicitacao
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        id,
        { status: novoStatus, parecer_semtas: avaliarSolicitacaoDto.parecer },
        { status: solicitacao.status },
        user.id
      );

      this.logger.log(
        `Solicitacao ${avaliarSolicitacaoDto.aprovado ? 'aprovada' : 'rejeitada'} com sucesso: ${id}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao avaliar solicitacao ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancela uma solicitacao
   */
  async cancelarSolicitacao(id: string, user: any): Promise<Solicitacao> {
    try {
      this.logger.log(`Iniciando cancelamento da solicitacao: ${id}`);

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao fora da transacao
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id },
        select: ['id', 'status', 'protocolo'],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(id);
      }

      // Verificar se a solicitacao pode ser cancelada
      const statusPermitidos = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.EM_ANALISE,
        StatusSolicitacao.PENDENTE,
      ];

      if (!statusPermitidos.includes(solicitacao.status)) {
        throwInvalidStatusTransition(
          solicitacao.status,
          StatusSolicitacao.CANCELADA,
          {
            data: {
              solicitacao_id: id,
              protocolo: solicitacao.protocolo,
              context: 'cancelamento_validation',
            },
          },
        );
      }

      // Preparar dados para atualizacao
      const novoStatus = StatusSolicitacao.CANCELADA;
      const dataCancelamento = new Date();

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar status da solicitacao
        await solicitacaoRepo.update(id, {
          status: novoStatus,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: id,
          status_anterior: solicitacao.status,
          status_atual: novoStatus,
          usuario_id: user.id,
          observacao: 'Solicitacao cancelada',
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(id);

      // Emitir evento de auditoria para cancelamento da solicitacao
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'Solicitacao',
        entityId: id,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'CANCEL',
          protocolo: solicitacaoAtualizada.protocolo,
          status_anterior: solicitacao.status,
          status_atual: novoStatus,
          beneficiario_nome: solicitacaoAtualizada.beneficiario?.nome,
          beneficio_nome: solicitacaoAtualizada.tipo_beneficio?.nome,
        },
      });

      this.logger.log(`Solicitacao cancelada com sucesso: ${id}`);
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao cancelar solicitacao ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca o historico de uma solicitacao
   */
  async getHistorico(solicitacaoId: string) {
    return await this.historicoRepository.find({
      where: { solicitacao_id: solicitacaoId },
      relations: ['usuario'],
      order: { created_at: 'DESC' },
      select: {
        id: true,
        status_anterior: true,
        status_atual: true,
        observacao: true,
        created_at: true,
        usuario: { id: true, nome: true },
      },
    });
  }

  /**
   * Busca as pendencias de uma solicitacao
   */
  async getPendencias(solicitacaoId: string) {
    return await this.pendenciaRepository.find({
      where: { solicitacao_id: solicitacaoId },
      relations: ['registrado_por', 'resolvido_por'],
      order: { created_at: 'DESC' },
      select: {
        id: true,
        descricao: true,
        status: true,
        created_at: true,
        data_resolucao: true,
        observacao_resolucao: true,
        registrado_por: { id: true, nome: true },
        resolvido_por: { id: true, nome: true },
      },
    });
  }

  /**
   * Vincula um processo judicial a uma solicitacao
   */
  async vincularProcessoJudicial(
    solicitacaoId: string,
    vincularDto: VincularProcessoJudicialDto,
    user: any,
  ): Promise<Solicitacao> {
    try {
      this.logger.log(
        `Iniciando vinculacao de processo judicial ${vincularDto.processo_judicial_id} a solicitacao ${solicitacaoId}`,
      );

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        select: ['id', 'protocolo', 'processo_judicial_id'],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(solicitacaoId);
      }

      // Verificar se ja existe um processo judicial vinculado
      if (solicitacao.processo_judicial_id) {
        throwProcessoJudicialAlreadyLinked(
          solicitacao.processo_judicial_id,
          solicitacaoId,
          {
            data: {
              processo_atual: solicitacao.processo_judicial_id,
              processo_novo: vincularDto.processo_judicial_id,
              protocolo: solicitacao.protocolo,
            },
          },
        );
      }

      // Verificar se o processo judicial existe
      const processoJudicial = await this.processoJudicialRepository.findOne({
        where: { id: vincularDto.processo_judicial_id },
        select: ['id', 'numero_processo', 'status'],
      });

      if (!processoJudicial) {
        throwProcessoJudicialNotFound(vincularDto.processo_judicial_id);
      }

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitacao com o processo judicial
        await solicitacaoRepo.update(solicitacaoId, {
          processo_judicial_id: vincularDto.processo_judicial_id,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: solicitacaoId,
          status_anterior: solicitacao.status,
          status_novo: solicitacao.status, // Status permanece o mesmo
          usuario_id: user.id,
          observacao: `Processo judicial ${processoJudicial.numero_processo} vinculado a solicitacao`,
          data_alteracao: new Date(),
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(solicitacaoId);

      // Emitir evento de auditoria para vinculacao do processo judicial
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'Solicitacao',
        entityId: solicitacaoId,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'LINK_JUDICIAL_PROCESS',
          processo_judicial_id: vincularDto.processo_judicial_id,
          protocolo: solicitacao.protocolo,
          numero_processo: processoJudicial.numero_processo,
          beneficiario_nome: solicitacaoAtualizada.beneficiario?.nome,
          beneficio_nome: solicitacaoAtualizada.tipo_beneficio?.nome,
        },
      });

      this.logger.log(
        `Processo judicial ${processoJudicial.numero_processo} vinculado com sucesso a solicitacao ${solicitacaoId}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao vincular processo judicial a solicitacao ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Desvincula um processo judicial de uma solicitacao
   */
  async desvincularProcessoJudicial(
    solicitacaoId: string,
    user: any,
  ): Promise<Solicitacao> {
    try {
      this.logger.log(
        `Iniciando desvinculacao de processo judicial da solicitacao ${solicitacaoId}`,
      );

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao com o processo judicial
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['processo_judicial'],
        select: {
          id: true,
          protocolo: true,
          processo_judicial_id: true,
          status: true,
          processo_judicial: {
            id: true,
            numero_processo: true,
          },
        },
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(solicitacaoId);
      }

      // Verificar se existe um processo judicial vinculado
      if (!solicitacao.processo_judicial_id) {
        throwProcessoJudicialNotLinked(solicitacaoId, {
          data: {
            protocolo: solicitacao.protocolo,
          },
        });
      }

      const numeroProcesso = solicitacao.processo_judicial?.numero_processo;

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Remover a vinculacao do processo judicial
        await solicitacaoRepo.update(solicitacaoId, {
          processo_judicial_id: null,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: solicitacaoId,
          status_anterior: solicitacao.status,
          status_novo: solicitacao.status, // Status permanece o mesmo
          usuario_id: user.id,
          observacao: `Processo judicial ${numeroProcesso} desvinculado da solicitacao`,
          data_alteracao: new Date(),
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(solicitacaoId);

      // Emitir evento de auditoria para desvinculacao do processo judicial
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'Solicitacao',
        entityId: solicitacaoId,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'UNLINK_JUDICIAL_PROCESS',
          processo_judicial_id: null,
          protocolo: solicitacao.protocolo,
          numero_processo: numeroProcesso,
          beneficiario_nome: solicitacaoAtualizada.beneficiario?.nome,
          beneficio_nome: solicitacaoAtualizada.tipo_beneficio?.nome,
        },
      });

      this.logger.log(
        `Processo judicial ${numeroProcesso} desvinculado com sucesso da solicitacao ${solicitacaoId}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao desvincular processo judicial da solicitacao ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Vincula uma determinacao judicial a uma solicitacao
   */
  async vincularDeterminacaoJudicial(
    solicitacaoId: string,
    vincularDto: VincularDeterminacaoJudicialDto,
    user: any,
  ): Promise<Solicitacao> {
    try {
      this.logger.log(
        `Iniciando vinculacao de determinacao judicial ${vincularDto.determinacao_judicial_id} a solicitacao ${solicitacaoId}`,
      );

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        select: ['id', 'protocolo', 'determinacao_judicial_id'],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(solicitacaoId);
      }

      // Verificar se ja existe uma determinacao judicial vinculada
      if (solicitacao.determinacao_judicial_id) {
        throwDeterminacaoJudicialAlreadyLinked(
          solicitacao.determinacao_judicial_id,
          solicitacaoId,
        );
      }

      // Verificar se a determinacao judicial existe
      const determinacaoJudicial = await this.determinacaoJudicialRepository.findOne({
        where: { id: vincularDto.determinacao_judicial_id },
        select: ['id', 'numero_determinacao', 'ativo'],
      });

      if (!determinacaoJudicial) {
        throwDeterminacaoJudicialNotFound(vincularDto.determinacao_judicial_id, {
          data: {
            solicitacao_id: solicitacaoId,
            protocolo: solicitacao.protocolo,
          },
        });
      }

      // Verificar se a determinacao judicial esta ativa
      if (!determinacaoJudicial.ativo) {
        throw new BadRequestException(
          'A determinacao judicial nao esta ativa',
        );
      }

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Atualizar a solicitacao com a determinacao judicial
        await solicitacaoRepo.update(solicitacaoId, {
          determinacao_judicial_id: vincularDto.determinacao_judicial_id,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: solicitacaoId,
          status_anterior: solicitacao.status,
          status_novo: solicitacao.status, // Status permanece o mesmo
          usuario_id: user.id,
          observacao: `Determinacao judicial ${determinacaoJudicial.numero_determinacao} vinculada a solicitacao`,
          data_alteracao: new Date(),
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(solicitacaoId);

      // Emitir evento de auditoria para vinculacao da determinacao judicial
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'Solicitacao',
        entityId: solicitacaoId,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'LINK_JUDICIAL_DETERMINATION',
          determinacao_judicial_id: vincularDto.determinacao_judicial_id,
          protocolo: solicitacao.protocolo,
          numero_determinacao: determinacaoJudicial.numero_determinacao,
          beneficiario_nome: solicitacaoAtualizada.beneficiario?.nome,
          beneficio_nome: solicitacaoAtualizada.tipo_beneficio?.nome,
        },
      });

      this.logger.log(
        `Determinacao judicial ${determinacaoJudicial.numero_determinacao} vinculada com sucesso a solicitacao ${solicitacaoId}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao vincular determinacao judicial a solicitacao ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Desvincula uma determinacao judicial de uma solicitacao
   */
  async desvincularDeterminacaoJudicial(
    solicitacaoId: string,
    user: any,
  ): Promise<Solicitacao> {
    try {
      this.logger.log(
        `Iniciando desvinculacao de determinacao judicial da solicitacao ${solicitacaoId}`,
      );

      // ===== VALIDACOES E LEITURAS FORA DA TRANSACAO =====

      // Buscar a solicitacao com a determinacao judicial
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['determinacao_judicial'],
        select: {
          id: true,
          protocolo: true,
          determinacao_judicial_id: true,
          status: true,
          determinacao_judicial: {
            id: true,
            numero_determinacao: true,
          },
        },
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(solicitacaoId);
      }

      // Verificar se existe uma determinacao judicial vinculada
      if (!solicitacao.determinacao_judicial_id) {
        throwDeterminacaoJudicialNotLinked(solicitacaoId, {
          data: {
            protocolo: solicitacao.protocolo,
          },
        });
      }

      const numeroDeterminacao = solicitacao.determinacao_judicial?.numero_determinacao;

      // ===== TRANSACAO MINIMA APENAS PARA OPERACOES DE ESCRITA =====
      await this.dataSource.transaction(async (manager) => {
        const solicitacaoRepo = manager.getRepository(Solicitacao);
        const historicoRepo = manager.getRepository(HistoricoSolicitacao);

        // Remover a vinculacao da determinacao judicial
        await solicitacaoRepo.update(solicitacaoId, {
          determinacao_judicial_id: null,
        });

        // Registrar no historico
        await historicoRepo.save({
          solicitacao_id: solicitacaoId,
          status_anterior: solicitacao.status,
          status_novo: solicitacao.status, // Status permanece o mesmo
          usuario_id: user.id,
          observacao: `Determinacao judicial ${numeroDeterminacao} desvinculada da solicitacao`,
          data_alteracao: new Date(),
        });
      });

      // ===== CONSULTA POS-TRANSACAO =====
      const solicitacaoAtualizada = await this.findById(solicitacaoId);

      // Emitir evento de auditoria para desvinculacao da determinacao judicial
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_UPDATED,
        entityName: 'Solicitacao',
        entityId: solicitacaoId,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'UNLINK_JUDICIAL_DETERMINATION',
          determinacao_judicial_id: null,
          protocolo: solicitacao.protocolo,
          numero_determinacao: numeroDeterminacao,
          beneficiario_nome: solicitacaoAtualizada.beneficiario?.nome,
          beneficio_nome: solicitacaoAtualizada.tipo_beneficio?.nome,
        },
      });

      this.logger.log(
        `Determinacao judicial ${numeroDeterminacao} desvinculada com sucesso da solicitacao ${solicitacaoId}`,
      );
      return solicitacaoAtualizada;
    } catch (error) {
      this.logger.error(
        `Erro ao desvincular determinacao judicial da solicitacao ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove uma solicitacao (soft delete)
   */
  async removerSolicitacao(
    solicitacaoId: string,
    user: any,
  ): Promise<void> {
    this.logger.log(`Iniciando remocao da solicitacao: ${solicitacaoId}`);

    try {
      // Buscar a solicitacao para validar
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        select: ['id', 'status', 'protocolo'],
      });

      if (!solicitacao) {
        throwSolicitacaoNotFound(solicitacaoId);
      }

      // Validar se o status permite exclusao (apenas RASCUNHO ou ABERTA)
      const statusPermitidos = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
      ];

      if (!statusPermitidos.includes(solicitacao.status)) {
        throwSolicitacaoCannotDelete(solicitacaoId, solicitacao.status, {
          data: {
            motivo: `Apenas solicitacoes com status 'RASCUNHO' ou 'ABERTA' podem ser excluidas. Status atual: '${solicitacao.status}'`,
            statusPermitidos,
          },
        });
      }

      // Realizar o soft delete utilizando o metodo do repositorio
      await this.solicitacaoRepository.remover(solicitacaoId);

      // Registrar a exclusao no historico
      await this.historicoRepository.save({
        solicitacao_id: solicitacaoId,
        status_anterior: solicitacao.status,
        status_novo: solicitacao.status,
        usuario_id: user.id,
        observacao: `Solicitacao removida (soft delete) pelo usuario`,
        data_alteracao: new Date(),
      });

      // Emitir evento de auditoria para remocao da solicitacao
      await this.auditEventEmitter.emit({
        eventId: uuidv4(),
        eventType: AuditEventType.ENTITY_DELETED,
        entityName: 'Solicitacao',
        entityId: solicitacaoId,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          action: 'DELETE',
          deleted_at: new Date(),
          protocolo: solicitacao.protocolo,
          status: solicitacao.status,
          motivo: 'Exclusao logica da solicitacao',
        },
      });

      this.logger.log(`Solicitacao ${solicitacaoId} removida com sucesso`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover solicitacao ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
* Gera o protocolo da solicitação no novo formato: Benefício-Ano-Código
* Este método deve ser chamado pelo serviço antes da criação da solicitação
* @param codigoBeneficio Código do tipo de benefício (3 caracteres)
* @param uniqueId ID único gerado previamente para usar como código
*/
  private generateProtocol(codigoBeneficio?: string, uniqueId?: string) {
    const date = new Date();
    const ano = date.getFullYear();

    if (codigoBeneficio && codigoBeneficio.length >= 3 && uniqueId) {
      // Usar os 3 primeiros caracteres do código do benefício
      const prefixoBeneficio = codigoBeneficio.substring(0, 3).toUpperCase();

      // Usar os primeiros 8 caracteres do ID único como código
      const codigo = uniqueId.substring(0, 8).toUpperCase();

      return `${prefixoBeneficio}-${ano}-${codigo}`;
    } else {
      // Fallback para formato padrão se não houver código do benefício ou ID
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      return `SOL-${ano}${(date.getMonth() + 1).toString().padStart(2, '0')}-${random}`;
    }
  }

  /**
   * Verifica se o cidadão está na unidade MIGRATION e executa a transferência se necessário
   * @param beneficiario Dados do beneficiário
   * @param unidadeDestino ID da unidade de destino
   * @param userId ID do usuário que está executando a operação
   * @returns Promise<void>
   */
  private async verificarETransferirCidadaoSeNecessario(
    beneficiario: any,
    unidadeDestino: string,
    userId?: string,
  ): Promise<void> {
    // Verificar se o beneficiário está na unidade MIGRATION
    if (beneficiario.unidade?.codigo !== 'MIGRATION') {
      return; // Não precisa transferir
    }

    this.logger.log(
      `Cidadão ${beneficiario.id} está na unidade MIGRATION. Iniciando processo de transferência para unidade ${unidadeDestino}.`,
    );

    try {
      await this.executarTransferenciaCidadao(beneficiario, unidadeDestino, userId);
    } catch (error) {
      this.logger.error(
        `Erro ao transferir cidadão ${beneficiario.id} da unidade MIGRATION: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Executa a transferência do cidadão com retry automático e tratamento robusto de erros
   * @param beneficiario Dados do beneficiário
   * @param unidadeDestino ID da unidade de destino
   * @param userId ID do usuário que está executando a operação
   * @returns Promise<void>
   */
  private async executarTransferenciaCidadao(
    beneficiario: any,
    unidadeDestino: string,
    userId?: string,
  ): Promise<void> {
    const maxTentativas = 3;
    let tentativas = 0;
    let ultimoErro: any;

    while (tentativas < maxTentativas) {
      try {
        tentativas++;
        this.logger.log(
          `Tentativa ${tentativas}/${maxTentativas} de transferir cidadão ${beneficiario.id}`,
        );

        // Executar transferência
        await this.cidadaoService.transferirUnidade(
          beneficiario.id,
          {
            unidade_id: unidadeDestino,
            motivo: 'Transferência automática durante criação de solicitação - cidadão estava na unidade MIGRATION',
          },
          userId,
        );

        // Atualizar o objeto beneficiário com a nova unidade
        beneficiario.unidade_id = unidadeDestino;

        this.logger.log(
          `Cidadão ${beneficiario.id} transferido com sucesso para a unidade ${unidadeDestino} na tentativa ${tentativas}`,
        );
        return; // Sucesso, sair do método
      } catch (error) {
        ultimoErro = error;
        
        // Verificar se o erro é porque o cidadão já está na unidade correta
        if (error.message?.includes('O cidadão já está vinculado a esta unidade')) {
          this.logger.log(
            `Cidadão ${beneficiario.id} já está vinculado à unidade ${unidadeDestino}. Continuando com a operação.`,
          );
          // Atualizar o objeto beneficiário com a unidade correta
          beneficiario.unidade_id = unidadeDestino;
          return; // Não é um erro real, continuar
        }
        
        this.logger.warn(
          `Tentativa ${tentativas}/${maxTentativas} falhou ao transferir cidadão ${beneficiario.id}: ${error.message}`,
        );

        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (tentativas < maxTentativas) {
          const delayMs = tentativas * 1000; // Delay progressivo: 1s, 2s, 3s
          this.logger.log(`Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Se todas as tentativas falharam, lançar erro detalhado
    this.logger.error(
      `Falha ao transferir cidadão ${beneficiario.id} após ${maxTentativas} tentativas. Último erro: ${ultimoErro?.message}`,
      ultimoErro?.stack,
    );

    // Verificar tipo de erro para fornecer mensagem mais específica
    const isTimeoutError = ultimoErro?.message?.toLowerCase().includes('timeout') ||
                          ultimoErro?.message?.toLowerCase().includes('connection') ||
                          ultimoErro?.code === 'ECONNRESET' ||
                          ultimoErro?.code === 'ETIMEDOUT';

    const isAlreadyLinkedError = ultimoErro?.message?.includes('O cidadão já está vinculado a esta unidade');

    if (isAlreadyLinkedError) {
      this.logger.log(
        `Cidadão ${beneficiario.id} já estava vinculado à unidade ${unidadeDestino}. Continuando com a operação.`,
      );
      // Atualizar o objeto beneficiário com a unidade correta
      beneficiario.unidade_id = unidadeDestino;
      return;
    } else if (isTimeoutError) {
      throw new BadRequestException(
        'Erro de conexão com o banco de dados ao transferir cidadão. O sistema está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
      );
    } else {
      throw new BadRequestException(
        `Erro ao transferir cidadão da unidade MIGRATION: ${ultimoErro?.message || 'Erro desconhecido'}. Tente novamente ou contate o suporte técnico.`,
      );
    }
  }

  /**
   * Valida se o beneficiário está em estado consistente após possível transferência
   * Verifica se os dados em memória estão sincronizados com o banco de dados
   */
  private async validarEstadoConsistenteBeneficiario(
    beneficiario: any,
    unidadeEsperada: string,
    user: any,
  ): Promise<void> {
    try {
      // Buscar dados atualizados do beneficiário no banco de dados
      const beneficiarioAtualizado = await this.cidadaoService.findById(beneficiario.id);
      
      if (!beneficiarioAtualizado) {
        this.logger.error(`Beneficiário ${beneficiario.id} não encontrado durante validação de estado`);
        throw new BadRequestException('Beneficiário não encontrado no sistema');
      }

      // Verificar se a unidade no banco está sincronizada com a esperada
      if (beneficiarioAtualizado.unidade_id !== unidadeEsperada) {
        this.logger.warn(
          `Inconsistência detectada: Beneficiário ${beneficiario.id} tem unidade ${beneficiarioAtualizado.unidade_id} no banco, mas esperava-se ${unidadeEsperada}`,
        );
        
        // Atualizar o objeto em memória com os dados do banco
        beneficiario.unidade_id = beneficiarioAtualizado.unidade_id;
        beneficiario.unidade = beneficiarioAtualizado.unidade;
        
        // Se ainda não está na unidade esperada e não é usuário global, pode ser necessária nova transferência
        if (beneficiarioAtualizado.unidade_id !== unidadeEsperada && user.escopo !== 'GLOBAL') {
          this.logger.log(
            `Beneficiário ${beneficiario.id} ainda não está na unidade esperada ${unidadeEsperada}. Estado atual: ${beneficiarioAtualizado.unidade_id}`,
          );
        }
      } else {
        // Estado consistente - atualizar objeto em memória para garantir sincronização
        beneficiario.unidade_id = beneficiarioAtualizado.unidade_id;
        beneficiario.unidade = beneficiarioAtualizado.unidade;
        
        this.logger.log(
          `Estado consistente validado: Beneficiário ${beneficiario.id} está na unidade ${unidadeEsperada}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao validar estado consistente do beneficiário ${beneficiario.id}: ${error.message}`,
        error.stack,
      );
      
      // Se é erro de validação de estado, não bloquear o fluxo principal
      // mas registrar para monitoramento
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Para outros erros, apenas logar e continuar
      this.logger.warn(
        `Continuando com criação da solicitação apesar do erro de validação de estado para beneficiário ${beneficiario.id}`,
      );
    }
  }
}