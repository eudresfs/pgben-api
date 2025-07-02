import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Logger,
  Query,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { PagamentoPerformanceInterceptor } from '../interceptors/pagamento-performance.interceptor';
import { PagamentoBatchService } from '../services/pagamento-batch.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { UserRole } from '../../../enums';

/**
 * Controller para operações em lote de pagamentos
 * Fornece endpoints otimizados para processamento de múltiplos pagamentos
 */
@ApiTags('Pagamentos - Batch')
@Controller('pagamentos/batch')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditoriaInterceptor, PagamentoPerformanceInterceptor)
@ApiBearerAuth()
export class PagamentoBatchController {
  private readonly logger = new Logger(PagamentoBatchController.name);

  constructor(private readonly batchService: PagamentoBatchService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Criar múltiplos pagamentos em lote',
    description:
      'Cria vários pagamentos de forma otimizada usando processamento em lote',
  })
  @ApiBody({
    description: 'Lista de dados para criação de pagamentos',
    type: [PagamentoCreateDto],
  })
  @ApiQuery({
    name: 'batchSize',
    required: false,
    description: 'Tamanho do lote (padrão: 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'maxConcurrency',
    required: false,
    description: 'Máximo de lotes processados simultaneamente (padrão: 5)',
    type: Number,
  })
  @ApiQuery({
    name: 'useTransaction',
    required: false,
    description: 'Usar transação para cada lote (padrão: true)',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pagamentos criados com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'array',
          description: 'Pagamentos criados com sucesso',
        },
        errors: {
          type: 'array',
          description: 'Erros ocorridos durante a criação',
        },
        total: {
          type: 'number',
          description: 'Total de pagamentos processados',
        },
        successCount: {
          type: 'number',
          description: 'Quantidade de sucessos',
        },
        errorCount: {
          type: 'number',
          description: 'Quantidade de erros',
        },
      },
    },
  })
  async createPagamentosInBatch(
    @Body() pagamentosData: PagamentoCreateDto[],
    @GetUser('id') userId: string,
    @Query('batchSize') batchSize?: number,
    @Query('maxConcurrency') maxConcurrency?: number,
    @Query('useTransaction') useTransaction?: boolean,
  ) {
    this.logger.log(
      `Iniciando criação em lote de ${pagamentosData.length} pagamentos`,
    );

    const options = {
      batchSize: batchSize ? Number(batchSize) : undefined,
      maxConcurrency: maxConcurrency ? Number(maxConcurrency) : undefined,
      useTransaction:
        useTransaction !== undefined ? Boolean(useTransaction) : undefined,
      continueOnError: true,
    };

    const result = await this.batchService.createPagamentosInBatch(
      pagamentosData,
      userId,
      options,
    );

    this.logger.log(
      `Criação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
    );

    return {
      message: 'Processamento em lote concluído',
      ...result,
    };
  }

  @Post('liberar')
  @ApiOperation({
    summary: 'Liberar múltiplos pagamentos em lote',
    description:
      'Libera vários pagamentos de forma otimizada usando processamento em lote',
  })
  @ApiBody({
    description: 'Lista de liberações de pagamentos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pagamentoId: {
            type: 'string',
            description: 'ID do pagamento a ser liberado',
          },
          dados: {
            $ref: '#/components/schemas/CancelarPagamentoDto',
          },
        },
        required: ['pagamentoId', 'dados'],
      },
    },
  })
  @ApiQuery({
    name: 'batchSize',
    required: false,
    description: 'Tamanho do lote (padrão: 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'maxConcurrency',
    required: false,
    description: 'Máximo de lotes processados simultaneamente (padrão: 5)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liberações processadas com sucesso',
  })
  async liberarPagamentosInBatch(
    @Body() liberacoes: { pagamentoId: string; dados: CancelarPagamentoDto }[],
    @GetUser('id') userId: string,
    @Query('batchSize') batchSize?: number,
    @Query('maxConcurrency') maxConcurrency?: number,
  ) {
    this.logger.log(
      `Iniciando liberação em lote de ${liberacoes.length} pagamentos`,
    );

    const options = {
      batchSize: batchSize ? Number(batchSize) : undefined,
      maxConcurrency: maxConcurrency ? Number(maxConcurrency) : undefined,
      continueOnError: true,
    };

    const result = await this.batchService.liberarPagamentosInBatch(
      liberacoes,
      userId,
      options,
    );

    this.logger.log(
      `Liberação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
    );

    return {
      message: 'Processamento em lote concluído',
      ...result,
    };
  }

  @Post('update-status')
  @ApiOperation({
    summary: 'Atualizar status de múltiplos pagamentos em lote',
    description: 'Atualiza o status de vários pagamentos de forma otimizada',
  })
  @ApiBody({
    description: 'Lista de atualizações de status',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pagamentoId: {
            type: 'string',
            description: 'ID do pagamento',
          },
          novoStatus: {
            $ref: '#/components/schemas/PagamentoStatus',
          },
          observacoes: {
            type: 'string',
            description: 'Observações sobre a mudança de status',
          },
        },
        required: ['pagamentoId', 'novoStatus'],
      },
    },
  })
  @ApiQuery({
    name: 'batchSize',
    required: false,
    description: 'Tamanho do lote (padrão: 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'useTransaction',
    required: false,
    description: 'Usar transação para cada lote (padrão: true)',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status atualizados com sucesso',
  })
  async updateStatusInBatch(
    @Body()
    updates: {
      pagamentoId: string;
      novoStatus: StatusPagamentoEnum;
      observacoes?: string;
    }[],
    @GetUser('id') userId: string,
    @Query('batchSize') batchSize?: number,
    @Query('useTransaction') useTransaction?: boolean,
  ) {
    this.logger.log(
      `Iniciando atualização de status em lote de ${updates.length} pagamentos`,
    );

    const options = {
      batchSize: batchSize ? Number(batchSize) : undefined,
      useTransaction:
        useTransaction !== undefined ? Boolean(useTransaction) : undefined,
      continueOnError: true,
    };

    const result = await this.batchService.updateStatusInBatch(
      updates,
      userId,
      options,
    );

    this.logger.log(
      `Atualização de status em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
    );

    return {
      message: 'Processamento em lote concluído',
      ...result,
    };
  }

  @Post('validar-comprovantes')
  @ApiOperation({
    summary: 'Validar múltiplos comprovantes em lote',
    description:
      'Valida vários comprovantes de forma otimizada usando processamento em lote',
  })
  @ApiBody({
    description: 'Lista de IDs de comprovantes para validação',
    schema: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  @ApiQuery({
    name: 'batchSize',
    required: false,
    description: 'Tamanho do lote (padrão: 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'maxConcurrency',
    required: false,
    description: 'Máximo de lotes processados simultaneamente (padrão: 5)',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprovantes validados com sucesso',
  })
  async validarComprovantesInBatch(
    @Body() comprovanteIds: string[],
    @GetUser('id') userId: string,
    @Query('batchSize') batchSize?: number,
    @Query('maxConcurrency') maxConcurrency?: number,
  ) {
    this.logger.log(
      `Iniciando validação em lote de ${comprovanteIds.length} comprovantes`,
    );

    const options = {
      batchSize: batchSize ? Number(batchSize) : undefined,
      maxConcurrency: maxConcurrency ? Number(maxConcurrency) : undefined,
      continueOnError: true,
    };

    const result = await this.batchService.validarComprovantesInBatch(
      comprovanteIds,
      userId,
      options,
    );

    this.logger.log(
      `Validação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
    );

    return {
      message: 'Processamento em lote concluído',
      ...result,
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Obter status das operações em lote',
    description:
      'Retorna informações sobre o status das filas e processamento em lote',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status das operações em lote',
    schema: {
      type: 'object',
      properties: {
        queueStats: {
          type: 'object',
          description: 'Estatísticas da fila de pagamentos',
        },
        activeJobs: {
          type: 'number',
          description: 'Número de jobs ativos',
        },
        waitingJobs: {
          type: 'number',
          description: 'Número de jobs aguardando',
        },
        completedJobs: {
          type: 'number',
          description: 'Número de jobs concluídos',
        },
        failedJobs: {
          type: 'number',
          description: 'Número de jobs falhados',
        },
      },
    },
  })
  async getBatchStatus() {
    // Implementar lógica para obter status das filas
    // Esta funcionalidade seria implementada no PagamentoQueueService
    return {
      message: 'Status das operações em lote',
      queueStats: {
        // Estatísticas da fila seriam obtidas aqui
      },
      activeJobs: 0,
      waitingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };
  }
}
