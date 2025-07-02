import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentoBatchService } from '../services/batch-download/documento-batch.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import {
  BatchDownloadDto,
  BatchDownloadResponseDto,
  BatchJobStatusResponseDto,
} from '../dto/batch-download.dto';

/**
 * Controller para Download em Lote de Documentos
 *
 * Responsável por gerenciar as operações de download em lote,
 * incluindo criação de jobs, monitoramento de progresso e download de arquivos ZIP
 */
@ApiTags('Documentos')
@Controller('documento/download-lote')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoBatchController {
  constructor(private readonly documentoBatchService: DocumentoBatchService) {}

  /**
   * Inicia um download em lote de documentos
   */
  @Post()
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
  @Get(':jobId/status')
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
      response.downloadUrl = `/api/documento/download-lote/${jobId}/download`;
    }

    return response;
  }

  /**
   * Faz o download do arquivo ZIP gerado
   */
  @Get(':jobId/download')
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
  @Get('meus-jobs')
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
          ? `/api/documento/download-lote/${job.id}/download`
          : undefined,
    }));
  }

  /**
   * Cancela um job de download em processamento
   */
  @Delete(':jobId')
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

  /**
   * Valida filtros de download em lote
   */
  @Post('validar-filtros')
  @RequiresPermission({ permissionName: 'documento.download_lote' })
  @ApiOperation({
    summary: 'Validar filtros de download',
    description: 'Valida os filtros e retorna estimativas sem criar o job',
  })
  @ApiResponse({
    status: 200,
    description: 'Validação realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        valido: { type: 'boolean' },
        estimativaDocumentos: { type: 'number' },
        estimativaTamanho: { type: 'number' },
        erros: { type: 'array', items: { type: 'string' } },
        avisos: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({
    description: 'Filtros para validação',
    type: BatchDownloadDto,
  })
  async validarFiltros(
    @Body() filtros: BatchDownloadDto,
    @GetUser() usuario: Usuario,
  ) {
    return this.documentoBatchService.validarFiltros(filtros, usuario.id);
  }

  /**
   * Obtém estatísticas do sistema de download em lote
   */
  @Get('estatisticas')
  @RequiresPermission({ permissionName: 'documento.estatisticas' })
  @ApiOperation({
    summary: 'Obter estatísticas do sistema',
    description:
      'Retorna estatísticas agregadas do sistema de download em lote',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalJobs: { type: 'number' },
        jobsAtivos: { type: 'number' },
        jobsConcluidos: { type: 'number' },
        jobsFalharam: { type: 'number' },
        tamanhoTotalProcessado: { type: 'number' },
        tempoMedioProcessamento: { type: 'number' },
      },
    },
  })
  async obterEstatisticas() {
    return this.documentoBatchService.obterEstatisticas();
  }
}
