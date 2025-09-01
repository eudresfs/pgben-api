import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackAnexo } from '../entities/feedback-anexo.entity';
import { Tag } from '../entities/tag.entity';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { TagService } from './tag.service';
import { FileUploadService } from './file-upload.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import {
  FeedbackResponseDto,
  FeedbackResumoResponseDto,
  FeedbackAnexoResponseDto
} from '../dto/feedback-response.dto';
import { TipoFeedbackEnum, PrioridadeFeedbackEnum } from '../enums';

/**
 * Interface para filtros de busca
 */
interface FeedbackSearchFilters {
  tipo?: TipoFeedbackEnum;
  prioridade?: PrioridadeFeedbackEnum;
  lido?: boolean;
  resolvido?: boolean;
  usuario_id?: string;
  tag_ids?: string[];
  data_inicio?: Date;
  data_fim?: Date;
  busca?: string;
  page?: number;
  limit?: number;
}

/**
 * Interface para resposta paginada
 */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service principal para gerenciar feedbacks
 */
@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: FeedbackRepository,
    @InjectRepository(FeedbackAnexo)
    private readonly anexoRepository: Repository<FeedbackAnexo>,
    private readonly tagService: TagService,
    private readonly fileUploadService: FileUploadService
  ) {}

  /**
   * Cria um novo feedback
   */
  async create(
    createFeedbackDto: CreateFeedbackDto,
    files: Express.Multer.File[],
    userInfo: { id: string; ip?: string }
  ): Promise<FeedbackResponseDto> {
    const {
      tipo,
      titulo,
      descricao,
      prioridade,
      pagina_origem,
      versao_sistema,
      informacoes_tecnicas,
      tag_ids,
      novas_tags
    } = createFeedbackDto;

    // Validar tags existentes
    let tags: Tag[] = [];
    if (tag_ids && tag_ids.length > 0) {
      tags = await this.tagService.validateTagIds(tag_ids);
    }

    // Criar novas tags se fornecidas
    if (novas_tags && novas_tags.length > 0) {
      const normalizedNames = this.tagService.normalizeTagNames(novas_tags);
      const newTags = await this.tagService.findOrCreateTags(normalizedNames, 'feedback');
      tags = [...tags, ...newTags];
    }

    // Criar feedback
    const feedback = this.feedbackRepository.create({
      tipo,
      titulo,
      descricao,
      prioridade,
      pagina_origem,
      versao_sistema,
      informacoes_tecnicas,
      ip_origem: userInfo.ip,
      lido: false,
      resolvido: false,
      usuario_id: userInfo.id,
      tags
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Incrementar contador de uso das tags
    if (tags.length > 0) {
      await this.tagService.incrementarUsoTags(tags.map(tag => tag.id));
    }

    // Processar arquivos anexos
    const anexos: FeedbackAnexo[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const processedFile = await this.fileUploadService.processFile(file);
          const anexo = await this.fileUploadService.saveAnexo(
            processedFile,
            savedFeedback.id
          );
          anexos.push(anexo);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          // Continuar com outros arquivos em caso de erro
        }
      }
    }

    // Buscar feedback completo com relacionamentos
    const feedbackCompleto = await this.feedbackRepository.findByIdWithRelations(
      savedFeedback.id
    );

    return this.mapToResponseDto(feedbackCompleto!);
  }

  /**
   * Busca feedbacks com filtros e paginação
   */
  async findAll(
    filters: FeedbackSearchFilters
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { page = 1, limit = 20, ...searchFilters } = filters;
    
    const { feedbacks, total } = await this.feedbackRepository.findWithFilters(
      searchFilters,
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca um feedback por ID
   */
  async findOne(id: string, userId?: string): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackRepository.findByIdWithRelations(id);

    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    // Verificar permissão (usuário só pode ver seus próprios feedbacks)
    if (userId && feedback.usuario_id !== userId) {
      throw new ForbiddenException('Acesso negado a este feedback');
    }

    return this.mapToResponseDto(feedback);
  }

  /**
   * Marca um feedback como lido
   */
  async marcarComoLido(id: string): Promise<void> {
    // Verificar se o feedback existe antes de marcar como lido
    const feedback = await this.feedbackRepository.findOne({ where: { id } });
    
    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }
    
    await this.feedbackRepository.marcarComoLido(id);
  }

  /**
   * Marca um feedback como resolvido
   */
  async marcarComoResolvido(
    id: string,
    resposta: string,
    respondidoPor: string
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['anexos', 'tags']
    });

    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    if (feedback.resolvido) {
      throw new BadRequestException('Feedback já foi resolvido');
    }

    // Atualizar feedback
    feedback.resolvido = true;
    feedback.resposta = resposta;
    feedback.data_resposta = new Date();
    feedback.respondido_por = respondidoPor;
    feedback.lido = true; // Marcar como lido também

    const updatedFeedback = await this.feedbackRepository.save(feedback);
    return this.mapToResponseDto(updatedFeedback);
  }

  /**
   * Busca feedbacks do usuário
   */
  async findByUsuario(
    userId: string,
    filters: Partial<FeedbackSearchFilters> = {}
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { page = 1, limit = 20 } = filters;
    
    const { feedbacks, total } = await this.feedbackRepository.findByUsuario(
      userId,
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca feedbacks não lidos
   */
  async findNaoLidos(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { feedbacks, total } = await this.feedbackRepository.findNaoLidos(
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca feedbacks não resolvidos
   */
  async findNaoResolvidos(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { feedbacks, total } = await this.feedbackRepository.findNaoResolvidos(
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca feedbacks por prioridade
   */
  async findByPrioridade(
    prioridade: PrioridadeFeedbackEnum,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { feedbacks, total } = await this.feedbackRepository.findByPrioridade(
      prioridade,
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca feedbacks por tipo
   */
  async findByTipo(
    tipo: TipoFeedbackEnum,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { feedbacks, total } = await this.feedbackRepository.findByTipo(
      tipo,
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Busca feedbacks por tags
   */
  async findByTags(
    tagIds: string[],
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FeedbackResumoResponseDto>> {
    const { feedbacks, total } = await this.feedbackRepository.findByTags(
      tagIds,
      { page, limit }
    );

    const data = feedbacks.map(feedback => this.mapToResumoResponseDto(feedback));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtém um anexo de feedback
   */
  async getAnexo(
    feedbackId: string,
    anexoId: string,
    userId?: string
  ): Promise<{ anexo: FeedbackAnexo; fileBuffer: Buffer }> {
    // Verificar se o feedback existe e se o usuário tem permissão
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId }
    });

    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    if (userId && feedback.usuario_id !== userId) {
      throw new ForbiddenException('Acesso negado a este feedback');
    }

    // Buscar anexo
    const anexo = await this.anexoRepository.findOne({
      where: {
        id: anexoId,
        feedback_id: feedbackId,
        ativo: true
      }
    });

    if (!anexo) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Ler arquivo
    const fileBuffer = await this.fileUploadService.readFile(anexo.caminho_arquivo);

    return { anexo, fileBuffer };
  }

  /**
   * Remove um anexo
   */
  async removeAnexo(
    feedbackId: string,
    anexoId: string,
    userId?: string
  ): Promise<void> {
    // Verificar permissões
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId }
    });

    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    if (userId && feedback.usuario_id !== userId) {
      throw new ForbiddenException('Acesso negado a este feedback');
    }

    // Remover anexo
    await this.fileUploadService.removeAnexo(anexoId);
  }

  /**
   * Obtém estatísticas dos feedbacks
   */
  async getEstatisticas(): Promise<any> {
    return this.feedbackRepository.getEstatisticas();
  }

  /**
   * Remove um feedback (soft delete)
   */
  async remove(id: string, userId?: string): Promise<void> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['tags']
    });

    if (!feedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    if (userId && feedback.usuario_id !== userId) {
      throw new ForbiddenException('Acesso negado a este feedback');
    }

    // Decrementar contador de uso das tags
    if (feedback.tags && feedback.tags.length > 0) {
      await this.tagService.decrementarUsoTags(
        feedback.tags.map(tag => tag.id)
      );
    }

    // Remover feedback (soft delete)
    await this.feedbackRepository.softDelete(id);
  }

  /**
   * Mapeia entidade para DTO de resposta completo
   */
  private mapToResponseDto(feedback: Feedback): FeedbackResponseDto {
    return {
      id: feedback.id,
      tipo: feedback.tipo,
      tipo_label: feedback.getTipoLabel(),
      titulo: feedback.titulo,
      descricao: feedback.descricao,
      prioridade: feedback.prioridade,
      prioridade_label: feedback.getPrioridadeLabel(),
      prioridade_cor: feedback.getPrioridadeCor(),
      pagina_origem: feedback.pagina_origem,
      versao_sistema: feedback.versao_sistema,
      informacoes_tecnicas: feedback.informacoes_tecnicas,
      ip_origem: feedback.ip_origem,
      lido: feedback.lido,
      resolvido: feedback.resolvido,
      resposta: feedback.resposta,
      data_resposta: feedback.data_resposta,
      respondido_por: feedback.respondido_por,
      created_at: feedback.created_at,
      updated_at: feedback.updated_at,
      usuario_id: feedback.usuario_id,
      anexos: feedback.anexos?.map(anexo => this.mapAnexoToResponseDto(anexo)) || [],
      tags: feedback.tags?.map(tag => ({
        id: tag.id,
        nome: tag.nome,
        nome_formatado: tag.getNomeFormatado(),
        descricao: tag.descricao,
        categoria: tag.categoria,
        cor: tag.cor,
        contador_uso: tag.contador_uso,
        ativo: tag.ativo,
        sugerida_sistema: tag.sugerida_sistema,
        ordem_exibicao: tag.ordem_exibicao,
        popular: tag.isPopular(),
        is_popular: tag.isPopular(),
        created_at: tag.created_at,
        updated_at: tag.updated_at
      })) || [],
      total_anexos: feedback.anexos?.length || 0,
      total_tags: feedback.tags?.length || 0
    };
  }

  /**
   * Mapeia entidade para DTO de resposta resumido
   */
  private mapToResumoResponseDto(feedback: Feedback): FeedbackResumoResponseDto {
    return {
      id: feedback.id,
      tipo: feedback.tipo,
      tipo_label: feedback.getTipoLabel(),
      titulo: feedback.titulo,
      prioridade: feedback.prioridade,
      prioridade_label: feedback.getPrioridadeLabel(),
      prioridade_cor: feedback.getPrioridadeCor(),
      lido: feedback.lido,
      resolvido: feedback.resolvido,
      created_at: feedback.created_at,
      usuario_id: feedback.usuario_id,
      total_anexos: feedback.anexos?.length || 0,
      total_tags: feedback.tags?.length || 0
    };
  }

  /**
   * Mapeia anexo para DTO de resposta
   */
  private mapAnexoToResponseDto(anexo: FeedbackAnexo): FeedbackAnexoResponseDto {
    return {
      id: anexo.id,
      nome_original: anexo.nome_original,
      tipo_mime: anexo.tipo_mime,
      tamanho: anexo.tamanho,
      tamanho_formatado: anexo.getTamanhoFormatado(),
      url_publica: anexo.url_publica,
      ativo: anexo.ativo,
      is_imagem: anexo.isImagem(),
      is_video: anexo.isVideo(),
      is_documento: anexo.isDocumento(),
      created_at: anexo.created_at
    };
  }
}