import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseEnumPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { RequiresPermission } from '../../auth/decorators/requires-permission.decorator';
import {
  PerformanceMonitorMiddleware,
  PerformanceMetrics,
} from '../../common/middleware/performance-monitor.middleware';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ROLES } from '@/shared/constants/roles.constants';

/**
 * DTO para filtros de métricas
 */
class PerformanceMetricsFilterDto {
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  statusCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDuration?: number;

  @IsOptional()
  @IsDateString()
  since?: string;
}

/**
 * Controller para monitoramento de performance do sistema
 * Disponível apenas para administradores
 */
@ApiTags('Monitoring')
@Controller('monitoring/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth()
export class PerformanceController {
  constructor(
    private readonly performanceMonitor: PerformanceMonitorMiddleware,
  ) {}

  /**
   * Obtém estatísticas gerais de performance
   */
  @Get('stats')
  @RequiresPermission({
    permissionName: 'monitoring.performance.stats.visualizar',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter estatísticas de performance',
    description:
      'Retorna estatísticas gerais de performance do sistema incluindo tempo de resposta, taxa de erro e uso de memória.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de performance obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalRequests: {
          type: 'number',
          description: 'Total de requisições processadas',
          example: 1500,
        },
        averageResponseTime: {
          type: 'number',
          description: 'Tempo médio de resposta em milissegundos',
          example: 245.67,
        },
        slowRequests: {
          type: 'number',
          description: 'Número de requisições lentas (>1s)',
          example: 23,
        },
        errorRate: {
          type: 'number',
          description: 'Taxa de erro em porcentagem',
          example: 2.15,
        },
        memoryStats: {
          type: 'object',
          properties: {
            averageHeapUsed: {
              type: 'number',
              description: 'Uso médio de heap em MB',
              example: 45.23,
            },
            maxHeapUsed: {
              type: 'number',
              description: 'Uso máximo de heap em MB',
              example: 89.45,
            },
            totalMemoryAllocated: {
              type: 'number',
              description: 'Total de memória alocada em MB',
              example: 1234.56,
            },
          },
        },
        topSlowEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: {
                type: 'string',
                description: 'Endpoint da API',
                example: 'GET /api/beneficios',
              },
              averageTime: {
                type: 'number',
                description: 'Tempo médio de resposta em ms',
                example: 1234.56,
              },
              count: {
                type: 'number',
                description: 'Número de requisições',
                example: 45,
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de acesso inválido ou expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  getPerformanceStats() {
    return this.performanceMonitor.getPerformanceStats();
  }

  /**
   * Obtém métricas detalhadas com filtros
   */
  @Get('metrics')
  @RequiresPermission({
    permissionName: 'monitoring.performance.metrics.visualizar',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter métricas detalhadas',
    description:
      'Retorna métricas detalhadas de requisições com opções de filtro.',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    description: 'Filtrar por método HTTP',
  })
  @ApiQuery({
    name: 'statusCode',
    required: false,
    type: 'number',
    description: 'Filtrar por código de status HTTP',
    example: 200,
  })
  @ApiQuery({
    name: 'minDuration',
    required: false,
    type: 'number',
    description: 'Duração mínima em milissegundos',
    example: 1000,
  })
  @ApiQuery({
    name: 'maxDuration',
    required: false,
    type: 'number',
    description: 'Duração máxima em milissegundos',
    example: 5000,
  })
  @ApiQuery({
    name: 'since',
    required: false,
    type: 'string',
    description: 'Filtrar métricas desde esta data',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtidas com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'Método HTTP',
            example: 'GET',
          },
          url: {
            type: 'string',
            description: 'URL da requisição',
            example: '/api/beneficios/123',
          },
          statusCode: {
            type: 'number',
            description: 'Código de status HTTP',
            example: 200,
          },
          duration: {
            type: 'number',
            description: 'Duração em milissegundos',
            example: 245.67,
          },
          memoryUsage: {
            type: 'object',
            properties: {
              rss: { type: 'number', description: 'RSS em bytes' },
              heapUsed: { type: 'number', description: 'Heap usado em bytes' },
              heapTotal: { type: 'number', description: 'Heap total em bytes' },
              external: {
                type: 'number',
                description: 'Memória externa em bytes',
              },
              arrayBuffers: {
                type: 'number',
                description: 'Array buffers em bytes',
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp da requisição',
          },
          userAgent: {
            type: 'string',
            description: 'User agent do cliente',
          },
          ip: {
            type: 'string',
            description: 'Endereço IP do cliente',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de acesso inválido ou expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  getDetailedMetrics(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: PerformanceMetricsFilterDto,
  ) {
    const filterOptions = {
      method: filters.method,
      statusCode: filters.statusCode,
      minDuration: filters.minDuration,
      maxDuration: filters.maxDuration,
      since: filters.since ? new Date(filters.since) : undefined,
    };

    return this.performanceMonitor.getRecentMetrics(filterOptions);
  }

  /**
   * Limpa o cache de métricas
   */
  @Get('clear')
  @RequiresPermission({
    permissionName: 'monitoring.performance.metrics.limpar',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpar cache de métricas',
    description: 'Remove todas as métricas armazenadas em cache.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache de métricas limpo com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Cache de métricas limpo com sucesso',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de acesso inválido ou expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  clearMetrics() {
    this.performanceMonitor.clearMetrics();
    return {
      message: 'Cache de métricas limpo com sucesso',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtém informações do sistema
   */
  @Get('system')
  @RequiresPermission({
    permissionName: 'monitoring.performance.system.visualizar',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter informações do sistema',
    description: 'Retorna informações sobre o uso de recursos do sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações do sistema obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        memory: {
          type: 'object',
          properties: {
            rss: { type: 'number', description: 'RSS em MB' },
            heapUsed: { type: 'number', description: 'Heap usado em MB' },
            heapTotal: { type: 'number', description: 'Heap total em MB' },
            external: { type: 'number', description: 'Memória externa em MB' },
            arrayBuffers: {
              type: 'number',
              description: 'Array buffers em MB',
            },
          },
        },
        uptime: {
          type: 'number',
          description: 'Tempo de atividade em segundos',
        },
        cpuUsage: {
          type: 'object',
          properties: {
            user: {
              type: 'number',
              description: 'Tempo de CPU do usuário em microssegundos',
            },
            system: {
              type: 'number',
              description: 'Tempo de CPU do sistema em microssegundos',
            },
          },
        },
        nodeVersion: {
          type: 'string',
          description: 'Versão do Node.js',
        },
        platform: {
          type: 'string',
          description: 'Plataforma do sistema operacional',
        },
        arch: {
          type: 'string',
          description: 'Arquitetura do processador',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de acesso inválido ou expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal:
          Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
        arrayBuffers:
          Math.round((memoryUsage.arrayBuffers / 1024 / 1024) * 100) / 100,
      },
      uptime: Math.round(process.uptime()),
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
