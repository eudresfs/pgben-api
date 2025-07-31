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
import {
  IDocumentoBatchProgresso,
  IDocumentoBatchResultado,
} from '../interfaces/documento-batch.interface';

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
  @RequiresPermission({ permissionName: 'documento.download' })
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
  ): Promise<{ jobId: string; message: string; statusUrl: string }> {
    // Converter BatchDownloadDto para IDocumentoBatchFiltros
    const filtrosConvertidos: any = {
      unidade_id: usuario.unidade_id || undefined, // Será definido pelo contexto do usuário
      data_inicio: filtros.dataInicio,
      data_fim: filtros.dataFim,
      tipo_documento: filtros.tiposDocumento,
      cidadao_ids: filtros.cidadaoIds,
      solicitacao_ids: filtros.solicitacaoIds,
      apenas_verificados: filtros.apenasVerificados,
      incluir_metadados: filtros.incluirMetadados,
    };

    const jobId = await this.documentoBatchService.iniciarJob(
      filtrosConvertidos,
      usuario.id,
    );

    return {
      jobId,
      message:
        'Download em lote iniciado. Use o jobId para verificar o progresso.',
      statusUrl: `/api/v1/documento/download-lote/${jobId}/status`,
    };
  }

  /**
   * Verifica o status de um job de download em lote
   */
  @Get(':jobId/status')
  @RequiresPermission({ permissionName: 'documento.download' })
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
  ): Promise<IDocumentoBatchProgresso> {
    return await this.documentoBatchService.obterProgresso(jobId);
  }

  /**
   * Faz o download do arquivo ZIP gerado
   */
  @Get(':jobId/download')
  @RequiresPermission({ permissionName: 'documento.download' })
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
    const resultado = await this.documentoBatchService.obterResultado(jobId);
    
    if (!resultado.caminho_arquivo) {
      throw new Error('Arquivo não disponível para download');
    }

    // Construir caminho do arquivo baseado no job_id
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(
      process.env.download_TEMP_DIR || path.join(process.cwd(), 'temp', 'batch-downloads'),
      jobId,
      'documentos.zip'
    );

    if (!fs.existsSync(filePath)) {
      throw new Error('Arquivo ZIP não encontrado');
    }

    // Obter informações do arquivo
    const stats = await fs.promises.stat(filePath);

    // Headers para download do ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${resultado.nome_arquivo || 'documentos.zip'}"`,
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
  @RequiresPermission({ permissionName: 'documento.download' })
  @ApiOperation({
    summary: 'Listar meus jobs de download',
    description: 'Retorna a lista de jobs de download em lote do usuário atual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de jobs retornada com sucesso',
  })
  async getUserJobs(
    @GetUser() usuario: Usuario,
  ) {
    return await this.documentoBatchService.listarJobs(usuario.id);
  }

  /**
   * Cancela um job de download em processamento
   */
  @Delete(':jobId')
  @RequiresPermission({ permissionName: 'documento.download' })
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
    await this.documentoBatchService.cancelarJob(jobId);
  }

  /**
   * Valida filtros de download em lote
   */
  @Post('validar-filtros')
  @RequiresPermission({ permissionName: 'documento.download' })
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
    // Implementar estatísticas usando a nova interface
    // Por enquanto retornar dados básicos
    return {
      message: 'Estatísticas não implementadas na nova versão',
      totalJobs: 0,
      jobsAtivos: 0,
      jobsConcluidos: 0,
      jobsFalharam: 0,
    };
  }
}
