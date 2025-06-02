import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { GetClientInfo } from '../../common/decorators/get-client-info.decorator';
import { AuditService } from '../services/audit.service';
import {
  CreateAuditLogDto,
  AuditLogQueryDto,
  AuditLogResponseDto,
  AuditLogStatsDto,
} from '../dto/audit-log.dto';
import { Usuario } from '../../entities/usuario.entity';
import { ClientInfo } from '../../common/interfaces/client-info.interface';

@ApiTags('Auditoria')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('logs')
  @Roles('ADMIN', 'GESTOR')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Criar log de auditoria',
    description: 'Cria um novo registro de auditoria no sistema',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Log de auditoria criado com sucesso',
    type: AuditLogResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - permissões insuficientes',
  })
  async createLog(
    @Body(ValidationPipe) createAuditLogDto: CreateAuditLogDto,
    @GetUser() user: Usuario,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<AuditLogResponseDto> {
    // Adiciona informações do cliente se não fornecidas
    const logData = {
      ...createAuditLogDto,
      client_ip: createAuditLogDto.client_ip || clientInfo.ip,
      user_agent: createAuditLogDto.user_agent || clientInfo.userAgent,
    };

    const log = await this.auditService.createLog(logData);
    return this.mapToResponseDto(log);
  }

  @Get('logs')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Listar logs de auditoria',
    description: 'Busca logs de auditoria com filtros e paginação',
  })
  @ApiQuery({
    name: 'usuario_id',
    required: false,
    description: 'Filtrar por ID do usuário',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filtrar por ação',
  })
  @ApiQuery({
    name: 'resource_type',
    required: false,
    description: 'Filtrar por tipo de recurso',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    description: 'Filtrar por severidade',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Data de início (ISO 8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Data de fim (ISO 8601)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página',
  })
  @ApiQuery({
    name: 'security_events_only',
    required: false,
    description: 'Filtrar apenas eventos de segurança',
  })
  @ApiQuery({
    name: 'critical_only',
    required: false,
    description: 'Filtrar apenas eventos críticos',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de logs de auditoria',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AuditLogResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findLogs(
    @Query(ValidationPipe) queryDto: AuditLogQueryDto,
  ): Promise<{
    data: AuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return await this.auditService.findLogs(queryDto);
  }

  @Get('logs/:id')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Buscar log específico',
    description: 'Busca um log de auditoria específico por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do log de auditoria',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Log de auditoria encontrado',
    type: AuditLogResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Log de auditoria não encontrado',
  })
  async findLogById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto | null> {
    return await this.auditService.findLogById(id);
  }

  @Get('stats')
  @Roles('ADMIN', 'GESTOR')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Estatísticas de auditoria',
    description: 'Gera estatísticas e métricas dos logs de auditoria',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Data de início para análise (ISO 8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Data de fim para análise (ISO 8601)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de auditoria',
    type: AuditLogStatsDto,
  })
  async getStats(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<AuditLogStatsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.auditService.getStats(start, end);
  }

  @Post('cleanup')
  @Roles('ADMIN')
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // 1 request per 5 minutes
  @ApiOperation({
    summary: 'Limpeza manual de logs',
    description: 'Executa limpeza manual de logs antigos (apenas administradores)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limpeza executada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - apenas administradores',
  })
  async manualCleanup(
    @GetUser() user: Usuario,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<{ message: string; timestamp: string }> {
    // Log da ação administrativa
    await this.auditService.logUserAction(
      user.id,
      'SYSTEM_CONFIG' as any,
      'AuditLog',
      undefined,
      'Limpeza manual de logs executada',
      { action: 'manual_cleanup' },
      {
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        method: 'POST',
        url: '/api/audit/cleanup',
      },
    );

    await this.auditService.cleanupOldLogs();
    
    return {
      message: 'Limpeza de logs executada com sucesso',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('security-events')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Eventos de segurança recentes',
    description: 'Lista eventos de segurança das últimas 24 horas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de eventos de segurança',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AuditLogResponseDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  async getSecurityEvents(): Promise<{
    data: AuditLogResponseDto[];
    total: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24h atrás

    const result = await this.auditService.findLogs({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      security_events_only: true,
      sort_by: 'created_at',
      sort_order: 'DESC',
      limit: 100,
    });

    return {
      data: result.data,
      total: result.total,
    };
  }

  @Get('critical-events')
  @Roles('ADMIN', 'GESTOR')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Eventos críticos recentes',
    description: 'Lista eventos críticos das últimas 24 horas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de eventos críticos',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AuditLogResponseDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  async getCriticalEvents(): Promise<{
    data: AuditLogResponseDto[];
    total: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24h atrás

    const result = await this.auditService.findLogs({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      critical_only: true,
      sort_by: 'created_at',
      sort_order: 'DESC',
      limit: 50,
    });

    return {
      data: result.data,
      total: result.total,
    };
  }

  /**
   * Método privado para mapear entidade para DTO
   */
  private mapToResponseDto(log: any): AuditLogResponseDto {
    return {
      id: log.id,
      usuario_id: log.usuario_id,
      usuario: log.usuario
        ? {
            id: log.usuario.id,
            nome: log.usuario.nome,
            email: log.usuario.email,
          }
        : undefined,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      description: log.description,
      severity: log.severity,
      client_ip: log.client_ip,
      user_agent: log.user_agent,
      created_at: log.created_at,
      metadata: log.metadata,
    };
  }
}