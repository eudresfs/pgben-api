import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  ValidationPipe,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ParseUUIDPipe
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto, FeedbackResponseDto, FeedbackResumoResponseDto } from '../dto';
import { FeedbackFileUploadInterceptor } from '../interceptors';
import { TipoFeedbackEnum, PrioridadeFeedbackEnum } from '../enums';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../../auth/guards/optional-auth.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';

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
 * Interface para filtros de feedback
 */
interface FeedbackQueryFilters {
  tipo?: TipoFeedbackEnum;
  prioridade?: PrioridadeFeedbackEnum;
  lido?: boolean;
  resolvido?: boolean;
  usuario_id?: string;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  tags?: string;
  page?: number;
  limit?: number;
  ordenacao?: 'created_at' | 'prioridade' | 'tipo';
  direcao?: 'ASC' | 'DESC';
}

@ApiTags('Feedback')
@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Criar novo feedback com anexos
   */
  @Post()
  @ApiOperation({ summary: 'Criar novo feedback com anexos opcionais' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Feedback criado com sucesso',
    type: FeedbackResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou erro de validação'
  })
  @UseGuards(OptionalAuthGuard) // Permite usuários anônimos e autenticados
  @UseInterceptors(
    FilesInterceptor('anexos', 5), // Máximo 5 arquivos
    FeedbackFileUploadInterceptor
  )
  async create(
    @Body(ValidationPipe) createFeedbackDto: CreateFeedbackDto,
    @UploadedFiles() anexos: Express.Multer.File[],
    @GetUser() usuario?: Usuario,
    @Req() req?: Request
  ): Promise<FeedbackResponseDto> {
    try {
      // Preparar informações do usuário
      const userInfo = {
        id: usuario?.id || null,
        ip: req?.ip || req?.connection?.remoteAddress || null
      };

      return await this.feedbackService.create(createFeedbackDto, anexos || [], userInfo);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao criar feedback'
      );
    }
  }

  /**
   * Listar feedbacks com filtros e paginação
   */
  @Get()
  @ApiOperation({ summary: 'Listar feedbacks com filtros e paginação' })
  @ApiQuery({ name: 'tipo', enum: TipoFeedbackEnum, required: false })
  @ApiQuery({ name: 'prioridade', enum: PrioridadeFeedbackEnum, required: false })
  @ApiQuery({ name: 'lido', type: Boolean, required: false })
  @ApiQuery({ name: 'resolvido', type: Boolean, required: false })
  @ApiQuery({ name: 'usuario_id', type: String, required: false })
  @ApiQuery({ name: 'data_inicio', type: String, required: false })
  @ApiQuery({ name: 'data_fim', type: String, required: false })
  @ApiQuery({ name: 'busca', type: String, required: false })
  @ApiQuery({ name: 'tags', type: String, required: false, description: 'IDs das tags separados por vírgula' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'ordenacao', enum: ['created_at', 'prioridade', 'tipo'], required: false })
  @ApiQuery({ name: 'direcao', enum: ['ASC', 'DESC'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedbacks',
    type: [FeedbackResumoResponseDto]
  })
  @UseGuards(JwtAuthGuard) // Apenas usuários autenticados podem listar
  async findAll(
    @Query() filters: FeedbackQueryFilters
  ): Promise<{
    data: FeedbackResumoResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Converter strings para tipos apropriados
      const processedFilters: FeedbackSearchFilters = {
        tipo: filters.tipo,
        prioridade: filters.prioridade,
        lido: filters.lido !== undefined ? Boolean(filters.lido) : undefined,
        resolvido: filters.resolvido !== undefined ? Boolean(filters.resolvido) : undefined,
        usuario_id: filters.usuario_id,
        busca: filters.busca,
        tag_ids: filters.tags ? filters.tags.split(',') : undefined,
        page: filters.page ? parseInt(filters.page.toString()) : 1,
        limit: filters.limit ? parseInt(filters.limit.toString()) : 20,
        data_inicio: filters.data_inicio ? new Date(filters.data_inicio) : undefined,
        data_fim: filters.data_fim ? new Date(filters.data_fim) : undefined
      };

      return await this.feedbackService.findAll(processedFilters);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar feedbacks'
      );
    }
  }

  /**
   * Buscar feedback por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar feedback por ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID do feedback' })
  @ApiResponse({
    status: 200,
    description: 'Feedback encontrado',
    type: FeedbackResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Feedback não encontrado'
  })
  @UseGuards(OptionalAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario?: Usuario
  ): Promise<FeedbackResponseDto> {
    try {
      const feedback = await this.feedbackService.findOne(id);
      
      if (!feedback) {
        throw new NotFoundException('Feedback não encontrado');
      }

      // Marcar como lido se for um administrador
      if (usuario && this.isAdmin(usuario)) {
        await this.feedbackService.marcarComoLido(id);
      }

      return feedback;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao buscar feedback'
      );
    }
  }

  /**
   * Baixar anexo do feedback
   */
  @Get(':id/anexos/:anexoId')
  @ApiOperation({ summary: 'Baixar anexo do feedback' })
  @ApiParam({ name: 'id', type: String, description: 'ID do feedback' })
  @ApiParam({ name: 'anexoId', type: String, description: 'ID do anexo' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo do anexo'
  })
  @ApiResponse({
    status: 404,
    description: 'Feedback ou anexo não encontrado'
  })
  @UseGuards(OptionalAuthGuard)
  async downloadAnexo(
    @Param('id', ParseUUIDPipe) feedbackId: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const result = await this.feedbackService.getAnexo(feedbackId, anexoId);
      
      if (!result) {
        throw new NotFoundException('Anexo não encontrado');
      }

      const { anexo, fileBuffer } = result;

      // Configurar headers para download
      res.setHeader('Content-Type', anexo.tipo_mime);
      res.setHeader('Content-Disposition', `attachment; filename="${anexo.nome_original}"`);
      res.setHeader('Content-Length', anexo.tamanho);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache por 1 hora

      // Enviar arquivo
      res.status(HttpStatus.OK);
      res.end(fileBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao baixar anexo'
      );
    }
  }

  /**
   * Marcar feedback como lido
   */
  @Post(':id/marcar-lido')
  @ApiOperation({ summary: 'Marcar feedback como lido' })
  @ApiParam({ name: 'id', type: String, description: 'ID do feedback' })
  @ApiResponse({
    status: 200,
    description: 'Feedback marcado como lido'
  })
  @UseGuards(JwtAuthGuard)
  async marcarComoLido(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario
  ): Promise<{ message: string }> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new BadRequestException('Apenas administradores podem marcar feedbacks como lidos');
      }

      await this.feedbackService.marcarComoLido(id);
      
      return { message: 'Feedback marcado como lido com sucesso' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao marcar feedback como lido'
      );
    }
  }

  /**
   * Marcar feedback como resolvido
   */
  @Post(':id/marcar-resolvido')
  @ApiOperation({ summary: 'Marcar feedback como resolvido' })
  @ApiParam({ name: 'id', type: String, description: 'ID do feedback' })
  @ApiResponse({
    status: 200,
    description: 'Feedback marcado como resolvido'
  })
  @UseGuards(JwtAuthGuard)
  async marcarComoResolvido(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resposta') resposta: string,
    @GetUser() usuario: Usuario
  ): Promise<{ message: string }> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new BadRequestException('Apenas administradores podem marcar feedbacks como resolvidos');
      }

      if (!resposta || resposta.trim().length === 0) {
        throw new BadRequestException('Resposta é obrigatória para marcar como resolvido');
      }

      await this.feedbackService.marcarComoResolvido(id, resposta, usuario.id);
      
      return { message: 'Feedback marcado como resolvido com sucesso' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao marcar feedback como resolvido'
      );
    }
  }

  /**
   * Buscar feedbacks do usuário logado
   */
  @Get('meus-feedbacks')
  @ApiOperation({ summary: 'Buscar feedbacks do usuário logado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedbacks do usuário',
    type: [FeedbackResumoResponseDto]
  })
  @UseGuards(JwtAuthGuard)
  async meusFeedbacks(
    @GetUser() usuario: Usuario,
    @Query() filters: Omit<FeedbackQueryFilters, 'usuario_id'>
  ): Promise<{
    data: FeedbackResumoResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const processedFilters: FeedbackSearchFilters = {
        tipo: filters.tipo,
        prioridade: filters.prioridade,
        lido: filters.lido !== undefined ? Boolean(filters.lido) : undefined,
         resolvido: filters.resolvido !== undefined ? Boolean(filters.resolvido) : undefined,
        usuario_id: usuario.id,
        busca: filters.busca,
        tag_ids: filters.tags ? filters.tags.split(',') : undefined,
        page: filters.page ? parseInt(filters.page.toString()) : 1,
        limit: filters.limit ? parseInt(filters.limit.toString()) : 10,
        data_inicio: filters.data_inicio ? new Date(filters.data_inicio) : undefined,
        data_fim: filters.data_fim ? new Date(filters.data_fim) : undefined,
      };

      return await this.feedbackService.findAll(processedFilters);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao buscar seus feedbacks'
      );
    }
  }

  /**
   * Obter estatísticas de feedback
   */
  @Get('admin/estatisticas')
  @ApiOperation({ summary: 'Obter estatísticas de feedback (apenas admin)' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de feedback'
  })
  @UseGuards(JwtAuthGuard)
  async getEstatisticas(
    @GetUser() usuario: Usuario
  ): Promise<any> {
    try {
      if (!this.isAdmin(usuario)) {
        throw new BadRequestException('Apenas administradores podem acessar estatísticas');
      }

      return await this.feedbackService.getEstatisticas();
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erro ao obter estatísticas'
      );
    }
  }

  /**
   * Verificar se o usuário é administrador
   */
  private isAdmin(usuario: Usuario): boolean {
    // Verificar se o usuário tem role de administrador
    // Assumindo que existe uma role com código 'admin' ou 'administrador'
    return usuario.role && (usuario.role.codigo === 'admin' || usuario.role.codigo === 'administrador');
  }
}