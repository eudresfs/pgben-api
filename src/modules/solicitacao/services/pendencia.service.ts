import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Pendencia, StatusPendencia } from '../../../entities/pendencia.entity';
import { Solicitacao, StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import {
  CreatePendenciaDto,
  ResolverPendenciaDto,
  CancelarPendenciaDto,
  FiltrosPendenciaDto,
  PendenciaResponseDto,
} from '../dto/pendencia';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { EventosService } from './eventos.service';
import { NotificacaoService } from './notificacao.service';
import { PermissionService } from '../../../auth/services/permission.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { SolicitacaoEventType } from '../events/solicitacao-events';

/**
 * Service centralizado para gestão de pendências
 *
 * Responsável por todas as operações relacionadas a pendências de solicitações
 */
@Injectable()
export class PendenciaService {
  constructor(
    @InjectRepository(Pendencia)
    private readonly pendenciaRepository: Repository<Pendencia>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
    private readonly eventosService: EventosService,
    private readonly notificacaoService: NotificacaoService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Cria uma nova pendência
   */
  async criarPendencia(
    createPendenciaDto: CreatePendenciaDto,
    usuarioId: string,
  ): Promise<PendenciaResponseDto> {
    // Verificar se a solicitação existe
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: createPendenciaDto.solicitacao_id },
      relations: ['beneficiario'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verificar se a solicitação está com status em_analise
    if (solicitacao.status !== StatusSolicitacao.EM_ANALISE) {
      throw new BadRequestException(
        'Só é possível criar pendência para solicitações com status "em análise"'
      );
    }

    // Verificar se o prazo de resolução é maior que a data atual
    if (createPendenciaDto.prazo_resolucao) {
      const prazoResolucao = new Date(createPendenciaDto.prazo_resolucao);
      const agora = new Date();
      
      if (prazoResolucao <= agora) {
        throw new BadRequestException(
          'O prazo de resolução deve ser maior que a data atual'
        );
      }
    }

    // Verificar se o usuário existe
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Criar a pendência
    const pendencia = this.pendenciaRepository.create({
      solicitacao_id: createPendenciaDto.solicitacao_id,
      descricao: createPendenciaDto.descricao,
      registrado_por_id: usuarioId,
      prazo_resolucao: createPendenciaDto.prazo_resolucao
        ? new Date(createPendenciaDto.prazo_resolucao)
        : null,
      status: StatusPendencia.ABERTA,
    });

    const pendenciaSalva = await this.pendenciaRepository.save(pendencia);

    // Alterar status da solicitação para PENDENTE
    solicitacao.status = StatusSolicitacao.PENDENTE;
    await this.solicitacaoRepository.save(solicitacao);

    // Emitir evento
    await this.eventosService.emitirEvento({
      type: SolicitacaoEventType.PENDENCY_CREATED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        pendenciaId: pendenciaSalva.id,
        descricao: createPendenciaDto.descricao,
        prazo: createPendenciaDto.prazo_resolucao ? new Date(createPendenciaDto.prazo_resolucao) : undefined,
        usuarioId: usuarioId,
      },
    });

    // Registrar auditoria
    const logDto = new CreateLogAuditoriaDto();
    logDto.tipo_operacao = TipoOperacao.CREATE;
    logDto.entidade_afetada = 'Pendencia';
    logDto.entidade_id = pendenciaSalva.id;
    logDto.usuario_id = usuarioId;
    logDto.dados_novos = pendenciaSalva;
    logDto.descricao = `Pendência criada: ${createPendenciaDto.descricao}`;
    await this.auditoriaService.criarLog(logDto);

    // Enviar notificação
    await this.notificacaoService.notificarPendenciaCriada(
      pendenciaSalva,
      solicitacao,
      usuario,
    );

    // Buscar a pendência com os relacionamentos necessários
    const pendenciaCompleta = await this.pendenciaRepository.findOne({
      where: { id: pendenciaSalva.id },
      relations: ['registrado_por', 'resolvido_por'],
    });

    if (!pendenciaCompleta) {
      throw new NotFoundException('Erro ao buscar pendência criada');
    }

    return plainToClass(PendenciaResponseDto, pendenciaCompleta, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Resolve uma pendência
   */
  async resolverPendencia(
    pendenciaId: string,
    resolverPendenciaDto: ResolverPendenciaDto,
    usuarioId: string,
  ): Promise<PendenciaResponseDto> {
    const pendencia = await this.pendenciaRepository.findOne({
      where: { id: pendenciaId },
      relations: ['solicitacao', 'registrado_por', 'resolvido_por'],
    });

    if (!pendencia) {
      throw new NotFoundException('Pendência não encontrada');
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new BadRequestException('Apenas pendências abertas podem ser resolvidas');
    }

    // TODO: Implementar verificação de permissões específicas para solicitação
    // Por enquanto, a verificação é feita pelo PermissionGuard no controller

    // Verificar se o usuário existe
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const dadosAnteriores = { ...pendencia };

    // Atualizar a pendência
    pendencia.status = StatusPendencia.RESOLVIDA;
    pendencia.resolvido_por_id = usuarioId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao = resolverPendenciaDto.observacao_resolucao || null;

    const pendenciaAtualizada = await this.pendenciaRepository.save(pendencia);

    // Verificar se todas as pendências da solicitação foram sanadas
    const todasPendenciasSanadas = await this.verificarTodasPendenciasSanadas(pendencia.solicitacao_id);
    
    // Alterar status da solicitação para EM_ANALISE apenas se todas as pendências foram sanadas
    if (todasPendenciasSanadas) {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: pendencia.solicitacao_id },
      });
      
      if (solicitacao) {
        solicitacao.status = StatusSolicitacao.EM_ANALISE;
        await this.solicitacaoRepository.save(solicitacao);
      }
    }

    // Registrar evento
    await this.eventosService.emitirEvento({
      type: SolicitacaoEventType.PENDENCY_RESOLVED,
      solicitacaoId: pendencia.solicitacao_id,
      timestamp: new Date(),
      data: {
        pendenciaId: pendencia.id,
        resolucao: resolverPendenciaDto.resolucao,
        usuarioId: usuarioId,
        dataResolucao: new Date(),
      },
    });

    // Registrar auditoria
    const logDto = new CreateLogAuditoriaDto();
    logDto.tipo_operacao = TipoOperacao.UPDATE;
    logDto.entidade_afetada = 'Pendencia';
    logDto.entidade_id = pendencia.id;
    logDto.usuario_id = usuarioId;
    logDto.dados_anteriores = dadosAnteriores;
    logDto.dados_novos = pendenciaAtualizada;
    logDto.descricao = `Pendência resolvida: ${resolverPendenciaDto.resolucao}`;
    await this.auditoriaService.criarLog(logDto);

    // Enviar notificação
    await this.notificacaoService.notificarPendenciaResolvida(
      pendenciaAtualizada,
      pendencia.solicitacao,
      usuario,
    );

    return this.buscarPorId(pendencia.id);
  }

  /**
   * Cancela uma pendência
   */
  async cancelarPendencia(
    pendenciaId: string,
    cancelarPendenciaDto: CancelarPendenciaDto,
    usuarioId: string,
  ): Promise<PendenciaResponseDto> {
    const pendencia = await this.pendenciaRepository.findOne({
      where: { id: pendenciaId },
      relations: ['solicitacao', 'registrado_por', 'resolvido_por'],
    });

    if (!pendencia) {
      throw new NotFoundException('Pendência não encontrada');
    }

    if (pendencia.status !== StatusPendencia.ABERTA) {
      throw new BadRequestException('Apenas pendências abertas podem ser canceladas');
    }

    // Verificar permissões
    await this.permissionService.verificarPermissaoSolicitacao(
      usuarioId,
      pendencia.solicitacao_id,
      'cancelar_pendencia',
    );

    // Verificar se o usuário existe
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const dadosAnteriores = { ...pendencia };

    // Atualizar a pendência
    pendencia.status = StatusPendencia.CANCELADA;
    pendencia.resolvido_por_id = usuarioId;
    pendencia.data_resolucao = new Date();
    pendencia.observacao_resolucao = `Cancelada: ${cancelarPendenciaDto.motivo_cancelamento}`;

    if (cancelarPendenciaDto.observacao_cancelamento) {
      pendencia.observacao_resolucao += ` | ${cancelarPendenciaDto.observacao_cancelamento}`;
    }

    const pendenciaAtualizada = await this.pendenciaRepository.save(pendencia);

    // Verificar se todas as pendências da solicitação foram sanadas
    const todasPendenciasSanadas = await this.verificarTodasPendenciasSanadas(pendencia.solicitacao_id);
    
    // Alterar status da solicitação para EM_ANALISE apenas se todas as pendências foram sanadas
    if (todasPendenciasSanadas) {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: pendencia.solicitacao_id },
      });
      
      if (solicitacao) {
        solicitacao.status = StatusSolicitacao.EM_ANALISE;
        await this.solicitacaoRepository.save(solicitacao);
      }
    }

    // Registrar evento
    await this.eventosService.emitirEvento({
      type: SolicitacaoEventType.PENDENCY_CANCELLED,
      solicitacaoId: pendencia.solicitacao_id,
      timestamp: new Date(),
      data: {
        pendenciaId: pendencia.id,
        motivo: cancelarPendenciaDto.motivo_cancelamento,
        usuarioId: usuarioId,
      },
    });

    // Registrar auditoria
    const logDto = new CreateLogAuditoriaDto();
    logDto.tipo_operacao = TipoOperacao.UPDATE;
    logDto.entidade_afetada = 'Pendencia';
    logDto.entidade_id = pendencia.id;
    logDto.usuario_id = usuarioId;
    logDto.dados_anteriores = dadosAnteriores;
    logDto.dados_novos = pendenciaAtualizada;
    logDto.descricao = `Pendência cancelada: ${cancelarPendenciaDto.motivo_cancelamento}`;
    await this.auditoriaService.criarLog(logDto);

    return this.buscarPorId(pendencia.id);
  }

  /**
   * Busca uma pendência por ID
   */
  async buscarPorId(pendenciaId: string): Promise<PendenciaResponseDto> {
    const pendencia = await this.pendenciaRepository.findOne({
      where: { id: pendenciaId },
      relations: ['registrado_por', 'resolvido_por'],
    });

    if (!pendencia) {
      throw new NotFoundException('Pendência não encontrada');
    }

    return plainToClass(PendenciaResponseDto, pendencia, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Lista pendências com filtros e paginação
   */
  async listarPendencias(
    filtros: FiltrosPendenciaDto,
  ): Promise<PaginatedResponseDto<PendenciaResponseDto>> {
    // Aplicar filtros e retornar pendências paginadas
    
    const queryBuilder = this.criarQueryBuilder(false);

    // Aplicar filtros específicos
    this.aplicarFiltros(queryBuilder, filtros);

    // Aplicar ordenação
    this.aplicarOrdenacao(queryBuilder, filtros);

    // Executar consulta com paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    
    const [pendencias, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const pendenciasDto = pendencias.map((pendencia) =>
      plainToClass(PendenciaResponseDto, pendencia, {
        excludeExtraneousValues: true,
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return new PaginatedResponseDto(
      pendenciasDto,
      {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    );
  }

  /**
   * Lista pendências de uma solicitação específica
   */
  async listarPendenciasPorSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<PendenciaResponseDto[]> {
    const pendencias = await this.criarQueryBuilder()
      .where('pendencia.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .orderBy('pendencia.created_at', 'DESC')
      .getMany();

    return pendencias.map((pendencia) =>
      plainToClass(PendenciaResponseDto, pendencia, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Busca pendências vencidas
   */
  async buscarPendenciasVencidas(): Promise<PendenciaResponseDto[]> {
    const agora = new Date();
    
    const pendencias = await this.criarQueryBuilder(true)
      .where('pendencia.status = :status', { status: StatusPendencia.ABERTA })
      .andWhere('pendencia.prazo_resolucao < :agora', { agora })
      .orderBy('pendencia.prazo_resolucao', 'ASC')
      .getMany();

    return pendencias.map((pendencia) =>
      plainToClass(PendenciaResponseDto, pendencia, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Verifica se todas as pendências de uma solicitação foram sanadas
   */
  private async verificarTodasPendenciasSanadas(solicitacaoId: string): Promise<boolean> {
    const pendenciasAbertas = await this.pendenciaRepository.count({
      where: {
        solicitacao_id: solicitacaoId,
        status: StatusPendencia.ABERTA,
      },
    });

    return pendenciasAbertas === 0;
  }

  /**
   * Cria um QueryBuilder otimizado para consultas de pendências
   */
  private criarQueryBuilder(incluirSolicitacao = false): SelectQueryBuilder<Pendencia> {
    const queryBuilder = this.pendenciaRepository
      .createQueryBuilder('pendencia')
      .leftJoinAndSelect('pendencia.registrado_por', 'registrado_por')
      .leftJoinAndSelect('pendencia.resolvido_por', 'resolvido_por');

    if (incluirSolicitacao) {
      queryBuilder.leftJoinAndSelect('pendencia.solicitacao', 'solicitacao');
    }

    return queryBuilder;
  }

  /**
   * Aplica filtros ao QueryBuilder
   */
  private aplicarFiltros(
    queryBuilder: SelectQueryBuilder<Pendencia>,
    filtros: FiltrosPendenciaDto,
  ): void {
    if (filtros.solicitacao_id) {
      queryBuilder.andWhere('pendencia.solicitacao_id = :solicitacao_id', {
        solicitacao_id: filtros.solicitacao_id,
      });
    }

    if (filtros.status) {
      queryBuilder.andWhere('pendencia.status = :status', {
        status: filtros.status,
      });
    }

    if (filtros.status_list && filtros.status_list.length > 0) {
      queryBuilder.andWhere('pendencia.status IN (:...status_list)', {
        status_list: filtros.status_list,
      });
    }

    if (filtros.registrado_por_id) {
      queryBuilder.andWhere('pendencia.registrado_por_id = :registradoPorId', {
        registradoPorId: filtros.registrado_por_id,
      });
    }

    if (filtros.resolvido_por_id) {
      queryBuilder.andWhere('pendencia.resolvido_por_id = :resolvidoPorId', {
        resolvidoPorId: filtros.resolvido_por_id,
      });
    }

    if (filtros.data_criacao_inicio) {
      queryBuilder.andWhere('pendencia.created_at >= :dataCriacaoInicio', {
        dataCriacaoInicio: new Date(filtros.data_criacao_inicio),
      });
    }

    if (filtros.data_criacao_fim) {
      const dataFim = new Date(filtros.data_criacao_fim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pendencia.created_at <= :dataCriacaoFim', {
        dataCriacaoFim: dataFim,
      });
    }

    if (filtros.data_resolucao_inicio) {
      queryBuilder.andWhere('pendencia.data_resolucao >= :dataResolucaoInicio', {
        dataResolucaoInicio: new Date(filtros.data_resolucao_inicio),
      });
    }

    if (filtros.data_resolucao_fim) {
      const dataFim = new Date(filtros.data_resolucao_fim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('pendencia.data_resolucao <= :dataResolucaoFim', {
        dataResolucaoFim: dataFim,
      });
    }

    if (filtros.prazo_resolucao_inicio) {
      queryBuilder.andWhere('pendencia.prazo_resolucao >= :prazoResolucaoInicio', {
        prazoResolucaoInicio: new Date(filtros.prazo_resolucao_inicio),
      });
    }

    if (filtros.prazo_resolucao_fim) {
      queryBuilder.andWhere('pendencia.prazo_resolucao <= :prazoResolucaoFim', {
        prazoResolucaoFim: new Date(filtros.prazo_resolucao_fim),
      });
    }

    if (filtros.busca_descricao) {
      queryBuilder.andWhere('pendencia.descricao ILIKE :buscaDescricao', {
        buscaDescricao: `%${filtros.busca_descricao}%`,
      });
    }

    if (filtros.apenas_vencidas) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      queryBuilder
        .andWhere('pendencia.status = :statusAberta', {
          statusAberta: StatusPendencia.ABERTA,
        })
        .andWhere('pendencia.prazo_resolucao IS NOT NULL')
        .andWhere('pendencia.prazo_resolucao < :hoje', { hoje });
    }

    if (filtros.proximas_vencimento) {
      const hoje = new Date();
      const seteDias = new Date();
      seteDias.setDate(hoje.getDate() + 7);
      
      hoje.setHours(0, 0, 0, 0);
      seteDias.setHours(23, 59, 59, 999);
      
      queryBuilder
        .andWhere('pendencia.status = :statusAberta', {
          statusAberta: StatusPendencia.ABERTA,
        })
        .andWhere('pendencia.prazo_resolucao IS NOT NULL')
        .andWhere('pendencia.prazo_resolucao >= :hoje', { hoje })
        .andWhere('pendencia.prazo_resolucao <= :seteDias', { seteDias });
    }
  }

  /**
   * Aplica ordenação à consulta
   */
  private aplicarOrdenacao(
    queryBuilder: SelectQueryBuilder<Pendencia>,
    filtros: FiltrosPendenciaDto,
  ): void {
    const campoOrdenacao = filtros.sort_by || 'created_at';
    const direcaoOrdenacao = filtros.sort_order || 'DESC';

    // Mapear campos para evitar SQL injection
    const camposPermitidos = {
      created_at: 'pendencia.created_at',
      updated_at: 'pendencia.updated_at',
      status: 'pendencia.status',
      prazo_resolucao: 'pendencia.prazo_resolucao',
      data_resolucao: 'pendencia.data_resolucao',
    };

    const campoFinal = camposPermitidos[campoOrdenacao] || 'pendencia.created_at';
    queryBuilder.orderBy(campoFinal, direcaoOrdenacao as 'ASC' | 'DESC');

    // Ordenação secundária por data de criação
    if (campoOrdenacao !== 'created_at') {
      queryBuilder.addOrderBy('pendencia.created_at', 'DESC');
    }
  }
}