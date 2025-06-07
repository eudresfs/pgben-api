import {
  Injectable,
  Logger,
  forwardRef,
  Inject,
  BadRequestException,
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
import { Repository, Between, ILike, Connection, In } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
  HistoricoSolicitacao,
  ProcessoJudicial,
  DeterminacaoJudicial,
  StatusPendencia,
  Pendencia,
} from '../../../entities';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { VincularProcessoJudicialDto } from '../dto/vincular-processo-judicial.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { VincularDeterminacaoJudicialDto } from '../dto/vincular-determinacao-judicial.dto';
import { ConverterPapelDto } from '../dto/converter-papel.dto';
import { ProcessoJudicialRepository } from '../../judicial/repositories/processo-judicial.repository';
import { ROLES } from '../../../shared/constants/roles.constants';
import { ValidacaoExclusividadeService } from './validacao-exclusividade.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';

/**
 * Serviço de Solicitações
 *
 * Responsável pela lógica de negócio relacionada às solicitações de benefícios
 */
@Injectable()
export class SolicitacaoService {
  private readonly logger = new Logger(SolicitacaoService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    @InjectRepository(HistoricoSolicitacao)
    private historicoRepository: Repository<HistoricoSolicitacao>,

    @InjectRepository(Pendencia)
    private pendenciaRepository: Repository<Pendencia>,

    private processoJudicialRepository: ProcessoJudicialRepository,

    @InjectRepository(DeterminacaoJudicial)
    private determinacaoJudicialRepository: Repository<DeterminacaoJudicial>,

    private connection: Connection,

    @Inject(forwardRef(() => ValidacaoExclusividadeService))
    private validacaoExclusividadeService: ValidacaoExclusividadeService,

    @Inject(forwardRef(() => CidadaoService))
    private cidadaoService: CidadaoService,
  ) {}

  /**
   * Lista todas as solicitações com paginação e filtros
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: StatusSolicitacao;
    unidade_id?: string;
    beneficio_id?: string;
    protocolo?: string;
    data_inicio?: string;
    data_fim?: string;
    user: any;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      unidade_id,
      beneficio_id,
      protocolo,
      data_inicio,
      data_fim,
      user,
    } = options;

    const queryBuilder =
      this.solicitacaoRepository.createQueryBuilder('solicitacao');

    // Joins necessários
    queryBuilder
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
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
        // Dados básicos da unidade
        'unidade.id',
        'unidade.nome',
        // Dados dos documentos
        'documentos.id',
        'documentos.tipo',
        'documentos.nome_original',
        'documentos.verificado',
        'documentos.data_upload',
      ]);

    // Aplicar filtros
    if (status) {
      queryBuilder.andWhere('solicitacao.status = :status', { status });
    }

    // Filtro por unidade com verificação de permissão
    if (unidade_id) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id,
      });
    } else if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
      // Usuários que não são admin ou gestor SEMTAS só podem ver solicitações da sua unidade
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id: user.unidade_id,
      });
    }

    if (beneficio_id) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :beneficio_id', {
        beneficio_id,
      });
    }

    if (protocolo) {
      queryBuilder.andWhere('solicitacao.protocolo ILIKE :protocolo', {
        protocolo: `%${protocolo}%`,
      });
    }

    // Filtro por período
    if (data_inicio && data_fim) {
      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      queryBuilder.andWhere(
        'solicitacao.data_abertura BETWEEN :inicio AND :fim',
        {
          inicio,
          fim,
        },
      );
    } else if (data_inicio) {
      const inicio = new Date(data_inicio);
      queryBuilder.andWhere('solicitacao.data_abertura >= :inicio', { inicio });
    } else if (data_fim) {
      const fim = new Date(data_fim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
      queryBuilder.andWhere('solicitacao.data_abertura <= :fim', { fim });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação padrão
    queryBuilder.orderBy('solicitacao.data_abertura', 'DESC');

    // Executar consulta
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma solicitação pelo ID
   */
  async findById(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .leftJoinAndSelect('solicitacao.documentos', 'documentos')
      .select([
        // Dados básicos da solicitação
        'solicitacao.id',
        'solicitacao.protocolo',
        'solicitacao.status',
        'solicitacao.parecer_semtas',
        'solicitacao.dados_complementares',
        'solicitacao.data_abertura',
        'solicitacao.observacoes',
        // Dados básicos do beneficiário
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
        'beneficiario.telefone',
        'beneficiario.email',

        // Dados básicos do benefício
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.descricao',
        'tipo_beneficio.codigo',
        'tipo_beneficio.valor',

        // Dados básicos do técnico
        'tecnico.id',
        'tecnico.nome',
        
        // Dados básicos da unidade
        'unidade.id',
        'unidade.nome',
        'unidade.sigla',
      ])
      .where('solicitacao.id = :id', { id })
      .getOne();

    if (!solicitacao) {
      throwSolicitacaoNotFound(id);
    }

    return solicitacao;
  }

  /**
   * Cria uma nova solicitação
   */
  async create(
    createSolicitacaoDto: CreateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    // Validar se o beneficiário existe
    try {
      await this.cidadaoService.findById(createSolicitacaoDto.beneficiario_id, false);
    } catch (error) {
      if (error.status === 404) {
        throw new BadRequestException('Beneficiário não encontrado');
      }
      throw error;
    }

    // Validar se o solicitante existe (quando informado)
    if (createSolicitacaoDto.solicitante_id) {
      try {
        await this.cidadaoService.findById(createSolicitacaoDto.solicitante_id, false);
      } catch (error) {
        if (error.status === 404) {
          throw new BadRequestException('Solicitante não encontrado');
        }
        throw error;
      }
    }

    // Validar exclusividade de papel para o beneficiário
    await this.validacaoExclusividadeService.validarExclusividadeBeneficiario(
      createSolicitacaoDto.beneficiario_id,
    );

    return this.connection.transaction(async (manager) => {
      // Criar uma nova instância de Solicitacao
      const solicitacao = new Solicitacao();

      // Determinar a unidade: se usuário não tem unidade, usar do DTO (obrigatório)
      let unidadeId: string;
      if (!user.unidade_id) {
        if (!createSolicitacaoDto.unidade_id) {
          throwWorkflowStepRequired(
            'unidade_id',
            { data: { context: 'unidade_validation' } }
          );
        }
        unidadeId = createSolicitacaoDto.unidade_id;
      } else {
        unidadeId = user.unidade_id;
      }

      // Preencher os dados básicos
      solicitacao.beneficiario_id = createSolicitacaoDto.beneficiario_id;
      solicitacao.solicitante_id = createSolicitacaoDto.solicitante_id;
      solicitacao.tipo_beneficio_id = createSolicitacaoDto.tipo_beneficio_id;
      solicitacao.unidade_id = unidadeId;
      solicitacao.tecnico_id = user.id;
      solicitacao.status = StatusSolicitacao.RASCUNHO;
      solicitacao.data_abertura = new Date();

      // Validar que solicitante não pode ser o mesmo que beneficiário
      if (createSolicitacaoDto.solicitante_id && 
          createSolicitacaoDto.solicitante_id === createSolicitacaoDto.beneficiario_id) {
        throw new BadRequestException('Solicitante não pode ser o mesmo que o beneficiário');
      }

      // Verificar se já existe uma solicitação em andamento para o mesmo cidadão e tipo de benefício
      const statusEmAndamento = [
        StatusSolicitacao.RASCUNHO,
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.PENDENTE,
        StatusSolicitacao.EM_ANALISE,
        StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
        StatusSolicitacao.APROVADA,
        StatusSolicitacao.LIBERADA,
        StatusSolicitacao.EM_PROCESSAMENTO
      ];

      const solicitacaoExistente = await manager.findOne(Solicitacao, {
        where: {
          beneficiario_id: createSolicitacaoDto.beneficiario_id,
          tipo_beneficio_id: createSolicitacaoDto.tipo_beneficio_id,
          status: In(statusEmAndamento)
        }
      });

      if (solicitacaoExistente) {
        throw new BadRequestException(
          'Já existe uma solicitação em andamento para este benefício e cidadão'
        );
      }

      // Normalizar enums nos dados complementares antes de salvar
      const dadosComplementares =
        createSolicitacaoDto.dados_complementares || {};
      solicitacao.dados_complementares =
        normalizeEnumFields(dadosComplementares);

      // Salvar a solicitação
      const savedSolicitacao = await manager.save(solicitacao);

      // Registrar no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = savedSolicitacao.id;
      historico.usuario_id = user.id;
      historico.status_atual = StatusSolicitacao.RASCUNHO;
      historico.observacao = 'Solicitação criada';
      historico.dados_alterados = { acao: 'criacao' };
      historico.ip_usuario = user.ip || '0.0.0.0';

      await manager.save(historico);

      // Buscar a solicitação criada dentro da transação com relações básicas
      const solicitacaoCompleta = await manager
        .createQueryBuilder(Solicitacao, 'solicitacao')
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
        .where('solicitacao.id = :id', { id: savedSolicitacao.id })
        .getOne();

      if (!solicitacaoCompleta) {
        throwSolicitacaoNotFound(savedSolicitacao.id);
      }

      return solicitacaoCompleta;
    });
  }

  /**
   * Atualiza uma solicitação existente
   */
  async update(
    id: string,
    updateSolicitacaoDto: UpdateSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Check if request status allows editing based on business rules
      const EDITABLE_STATUSES = [
        StatusSolicitacao.ABERTA,
        StatusSolicitacao.PENDENTE,
      ];

      if (!EDITABLE_STATUSES.includes(solicitacao.status)) {
        throwInvalidStatusTransition(
          solicitacao.status,
          'EDITABLE',
          {
            data: {
              solicitacaoId: id,
              statusAtual: solicitacao.status,
              statusPossiveis: EDITABLE_STATUSES,
            },
          },
        );
      }

      // Atualizar os dados
      // Nota: beneficiario_id não pode ser atualizado conforme definido no DTO

      if (updateSolicitacaoDto.tipo_beneficio_id) {
        solicitacao.tipo_beneficio_id = updateSolicitacaoDto.tipo_beneficio_id;
      }

      if (updateSolicitacaoDto.dados_complementares) {
        // Normalizar enums nos dados complementares antes de salvar
        solicitacao.dados_complementares = normalizeEnumFields(
          updateSolicitacaoDto.dados_complementares,
        );
      }

      // Salvar a solicitação
      await manager.save(solicitacao);

      // Registrar no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = id;
      historico.usuario_id = user.id;
      historico.status_anterior = solicitacao.status;
      historico.status_atual = solicitacao.status;
      historico.observacao = 'Solicitação atualizada';
      historico.dados_alterados = {
        campos_alterados: Object.keys(updateSolicitacaoDto),
      };
      historico.ip_usuario = user.ip || '0.0.0.0';

      await manager.save(historico);

      return this.findById(id);
    });
  }

  /**
   * Submete uma solicitação para análise
   */
  async submeterSolicitacao(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se a solicitação está em estado que permite submissão
      if (solicitacao.status !== StatusSolicitacao.RASCUNHO) {
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

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.EM_ANALISE,
        user.id,
        'Solicitação submetida para análise',
        user.ip || '0.0.0.0',
      );

      await manager.save(solicitacao);

      // Register in history
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = id;
      historico.usuario_id = user.id;
      historico.status_anterior = StatusSolicitacao.RASCUNHO;
      historico.status_atual = solicitacao.status;
      historico.observacao = 'Solicitação submetida para análise';
      historico.dados_alterados = {
        campos_alterados: Object.keys(UpdateSolicitacaoDto),
      };
      historico.ip_usuario = user.ip || '0.0.0.0';

      await manager.save(historico);

      return this.findById(id);
    });
  }

  /**
   * Avalia uma solicitação (aprovar/pendenciar)
   */
  async avaliarSolicitacao(
    id: string,
    avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    user: any,
  ): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se a solicitação está em estado que permite avaliação
      if (
        solicitacao.status !== StatusSolicitacao.PENDENTE &&
        solicitacao.status !== StatusSolicitacao.EM_ANALISE
      ) {
        throwInvalidStatusTransition(
          solicitacao.status,
          'AVALIACAO',
          {
            data: {
              solicitacaoId: id,
              statusesPermitidos: [StatusSolicitacao.PENDENTE, StatusSolicitacao.EM_ANALISE],
            },
          },
        );
      }

      // Determinar o novo status
      const novoStatus = avaliarSolicitacaoDto.aprovado
        ? StatusSolicitacao.APROVADA
        : StatusSolicitacao.AGUARDANDO_DOCUMENTOS;

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        novoStatus,
        user.id,
        avaliarSolicitacaoDto.parecer,
        user.ip || '0.0.0.0',
      );

      if (avaliarSolicitacaoDto.aprovado) {
        solicitacao.aprovador_id = user.id;
        solicitacao.data_aprovacao = new Date();
        solicitacao.parecer_semtas = avaliarSolicitacaoDto.parecer;
      } else {
        // Registrar pendências
        if (
          avaliarSolicitacaoDto.pendencias &&
          avaliarSolicitacaoDto.pendencias.length > 0
        ) {
          for (const descricaoTexto of avaliarSolicitacaoDto.pendencias) {
            // Criar uma nova instância de Pendencia diretamente para evitar problemas de tipagem
            const pendencia = new Pendencia();
            pendencia.solicitacao_id = id;
            pendencia.descricao = descricaoTexto;
            pendencia.status = StatusPendencia.ABERTA;
            pendencia.registrado_por_id = user.id; // Usando registrado_por_id conforme definido na entidade

            await manager.save(pendencia);
          }
        }
      }

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Libera um benefício aprovado
   */
  async liberarBeneficio(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![ROLES.ADMIN, ROLES.GESTOR].includes(user.role)) {
        throwAccessDenied(
          id,
          user.id,
          {
            data: {
              acao: 'liberar_beneficio',
              roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR],
              roleAtual: user.role,
            },
          },
        );
      }

      // Verificar se a solicitação está aprovada
      if (solicitacao.status !== StatusSolicitacao.APROVADA) {
        throwInvalidStatusTransition(
          solicitacao.status,
          StatusSolicitacao.LIBERADA,
          {
            data: {
              solicitacaoId: id,
              statusNecessario: StatusSolicitacao.APROVADA,
            },
          },
        );
      }

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.LIBERADA,
        user.id,
        'Benefício liberado para pagamento/entrega',
        user.ip || '0.0.0.0',
      );
      solicitacao.liberador_id = user.id;
      solicitacao.data_liberacao = new Date();

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
  }

  /**
   * Cancela uma solicitação
   */
  async cancelarSolicitacao(id: string, user: any): Promise<Solicitacao> {
    return this.connection.transaction(async (manager) => {
      // Buscar a solicitação
      const solicitacao = await this.findById(id);

      // Verificar se o usuário tem permissão
      if (![ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO].includes(user.role)) {
        throwAccessDenied(
          id,
          user.id,
          {
            data: {
              acao: 'cancelar_solicitacao',
              roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO],
              roleAtual: user.role,
            },
          },
        );
      }

      // Verificar se a solicitação pode ser cancelada
      if (solicitacao.status === StatusSolicitacao.LIBERADA) {
        throwSolicitacaoCannotDelete(
          id,
          solicitacao.status,
          {
            data: {
              motivo: 'Solicitação já liberada não pode ser cancelada',
            },
          },
        );
      }

      // Atualizar o status usando o método preparar
      solicitacao.prepararAlteracaoStatus(
        StatusSolicitacao.CANCELADA,
        user.id,
        'Solicitação cancelada pelo usuário',
        user.ip || '0.0.0.0',
      );

      // Salvar a solicitação com o manager da transação
      await manager.save(solicitacao);

      // Não é mais necessário registrar manualmente no histórico
      // O método logStatusChange fará isso automaticamente através do listener @AfterUpdate

      return this.findById(id);
    });
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
          throwProcessoJudicialNotFound(
            vincularDto.processo_judicial_id,
            {
              data: {
                solicitacaoId,
              },
            },
          );
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
        throwInternalError(
          'Erro ao vincular processo judicial à solicitação',
          {
            data: {
              solicitacaoId,
              processoJudicialId: vincularDto.processo_judicial_id,
              errorMessage: error.message,
            },
          },
        );
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
          throwAccessDenied(
            solicitacaoId,
            user.id,
            {
              data: {
                acao: 'desvincular_processo_judicial',
                roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR],
                roleAtual: user.role,
              },
            },
          );
        }

        // Verificar se a solicitação tem processo vinculado
        if (!solicitacao.processo_judicial_id) {
          throwProcessoJudicialNotLinked(
            solicitacaoId,
            {
              data: {
                motivo: 'Solicitação não possui processo judicial vinculado',
              },
            },
          );
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
          throwAccessDenied(
            solicitacaoId,
            user.id,
            {
              data: {
                acao: 'vincular_determinacao_judicial',
                roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO],
                roleAtual: user.role,
              },
            },
          );
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

  /**
   * Desvincula uma determinação judicial de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param user Usuário que está realizando a operação
   * @returns Solicitação atualizada
   */
  /**
   * Converte um cidadão da composição familiar para beneficiário principal de uma nova solicitação
   * @param converterPapelDto Dados para conversão de papel
   * @param user Usuário que está realizando a operação
   * @returns Nova solicitação criada
   */
  async converterPapel(
    converterPapelDto: ConverterPapelDto,
    user: any,
  ): Promise<Solicitacao> {
    this.logger.log(
      `Iniciando conversão de papel para cidadão ${converterPapelDto.cidadao_id}`,
    );

    return this.connection.transaction(async (manager) => {
      try {
        // Buscar a solicitação de origem
        const solicitacaoOrigem = await this.findById(
          converterPapelDto.solicitacao_origem_id,
        );

        if (!solicitacaoOrigem) {
          throwSolicitacaoNotFound(
            converterPapelDto.solicitacao_origem_id,
            {
              data: {
                contexto: 'conversao_papel',
              },
            },
          );
        }

        // Verificar se o cidadão está na composição familiar da solicitação
        const composicaoFamiliar =
          solicitacaoOrigem.dados_complementares?.composicao_familiar || [];
        const membroIndex = composicaoFamiliar.findIndex(
          (membro) => membro.cidadao_id === converterPapelDto.cidadao_id,
        );

        if (membroIndex === -1) {
          throwCidadaoNotInComposicaoFamiliar(
            converterPapelDto.cidadao_id,
            converterPapelDto.solicitacao_origem_id,
            {
              data: {
                contexto: 'conversao_papel',
              },
            },
          );
        }

        // Obter o membro e remover da composição familiar
        const membro = { ...composicaoFamiliar[membroIndex] };
        composicaoFamiliar.splice(membroIndex, 1);

        // Atualizar a solicitação de origem com a nova composição familiar
        solicitacaoOrigem.dados_complementares = {
          ...solicitacaoOrigem.dados_complementares,
          composicao_familiar: composicaoFamiliar,
        };

        await manager.save(solicitacaoOrigem);

        // Criar uma nova solicitação com o cidadão como beneficiário principal
        const novaSolicitacao = new Solicitacao();
        novaSolicitacao.beneficiario_id = converterPapelDto.cidadao_id;
        novaSolicitacao.tipo_beneficio_id = converterPapelDto.tipo_beneficio_id;
        novaSolicitacao.unidade_id = converterPapelDto.unidade_id;
        novaSolicitacao.tecnico_id = user.id;
        novaSolicitacao.status = StatusSolicitacao.RASCUNHO;
        novaSolicitacao.data_abertura = new Date();
        novaSolicitacao.solicitacao_original_id =
          converterPapelDto.solicitacao_origem_id;
        novaSolicitacao.dados_complementares =
          converterPapelDto.dados_complementares || {};

        // Adicionar observação sobre a conversão de papel
        novaSolicitacao.observacoes = `Solicitação criada a partir da conversão de papel. Justificativa: ${converterPapelDto.justificativa}`;

        await manager.save(novaSolicitacao);

        // Registrar no histórico da solicitação de origem
        const historicoOrigem = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: solicitacaoOrigem.id,
            status_anterior: solicitacaoOrigem.status,
            status_atual: solicitacaoOrigem.status,
            usuario_id: user.id,
            observacao: `Cidadão removido da composição familiar para se tornar beneficiário principal em nova solicitação (${novaSolicitacao.protocolo})`,
            dados_alterados: {
              composicao_familiar: {
                acao: 'remocao_membro',
                cidadao_id: converterPapelDto.cidadao_id,
                nova_solicitacao_id: novaSolicitacao.id,
                nova_solicitacao_protocolo: novaSolicitacao.protocolo,
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        await manager.save(historicoOrigem);

        // Registrar no histórico da nova solicitação
        const historicoNova = this.historicoRepository.create(
          normalizeEnumFields({
            solicitacao_id: novaSolicitacao.id,
            status_anterior: StatusSolicitacao.RASCUNHO,
            status_atual: StatusSolicitacao.RASCUNHO,
            usuario_id: user.id,
            observacao: `Solicitação criada a partir da conversão de papel do cidadão que estava na composição familiar da solicitação ${solicitacaoOrigem.protocolo}`,
            dados_alterados: {
              conversao_papel: {
                solicitacao_origem_id: solicitacaoOrigem.id,
                solicitacao_origem_protocolo: solicitacaoOrigem.protocolo,
                justificativa: converterPapelDto.justificativa,
              },
            },
            ip_usuario: user.ip || '0.0.0.0',
          }),
        );

        await manager.save(historicoNova);

        this.logger.log(
          `Conversão de papel concluída com sucesso. Nova solicitação: ${novaSolicitacao.id}`,
        );

        return this.findById(novaSolicitacao.id);
      } catch (error) {
        // Se for um erro do catálogo, relançar
        if (error.name === 'AppError') {
          throw error;
        }

        this.logger.error(
          `Erro ao converter papel do cidadão: ${error.message}`,
          error.stack,
        );
        throwInternalError(
          'Erro ao converter papel do cidadão para beneficiário principal',
          {
            data: {
              cidadaoId: converterPapelDto.cidadao_id,
              solicitacaoOrigemId: converterPapelDto.solicitacao_origem_id,
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
          throwAccessDenied(
            solicitacaoId,
            user.id,
            {
              data: {
                acao: 'desvincular_determinacao_judicial',
                roleNecessaria: [ROLES.ADMIN, ROLES.GESTOR],
                roleAtual: user.role,
              },
            },
          );
        }

        // Verificar se a solicitação tem determinação vinculada
        if (!solicitacao.determinacao_judicial_id) {
          throwDeterminacaoJudicialNotLinked(
            solicitacaoId,
            {
              data: {
                motivo: 'Solicitação não possui determinação judicial vinculada',
              },
            },
          );
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
}
