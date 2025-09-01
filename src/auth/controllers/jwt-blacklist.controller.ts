import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import {
  AddToBlacklistDto,
  CheckBlacklistDto,
  InvalidateUserTokensDto,
  BlacklistResponseDto,
  CheckBlacklistResponseDto,
  BlacklistQueryDto,
  BlacklistStatsDto,
} from '../dtos/jwt-blacklist.dto';
import { JwtBlacklist } from '../../entities/jwt-blacklist.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/role.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Usuario } from '../../entities/usuario.entity';
import {
  ThrottleApi,
  ThrottleCritical,
} from '../../common/decorators/throttle.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { AuditEventEmitter } from '../../modules/auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../modules/auditoria/events/types/audit-event.types';

/**
 * Controller de Blacklist de Tokens JWT
 *
 * Gerencia tokens JWT invalidados para prevenir reutilização
 * de tokens comprometidos ou revogados
 */
@Controller('auth/blacklist')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth()
export class JwtBlacklistController {
  constructor(
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly auditEmitter: AuditEventEmitter,
  ) {}

  /**
   * Adiciona um token à blacklist
   */
  @Post('add')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ThrottleCritical()
  @ApiOperation({
    summary: 'Adicionar token à blacklist',
    description:
      'Invalida um token JWT específico adicionando-o à blacklist (apenas administradores)',
  })
  @ApiBody({ type: AddToBlacklistDto })
  @ApiResponse({
    status: 200,
    description: 'Token adicionado à blacklist com sucesso',
    type: BlacklistResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - Rate limit excedido',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async addToBlacklist(
    @Body() addToBlacklistDto: AddToBlacklistDto,
  ): Promise<BlacklistResponseDto> {
    return this.jwtBlacklistService.addToBlacklist(addToBlacklistDto);
  }

  /**
   * Verifica se um token está na blacklist
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ThrottleApi()
  @ApiOperation({
    summary: 'Verificar se token está na blacklist',
    description: 'Verifica se um token JWT específico está invalidado',
  })
  @ApiBody({ type: CheckBlacklistDto })
  @ApiResponse({
    status: 200,
    description: 'Status do token na blacklist',
    type: CheckBlacklistResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async checkBlacklist(
    @Body() checkBlacklistDto: CheckBlacklistDto,
  ): Promise<CheckBlacklistResponseDto> {
    return this.jwtBlacklistService.isTokenBlacklisted(checkBlacklistDto);
  }

  /**
   * Invalida todos os tokens de um usuário
   */
  @Post('invalidate-user/:userId')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ThrottleCritical()
  @ApiOperation({
    summary: 'Invalidar todos os tokens de um usuário',
    description:
      'Adiciona todos os tokens ativos de um usuário à blacklist (apenas administradores)',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID do usuário',
    example: 'user-uuid-v4',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo da invalidação',
          example: 'security_breach',
        },
        token_type: {
          type: 'string',
          enum: ['access', 'refresh', 'all'],
          description: 'Tipo de token a invalidar',
          example: 'all',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens do usuário invalidados com sucesso',
    type: BlacklistResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  @ApiHeader({
    name: 'User-Agent',
    description: 'User Agent do cliente',
    required: false,
  })
  async invalidateUserTokens(
    @Param('userId') userId: string,
    @Body() body: { reason: string; token_type?: 'access' | 'refresh' | 'all' },
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<BlacklistResponseDto> {
    const invalidateDto: InvalidateUserTokensDto = {
      usuario_id: userId,
      reason: body.reason,
      token_type: body.token_type,
      client_ip: clientIp,
      user_agent: userAgent,
    };

    // Buscar tokens ativos do usuário do RefreshTokenService
    const refreshTokens =
      await this.refreshTokenService.findActiveTokensByUserId(userId);

    const activeTokens: Array<{
      jti: string;
      token_type: 'access' | 'refresh';
      expires_at: Date;
    }> = refreshTokens.map((token) => ({
      jti: token.id, // Usando o ID do refresh token como JTI
      token_type: 'refresh' as const,
      expires_at: token.expires_at,
    }));

    // Emitir evento de auditoria para invalidação de tokens
    await this.auditEmitter.emitSecurityEvent(
      AuditEventType.SECURITY_TOKEN_INVALIDATION,
      userId,
      {
        reason: body.reason,
        token_type: body.token_type || 'all',
        tokens_count: activeTokens.length,
        client_ip: clientIp,
        user_agent: userAgent,
      },
    );

    return this.jwtBlacklistService.invalidateUserTokens(
      invalidateDto,
      activeTokens,
    );
  }

  /**
   * Remove um token da blacklist
   */
  @Delete('remove/:jti')
  @Roles('SUPER_ADMIN')
  @ThrottleCritical()
  @ApiOperation({
    summary: 'Remover token da blacklist',
    description:
      'Remove um token específico da blacklist (apenas super administradores)',
  })
  @ApiParam({
    name: 'jti',
    description: 'JWT ID do token',
    example: 'jti-uuid-v4',
  })
  @ApiResponse({
    status: 200,
    description: 'Token removido da blacklist com sucesso',
    type: BlacklistResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  @ApiResponse({
    status: 404,
    description: 'Token não encontrado na blacklist',
  })
  async removeFromBlacklist(
    @Param('jti') jti: string,
  ): Promise<BlacklistResponseDto> {
    return this.jwtBlacklistService.removeFromBlacklist(jti);
  }

  /**
   * Lista tokens na blacklist
   */
  @Get('list')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ThrottleApi()
  @ApiOperation({
    summary: 'Listar tokens na blacklist',
    description:
      'Lista tokens invalidados com filtros e paginação (apenas administradores)',
  })
  @ApiQuery({
    name: 'usuario_id',
    required: false,
    description: 'Filtrar por ID do usuário',
    example: 'user-uuid-v4',
  })
  @ApiQuery({
    name: 'token_type',
    required: false,
    enum: ['access', 'refresh'],
    description: 'Filtrar por tipo de token',
  })
  @ApiQuery({
    name: 'reason',
    required: false,
    description: 'Filtrar por motivo da invalidação',
    example: 'user_logout',
  })
  @ApiQuery({
    name: 'only_active',
    required: false,
    type: 'boolean',
    description: 'Incluir apenas tokens ainda válidos',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Página para paginação',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Itens por página (máximo 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tokens na blacklist',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/JwtBlacklist' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        pages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async listBlacklistedTokens(@Query() queryDto: BlacklistQueryDto): Promise<{
    data: JwtBlacklist[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    return this.jwtBlacklistService.listBlacklistedTokens(queryDto);
  }

  /**
   * Obtém estatísticas da blacklist
   */
  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ThrottleApi()
  @ApiOperation({
    summary: 'Estatísticas da blacklist',
    description:
      'Obtém estatísticas detalhadas da blacklist de tokens (apenas administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas da blacklist',
    type: BlacklistStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async getBlacklistStats(): Promise<BlacklistStatsDto> {
    return this.jwtBlacklistService.getBlacklistStats();
  }

  /**
   * Limpa tokens expirados da blacklist
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ThrottleCritical()
  @ApiOperation({
    summary: 'Limpar tokens expirados',
    description:
      'Remove tokens expirados da blacklist (apenas administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens expirados removidos com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async cleanupExpiredTokens(): Promise<{
    message: string;
    deletedCount: number;
  }> {
    const deletedCount = await this.jwtBlacklistService.cleanupExpiredTokens();

    return {
      message: 'Tokens expirados removidos com sucesso',
      deletedCount,
    };
  }

  /**
   * Invalida o próprio token do usuário (logout)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ThrottleApi()
  @ApiOperation({
    summary: 'Logout - Invalidar token atual',
    description: 'Invalida o token atual do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    type: BlacklistResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true,
  })
  @ApiHeader({
    name: 'User-Agent',
    description: 'User Agent do cliente',
    required: false,
  })
  async logout(
    @GetUser() user: Usuario,
    @Headers('authorization') authHeader: string,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<BlacklistResponseDto> {
    // Extrair token do header Authorization
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const jti = this.jwtBlacklistService.extractJtiFromToken(token);
    if (!jti) {
      throw new Error('Token inválido');
    }

    // Decodificar token para obter data de expiração
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    const expiresAt = new Date(decoded.exp * 1000);

    const addToBlacklistDto: AddToBlacklistDto = {
      jti,
      usuario_id: user.id,
      token_type: 'access',
      expires_at: expiresAt.toISOString(),
      reason: 'user_logout',
      client_ip: clientIp,
      user_agent: userAgent,
      metadata: {
        logout_timestamp: new Date().toISOString(),
        user_initiated: true,
      },
    };

    // ✅ Auditoria de logout
    await this.auditEmitter.emitSecurityEvent(AuditEventType.LOGOUT, user.id, {
      operation: 'logout',
      riskLevel: 'low',
      username: user.email,
      logoutType: 'single_session',
      clientIp,
      userAgent,
      sessionEnd: new Date(),
      userInitiated: true,
      tokensInvalidated: 1,
    });

    return this.jwtBlacklistService.addToBlacklist(addToBlacklistDto);
  }

  /**
   * Logout global - Invalida todos os tokens do usuário
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ThrottleApi()
  @ApiOperation({
    summary: 'Logout Global - Invalidar todos os tokens',
    description:
      'Invalida todos os tokens ativos do usuário autenticado (access e refresh)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout global realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Todos os tokens do usuário foram invalidados',
        },
        success: {
          type: 'boolean',
          example: true,
        },
        affected_count: {
          type: 'number',
          example: 3,
        },
        timestamp: {
          type: 'string',
          example: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true,
  })
  @ApiHeader({
    name: 'User-Agent',
    description: 'User Agent do cliente',
    required: false,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true,
  })
  @ApiHeader({
    name: 'User-Agent',
    description: 'User Agent do cliente',
    required: false,
  })
  async logoutAll(
    @GetUser() user: Usuario,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<{
    message: string;
    success: boolean;
    affected_count: number;
    timestamp: string;
  }> {
    const invalidateDto: InvalidateUserTokensDto = {
      usuario_id: user.id,
      reason: 'user_logout_all',
      client_ip: clientIp,
      user_agent: userAgent,
      metadata: {
        logout_all_timestamp: new Date().toISOString(),
        user_initiated: true,
        action: 'global_logout',
      },
    };

    // Obter tokens ativos do usuário (simulação - implemente conforme sua lógica)
    const activeTokens = []; // Substitua por sua lógica para obter tokens ativos

    // ✅ Auditoria de logout global
    await this.auditEmitter.emitSecurityEvent(AuditEventType.LOGOUT, user.id, {
      operation: 'logout_all',
      riskLevel: 'medium',
      username: user.email,
      logoutType: 'all_sessions',
      clientIp,
      userAgent,
      sessionEnd: new Date(),
      userInitiated: true,
      tokensInvalidated: activeTokens.length,
    });

    const result = await this.jwtBlacklistService.invalidateUserTokens(
      invalidateDto,
      activeTokens,
    );

    return {
      message: 'Todos os tokens do usuário foram invalidados',
      success: true,
      affected_count: result.affected_count || 0,
      timestamp: new Date().toISOString(),
    };
  }
}
