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
  Logger,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
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
import {
  ThrottleBatchDownload,
  ThrottleReports,
} from '../../../common/decorators/throttle.decorator';
import * as fs from 'fs';

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
  private readonly logger = new Logger(DocumentoBatchController.name);

  constructor(private readonly documentoBatchService: DocumentoBatchService) { }

  /**
   * Inicia um download em lote de documentos
   */
  @Post()
  @ThrottleBatchDownload()
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
    @Body() body: BatchDownloadDto,
    @GetUser() usuario: Usuario,
    @Req() req: Request,
  ): Promise<{ jobId: string; message: string; statusUrl: string }> {
    // Converter BatchDownloadDto para IDocumentoBatchFiltros
    const filtrosConvertidos: any = {
      data_inicio: body.dataInicio,
      data_fim: body.dataFim,
      tipo_documento: body.tiposDocumento,
      cidadao_ids: body.cidadaoIds,
      solicitacao_ids: body.solicitacaoIds,
      pagamento_ids: body.pagamentoIds,
      apenas_verificados: body.apenasVerificados,
      incluir_metadados: body.incluirMetadados,
    };

    const metadados = body.metadados;

    const resultado = await this.documentoBatchService.iniciarJob(
      filtrosConvertidos,
      usuario.id,
      usuario.unidade_id,
      metadados,
    );

    return {
      jobId: resultado.jobId,
      message:
        'Download em lote iniciado. Use o jobId para verificar o progresso.',
      statusUrl: `/api/v1/documento/download-lote/${resultado.jobId}/status`,
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
  @ThrottleBatchDownload()
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
    // Verificar se o job existe e está completo
    const job = await this.documentoBatchService.obterJobCompleto(jobId);

    if (job.status !== 'concluido') {
      throw new BadRequestException(`Job ainda não foi concluído. Status atual: ${job.status}`);
    }

    if (!job.caminho_arquivo || !fs.existsSync(job.caminho_arquivo)) {
      throw new NotFoundException('Arquivo ZIP não encontrado ou foi removido');
    }

    // Ler o arquivo ZIP do disco
    const zipBuffer = fs.readFileSync(job.caminho_arquivo);
    const filename = job.nome_arquivo || `documentos_lote_${jobId.substring(0, 8)}.zip`;


    // Headers para download do ZIP (igual ao endpoint individual que funciona)
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': zipBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    });

    // Enviar o buffer diretamente (igual ao endpoint individual)
    res.send(zipBuffer);
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
  async getUserJobs(@GetUser() usuario: Usuario) {
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
  @ThrottleReports()
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
