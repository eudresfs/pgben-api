import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  SseRateLimiterService,
  RateLimitMetrics,
} from '../services/sse-rate-limiter.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';
import {
  SseRateLimitGuard,
  SseRateLimitAdmin,
} from '../guards/sse-rate-limit.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

/**
 * DTO para reset de rate limit
 */
class ResetRateLimitDto {
  identifier: string;
  profile?: 'default' | 'admin' | 'system' | 'premium';
}

/**
 * DTO para gerenciar whitelist
 */
class WhitelistDto {
  ip: string;
}

/**
 * Controller para gerenciamento de Rate Limiting SSE
 *
 * Fornece endpoints administrativos para configurar, monitorar
 * e gerenciar o sistema de rate limiting do SSE.
 */
@ApiTags('SSE Rate Limiting')
@Controller('notificacao/sse/rate-limit')
@ApiBearerAuth()
@UseGuards(SseRateLimitGuard, JwtAuthGuard, RolesGuard)
export class SseRateLimitController {
  private readonly logger = new Logger(SseRateLimitController.name);

  constructor(private readonly rateLimiterService: SseRateLimiterService) {}

  /**
   * Obter métricas de rate limiting
   */
  @Get('metrics')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @ApiOperation({ summary: 'Obter métricas detalhadas de rate limiting' })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalRequests: {
          type: 'number',
          description: 'Total de requisições processadas',
        },
        blockedRequests: {
          type: 'number',
          description: 'Requisições bloqueadas',
        },
        blockRate: { type: 'number', description: 'Taxa de bloqueio em %' },
        requestsByProfile: {
          type: 'object',
          description: 'Requisições por perfil de usuário',
          additionalProperties: { type: 'number' },
        },
        topIPs: {
          type: 'array',
          description: 'IPs mais ativos',
          items: {
            type: 'object',
            properties: {
              ip: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    type: 'number',
    description: 'Período em segundos (padrão: 3600)',
  })
  async getMetrics(
    @Query('timeRange') timeRange?: number,
  ): Promise<RateLimitMetrics> {
    const range = timeRange || 3600;
    this.logger.log(
      `Obtendo métricas de rate limiting para período de ${range}s`,
    );

    return this.rateLimiterService.getMetrics(range);
  }

  /**
   * Resetar rate limit para um identificador específico
   */
  @Post('reset')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetar rate limit para um identificador específico',
  })
  @ApiResponse({ status: 200, description: 'Rate limit resetado com sucesso' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiBody({
    description: 'Dados para reset de rate limit',
    schema: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description: 'Identificador (IP, usuário, etc.)',
        },
        profile: {
          type: 'string',
          enum: ['default', 'admin', 'system', 'premium'],
          description: 'Perfil do usuário (padrão: default)',
        },
      },
      required: ['identifier'],
    },
  })
  async resetRateLimit(
    @Body() resetDto: ResetRateLimitDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Resetando rate limit para ${resetDto.identifier} (perfil: ${resetDto.profile || 'default'})`,
    );

    await this.rateLimiterService.resetRateLimit(
      resetDto.identifier,
      resetDto.profile || 'default',
    );

    return { success: true };
  }

  /**
   * Obter lista de IPs na whitelist
   */
  @Get('whitelist')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @ApiOperation({ summary: 'Obter lista de IPs na whitelist' })
  @ApiResponse({
    status: 200,
    description: 'Lista de IPs obtida com sucesso',
    schema: {
      type: 'object',
      properties: {
        ips: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de IPs na whitelist',
        },
        count: { type: 'number', description: 'Número total de IPs' },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async getWhitelist(): Promise<{ ips: string[]; count: number }> {
    this.logger.log('Obtendo lista de IPs na whitelist');

    const ips = await this.rateLimiterService.getWhitelist();

    return {
      ips,
      count: ips.length,
    };
  }

  /**
   * Adicionar IP à whitelist
   */
  @Post('whitelist')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar IP à whitelist' })
  @ApiResponse({
    status: 201,
    description: 'IP adicionado à whitelist com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiBody({
    description: 'IP para adicionar à whitelist',
    schema: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'Endereço IP' },
      },
      required: ['ip'],
    },
  })
  async addToWhitelist(
    @Body() whitelistDto: WhitelistDto,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Adicionando IP ${whitelistDto.ip} à whitelist`);

    await this.rateLimiterService.addToWhitelist(whitelistDto.ip);

    return { success: true };
  }

  /**
   * Remover IP da whitelist
   */
  @Delete('whitelist/:ip')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover IP da whitelist' })
  @ApiResponse({
    status: 200,
    description: 'IP removido da whitelist com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiParam({ name: 'ip', description: 'Endereço IP para remover' })
  async removeFromWhitelist(
    @Param('ip') ip: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Removendo IP ${ip} da whitelist`);

    await this.rateLimiterService.removeFromWhitelist(ip);

    return { success: true };
  }

  /**
   * Verificar status de rate limit para um identificador
   */
  @Get('status/:identifier')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @ApiOperation({
    summary: 'Verificar status de rate limit para um identificador',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de rate limit obtido com sucesso',
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string' },
        profile: { type: 'string' },
        allowed: { type: 'boolean' },
        remaining: { type: 'number' },
        resetTime: { type: 'number' },
        limit: { type: 'number' },
        windowSeconds: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiParam({ name: 'identifier', description: 'Identificador para verificar' })
  @ApiQuery({
    name: 'profile',
    required: false,
    enum: ['default', 'admin', 'system', 'premium'],
    description: 'Perfil do usuário (padrão: default)',
  })
  async checkRateLimitStatus(
    @Param('identifier') identifier: string,
    @Query('profile') profile?: 'default' | 'admin' | 'system' | 'premium',
  ) {
    this.logger.log(
      `Verificando status de rate limit para ${identifier} (perfil: ${profile || 'default'})`,
    );

    const result = await this.rateLimiterService.checkRateLimit(
      identifier,
      profile || 'default',
    );

    return {
      identifier,
      profile: profile || 'default',
      ...result,
    };
  }

  /**
   * Health check do sistema de rate limiting
   */
  @Get('health')
  @Roles(ROLES.ADMIN)
  @SseRateLimitAdmin()
  @ApiOperation({ summary: 'Health check do sistema de rate limiting' })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde do sistema',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        redis: { type: 'boolean', description: 'Status da conexão Redis' },
        metrics: { type: 'object', description: 'Métricas básicas' },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async healthCheck() {
    this.logger.log('Verificando saúde do sistema de rate limiting');

    try {
      // Verificar métricas básicas
      const metrics = await this.rateLimiterService.getMetrics(300); // 5 minutos

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        redis: true,
        metrics: {
          totalRequests: metrics.totalRequests,
          blockRate: metrics.blockRate,
          activeProfiles: Object.keys(metrics.requestsByProfile).length,
        },
      };
    } catch (error) {
      this.logger.error(`Erro no health check: ${error.message}`);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        redis: false,
        error: error.message,
      };
    }
  }
}
