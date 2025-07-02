import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  BadRequestException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentoService } from '../services/documento.service';
import { DocumentoBatchService } from '../services/batch-download/documento-batch.service';
import { DocumentoUrlService } from '../services/documento-url.service';
import { ThumbnailService } from '../services/thumbnail/thumbnail.service';
import { ThumbnailQueueService } from '../services/thumbnail/thumbnail-queue.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { DocumentoResponseDto } from '../dto/documento-response.dto';
import {
  ThumbnailResponseDto,
  ThumbnailStatusResponseDto,
  ThumbnailStatsResponseDto,
} from '../dto/thumbnail-response.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../../shared/request-context/request-context.dto';
import { DocumentoAccessGuard } from '../guards/documento-access.guard';
import { Public } from '../../../auth/decorators/public.decorator';
import {
  BatchDownloadDto,
  BatchDownloadResponseDto,
  BatchJobStatusResponseDto,
} from '../dto/batch-download.dto';

/**
 * Controlador de Documentos
 *
 * Responsável por gerenciar as rotas relacionadas aos documentos
 * anexados aos cidadãos e solicitações de benefícios
 */
@ApiTags('Documentos')
@Controller('documento')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoController {
  constructor(
    private readonly documentoService: DocumentoService,
    private readonly documentoBatchService: DocumentoBatchService,
    private readonly documentoUrlService: DocumentoUrlService,
    private readonly thumbnailService: ThumbnailService,
    private readonly thumbnailQueueService: ThumbnailQueueService,
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Lista documentos de um cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Listar documentos de um cidadão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos retornada com sucesso',
  })
  @ApiParam({
    name: 'cidadaoId',
    description: 'ID do cidadão',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Filtrar por tipo de documento',
    required: false,
    enum: [
      'RG',
      'CPF',
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'OUTROS',
    ],
  })
  @ApiQuery({
    name: 'reutilizavel',
    description: 'Filtrar por documentos reutilizáveis',
    required: false,
    type: 'boolean',
  })
  async findByCidadao(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('tipo') tipo?: string,
    @Query('reutilizavel') reutilizavel?: boolean,
  ) {
    return this.documentoService.findByCidadao(cidadaoId, tipo, reutilizavel);
  }

  /**
   * Lista documentos de uma solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Listar documentos de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos retornada com sucesso',
  })
  @ApiParam({
    name: 'solicitacaoId',
    description: 'ID da solicitação',
    type: 'string',
    format: 'uuid',
  })
  async findBySolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
  ) {
    return this.documentoService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Busca documentos reutilizáveis por tipo
   */
  @Get('reutilizaveis')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Buscar documentos reutilizáveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos reutilizáveis retornada com sucesso',
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Tipo de documento',
    required: true,
    enum: [
      'RG',
      'CPF',
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'OUTROS',
    ],
  })
  @ApiQuery({
    name: 'cidadaoId',
    description: 'ID do cidadão (opcional)',
    required: false,
    type: 'string',
  })
  async findReutilizaveis(
    @Query('tipo') tipo?: string,
    @Query('cidadaoId') cidadaoId?: string,
  ) {
    return this.documentoService.findReutilizaveis(cidadaoId, tipo);
  }

  /**
   * Obtém detalhes de um documento específico com verificação de acesso
   */
  @Get(':id')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.visualizar' })
  @ApiOperation({ summary: 'Obter detalhes de um documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    const documento = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    // Auditoria do acesso ao documento
    await this.auditEventEmitter.emitEntityAccessed(
      'Documento',
      id,
      usuario.id?.toString(),
      { synchronous: false },
    );

    return documento;
  }

  /**
   * Faz download de um documento com verificação de acesso
   */
  @Get(':id/download')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.download' })
  @ApiOperation({ summary: 'Fazer download de um documento' })
  @ApiResponse({ status: 200, description: 'Documento baixado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    const resultado = await this.documentoService.download(
      id,
      usuario.id,
      userRoles,
    );

    // Auditoria do download de documento com informações detalhadas
    await this.auditEventEmitter.emitEntityAccessed(
      'Documento',
      id,
      usuario.id?.toString(),
      { synchronous: false },
    );

    // Headers de segurança para download
    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(resultado.buffer);
  }

  /**
   * Acesso a documento via URL pública (ID do documento)
   */
  @Get(':documentoId/public')
  @Public()
  @ApiOperation({ summary: 'Acesso a documento via URL pública' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo baixado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  @ApiParam({
    name: 'documentoId',
    description: 'ID do documento para acesso público',
    type: 'string',
    format: 'uuid',
  })
  async accessPublicDocument(
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Res() res: Response,
  ): Promise<void> {
    const resultado = await this.documentoService.download(documentoId);

    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length.toString(),
    });

    res.send(resultado.buffer);
  }

  /**
   * Acesso a documento via URL privada (hash)
   */
  @Get('private/:hash')
  @Public()
  @ApiOperation({ summary: 'Acesso a documento via URL privada' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo baixado com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Hash inválido ou expirado',
  })
  @ApiParam({
    name: 'hash',
    description: 'Hash de acesso privado',
    type: 'string',
  })
  async accessPrivateDocument(
    @Param('hash') hash: string,
    @Res() res: Response,
  ): Promise<void> {
    const { documentoId } =
      await this.documentoUrlService.validatePrivateAccess(hash);
    const resultado = await this.documentoService.download(documentoId);

    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length.toString(),
    });

    res.send(resultado.buffer);
  }

  /**
   * Faz upload de um documento
   */
  @Post('upload')
  @RequiresPermission({ permissionName: 'documento.criar' })
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({ summary: 'Fazer upload de um documento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dados do documento para upload',
    type: UploadDocumentoDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Documento enviado com sucesso',
    type: DocumentoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async upload(
    @UploadedFile() arquivo: any,
    @Body() uploadDto: UploadDocumentoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    const resultado = await this.documentoService.upload(
      arquivo,
      uploadDto,
      usuario.id,
    );

    // Gerar thumbnail automaticamente após upload bem-sucedido
    try {
      await this.thumbnailQueueService.addToQueue(
        resultado.id,
        'normal', // priority
        0, // delay
      );
    } catch (error) {
      console.warn(
        `Falha ao adicionar documento ${resultado.id} à fila de thumbnails:`,
        error,
      );
    }

    // Auditoria do upload de documento
    await this.auditEventEmitter.emitEntityCreated(
      'Documento',
      resultado.id,
      resultado,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );

    // Transformar o resultado para excluir dados sensíveis
    return {
      data: plainToInstance(DocumentoResponseDto, resultado, {
        excludeExtraneousValues: true,
      }),
      meta: null,
      message: null,
    };
  }

  /**
   * Marca um documento como verificado com verificação de acesso
   */
  @Post(':id/verificar')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.verificar' })
  @ApiOperation({ summary: 'Marcar documento como verificado' })
  @ApiResponse({
    status: 200,
    description: 'Documento verificado com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        observacoes: {
          type: 'string',
          description: 'Observações da verificação',
          maxLength: 500,
        },
      },
    },
  })
  async verificar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('observacoes') observacoes: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Buscar dados do documento antes da verificação com verificação de acesso
    const documentoAntes = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    const resultado = await this.documentoService.verificar(
      id,
      usuario.id,
      observacoes,
    );

    // Auditoria de verificação com informações detalhadas
    await this.auditEventEmitter.emitEntityUpdated(
      'Documento',
      id,
      documentoAntes,
      resultado,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );

    return resultado;
  }

  /**
   * Remove um documento (soft delete) com verificação de acesso
   */
  @Delete(':id')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.excluir' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um documento' })
  @ApiResponse({ status: 204, description: 'Documento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async remover(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Buscar dados do documento antes da remoção com verificação de acesso
    const documentoAntes = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    await this.documentoService.remover(id, usuario.id);

    // Auditoria da remoção de documento com informações detalhadas
    await this.auditEventEmitter.emitEntityDeleted(
      'Documento',
      id,
      documentoAntes,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );
  }

  /**
   * Obtém estatísticas de documentos
   */
  @Get('estatisticas/geral')
  @RequiresPermission({ permissionName: 'documento.estatisticas' })
  @ApiOperation({ summary: 'Obter estatísticas de documentos' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  @ApiQuery({
    name: 'cidadaoId',
    description: 'ID do cidadão (opcional)',
    required: false,
    type: 'string',
  })
  async getEstatisticas(@Query('cidadaoId') cidadaoId?: string) {
    return this.documentoService.getEstatisticas(cidadaoId);
  }

  /**
   * Obtém thumbnail de um documento
   */
  @Get(':id/thumbnail')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.visualizar' })
  @ApiOperation({
    summary: 'Obter thumbnail de um documento',
    description:
      'Retorna o thumbnail do documento ou gera um novo se não existir',
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail retornado com sucesso',
    content: {
      'image/jpeg': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'size',
    description: 'Tamanho do thumbnail (small, medium, large)',
    required: false,
    enum: ['small', 'medium', 'large'],
    example: 'medium',
  })
  async getThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('size') size: 'small' | 'medium' | 'large' = 'medium',
    @Res() res: Response,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Verificar acesso ao documento
    await this.documentoService.findByIdWithAccess(id, usuario.id, userRoles);

    // Obter documento e arquivo para gerar thumbnail
    const documento = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    const storageProvider = this.storageProviderFactory.getProvider();
    const fileBuffer = await storageProvider.obterArquivo(documento.caminho);

    // Gerar ou obter thumbnail
    const thumbnailResult = await this.thumbnailService.generateThumbnail(
      fileBuffer,
      documento.mimetype,
      id,
    );

    // Auditoria do acesso ao thumbnail
    await this.auditEventEmitter.emitEntityAccessed(
      'DocumentoThumbnail',
      id,
      usuario.id?.toString(),
      { synchronous: false },
    );

    // Headers de resposta para imagem
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': thumbnailResult.thumbnailBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
    });

    res.send(thumbnailResult.thumbnailBuffer);
  }

  /**
   * Regenera thumbnail de um documento
   */
  @Post(':id/thumbnail/regenerar')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.gerenciar' })
  @ApiOperation({
    summary: 'Regenerar thumbnail de um documento',
    description: 'Force a regeneração do thumbnail do documento',
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail regenerado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async regenerateThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ): Promise<ThumbnailResponseDto> {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Verificar acesso ao documento
    const documento = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    // Obter arquivo para regenerar thumbnail
    const storageProvider = this.storageProviderFactory.getProvider();
    const fileBuffer = await storageProvider.obterArquivo(documento.caminho);

    // Remover thumbnail existente e regenerar
    await this.thumbnailService.removeThumbnail(id);
    const thumbnailResult = await this.thumbnailService.generateThumbnail(
      fileBuffer,
      documento.mimetype,
      id,
    );

    // Auditoria da regeneração
    await this.auditEventEmitter.emitEntityUpdated(
      'DocumentoThumbnail',
      id,
      null,
      { thumbnailPath: thumbnailResult?.thumbnailPath },
      usuario.id?.toString(),
      { synchronous: false },
    );

    return plainToInstance(
      ThumbnailResponseDto,
      {
        message: 'Thumbnail regenerado com sucesso',
        thumbnailPath: thumbnailResult?.thumbnailPath,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  /**
   * Obtém status de processamento de thumbnail
   */
  @Get(':id/thumbnail/status')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.visualizar' })
  @ApiOperation({
    summary: 'Obter status de processamento de thumbnail',
    description:
      'Retorna o status atual do processamento de thumbnail do documento',
  })
  @ApiResponse({
    status: 200,
    description: 'Status retornado com sucesso',
    type: ThumbnailStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async getThumbnailStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ): Promise<ThumbnailStatusResponseDto> {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Verificar acesso ao documento
    await this.documentoService.findByIdWithAccess(id, usuario.id, userRoles);

    // Obter status do processamento
    const status = await this.thumbnailQueueService.getProcessingStatus(id);

    return plainToInstance(ThumbnailStatusResponseDto, status, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Adiciona documento à fila de processamento de thumbnails
   */
  @Post(':id/thumbnail/processar')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.gerenciar' })
  @ApiOperation({
    summary: 'Adicionar documento à fila de processamento',
    description:
      'Adiciona o documento à fila para processamento assíncrono de thumbnail',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento adicionado à fila com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async queueThumbnailProcessing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];

    // Verificar acesso ao documento
    await this.documentoService.findByIdWithAccess(id, usuario.id, userRoles);

    // Adicionar à fila
    await this.thumbnailQueueService.addToQueue(id);

    // Auditoria
    await this.auditEventEmitter.emitEntityUpdated(
      'DocumentoThumbnailQueue',
      id,
      null,
      { status: 'queued', queuedBy: usuario.id },
      usuario.id?.toString(),
      { synchronous: false },
    );

    return {
      message: 'Documento adicionado à fila de processamento com sucesso',
      documentoId: id,
    };
  }

  /**
   * Obtém estatísticas do sistema de thumbnails
   */
  @Get('thumbnails/estatisticas')
  @RequiresPermission({ permissionName: 'documento.estatisticas' })
  @ApiOperation({
    summary: 'Obter estatísticas do sistema de thumbnails',
    description:
      'Retorna estatísticas agregadas sobre o processamento de thumbnails',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    type: ThumbnailStatsResponseDto,
  })
  async getThumbnailStats(): Promise<ThumbnailStatsResponseDto> {
    const stats = await this.thumbnailQueueService.getStats();

    return plainToInstance(ThumbnailStatsResponseDto, stats, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Inicia um download em lote de documentos
   */
  @Post('download-lote')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @ApiOperation({
    summary: 'Iniciar download em lote de documentos',
    description:
      'Cria um job para download em lote de documentos com base nos filtros especificados',
  })
  @ApiResponse({
    status: 201,
    description: 'Job de download em lote criado com sucesso',
    type: BatchDownloadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Filtros inválidos ou nenhum documento encontrado',
  })
  @ApiBody({
    description: 'Filtros para seleção de documentos',
    type: BatchDownloadDto,
  })
  async startBatchDownload(
    @Body() filtros: BatchDownloadDto,
    @GetUser() usuario: Usuario,
  ): Promise<BatchDownloadResponseDto> {
    const resultado = await this.documentoBatchService.startBatchDownload(
      filtros,
      usuario,
    );

    return {
      jobId: resultado.jobId,
      estimatedSize: resultado.estimatedSize,
      documentCount: resultado.documentCount,
      message:
        'Download em lote iniciado. Use o jobId para verificar o progresso.',
      statusUrl: `/api/documento/download-lote/${resultado.jobId}/status`,
    };
  }

  /**
   * Verifica o status de um job de download em lote
   */
  @Get('download-lote/:jobId/status')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @ApiOperation({
    summary: 'Verificar status do download em lote',
    description: 'Retorna o status atual de um job de download em lote',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do job retornado com sucesso',
    type: BatchJobStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job não encontrado' })
  @ApiParam({
    name: 'jobId',
    description: 'ID do job de download',
    type: 'string',
    format: 'uuid',
  })
  async getBatchStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @GetUser() usuario: Usuario,
  ): Promise<BatchJobStatusResponseDto> {
    const job = this.documentoBatchService.getBatchStatus(jobId, usuario.id);

    const response: BatchJobStatusResponseDto = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      documentCount: job.documentCount,
      estimatedSize: job.estimatedSize,
      actualSize: job.actualSize,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
    };

    if (job.status === 'COMPLETED') {
      response.downloadUrl = `/api/v1/documento/download-lote/${jobId}/download`;
    }

    return response;
  }

  /**
   * Faz o download do arquivo ZIP gerado
   */
  @Get('download-lote/:jobId/download')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @ApiOperation({
    summary: 'Download do arquivo ZIP gerado',
    description: 'Faz o download do arquivo ZIP com os documentos selecionados',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo ZIP baixado com sucesso',
    content: {
      'application/zip': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job não encontrado ou arquivo não disponível',
  })
  @ApiResponse({ status: 400, description: 'Job ainda não foi concluído' })
  @ApiParam({
    name: 'jobId',
    description: 'ID do job de download',
    type: 'string',
    format: 'uuid',
  })
  async downloadBatchFile(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @GetUser() usuario: Usuario,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, fileName } =
      await this.documentoBatchService.downloadBatchFile(jobId, usuario.id);

    // Obter informações do arquivo
    const fs = require('fs');
    const stats = await fs.promises.stat(filePath);

    // Headers para download do ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // Stream do arquivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  /**
   * Lista os jobs de download do usuário
   */
  @Get('download-lote/meus-jobs')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @ApiOperation({
    summary: 'Listar meus jobs de download',
    description: 'Retorna a lista de jobs de download em lote do usuário atual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de jobs retornada com sucesso',
    type: [BatchJobStatusResponseDto],
  })
  async getUserJobs(
    @GetUser() usuario: Usuario,
  ): Promise<BatchJobStatusResponseDto[]> {
    const jobs = this.documentoBatchService.getUserJobs(usuario.id);

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      documentCount: job.documentCount,
      estimatedSize: job.estimatedSize,
      actualSize: job.actualSize,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
      downloadUrl:
        job.status === 'COMPLETED'
          ? `/api/v1/documento/download-lote/${job.id}/download`
          : undefined,
    }));
  }

  /**
   * Cancela um job de download em processamento
   */
  @Delete('download-lote/:jobId')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancelar job de download',
    description: 'Cancela um job de download em lote que está em processamento',
  })
  @ApiResponse({ status: 204, description: 'Job cancelado com sucesso' })
  @ApiResponse({ status: 404, description: 'Job não encontrado' })
  @ApiResponse({ status: 400, description: 'Job não pode ser cancelado' })
  @ApiParam({
    name: 'jobId',
    description: 'ID do job de download',
    type: 'string',
    format: 'uuid',
  })
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    this.documentoBatchService.cancelJob(jobId, usuario.id);
  }
}
