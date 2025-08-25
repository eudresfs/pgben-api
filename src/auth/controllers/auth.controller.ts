import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { LoggingService } from '../../shared/logging/logging.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { LoginInput } from '../dtos/auth-login-input.dto';
import { RefreshTokenInput } from '../dtos/auth-refresh-token-input.dto';
import { AuthTokenOutput } from '../dtos/auth-token-output.dto';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { AuthService } from '../services/auth.service';
import { Public } from '../decorators/public.decorator';

// Auditoria
import { AuthAuditInterceptor } from '../interceptors/auth-audit.interceptor';
import { AuditLogin } from '../../modules/auditoria/decorators/audit.decorator';
import {
  Audit,
  SensitiveData,
  SecurityAudit,
} from '../../modules/auditoria/decorators/audit.decorators';
import {
  AuditEventType,
  RiskLevel,
} from '../../modules/auditoria/events/types/audit-event.types';

@ApiTags('Autenticação')
@Controller('auth')
@UseInterceptors(AuthAuditInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggingService,
  ) {
    // O contexto agora é passado diretamente nos métodos de log
  }
  @Post('login')
  @Public()
  @AuditLogin('Login de usuário no sistema')
  @SecurityAudit('user_login', RiskLevel.HIGH)
  @SensitiveData({
    fields: ['password'],
    maskInLogs: true,
    requiresConsent: false,
  })
  @ApiOperation({
    summary: 'Fazer login',
    description:
      'Autentica um usuário no sistema usando credenciais (username/password)',
    requestBody: {
      description: 'Credenciais de login',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/LoginInput',
          },
          examples: {
            'usuario-admin': {
              summary: 'Login de Administrador',
              description: 'Exemplo de login para usuário administrador',
              value: {
                username: 'admin@semtas.gov.br',
                password: 'senha123',
              },
            },
            'usuario-assistente': {
              summary: 'Login de Assistente Social',
              description: 'Exemplo de login para assistente social',
              value: {
                username: 'maria.silva@semtas.gov.br',
                password: 'minhasenha456',
              },
            },
            'usuario-coordenador': {
              summary: 'Login de Coordenador',
              description: 'Exemplo de login para coordenador de unidade',
              value: {
                username: 'joao.santos@semtas.gov.br',
                password: 'coordenador789',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(AuthTokenOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async login(
    @ReqContext() ctx: RequestContext,
    @Body() credential: LoginInput,
  ): Promise<BaseApiResponse<AuthTokenOutput>> {
    this.logger.info(`${this.login.name} was called`, AuthController.name);

    const authToken = await this.authService.login(ctx);

    // Converter para o formato BaseApiResponse
    const response = new BaseApiResponse<AuthTokenOutput>();
    response.data = authToken;
    response.meta = {};

    return response;
  }

  @Post('refresh-token')
  @Audit({
    eventType: AuditEventType.TOKEN_REFRESH,
    operation: 'refresh_token',
    riskLevel: RiskLevel.MEDIUM,
    sensitiveFields: ['refreshToken'],
    async: true,
  })
  @SensitiveData({
    fields: ['refreshToken'],
    maskInLogs: true,
    requiresConsent: false,
  })
  @ApiOperation({
    summary: 'Atualizar token da api',
    description: 'Renova o token de acesso usando um refresh token válido',
    requestBody: {
      description: 'Refresh token para renovação',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/RefreshTokenInput',
          },
          examples: {
            'refresh-token': {
              summary: 'Renovação de Token',
              description: 'Exemplo de renovação usando refresh token',
              value: {
                refreshToken:
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(AuthTokenOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async refreshToken(
    @ReqContext() ctx: RequestContext,
    @Body() credential: RefreshTokenInput,
  ): Promise<BaseApiResponse<AuthTokenOutput>> {
    this.logger.info(
      `${this.refreshToken.name} was called`,
      AuthController.name,
    );

    const authToken = await this.authService.refreshToken(ctx, credential);

    // Converter para o formato BaseApiResponse
    const response = new BaseApiResponse<AuthTokenOutput>();
    response.data = authToken;
    response.meta = {};

    return response;
  }

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'Verificar status do serviço de autenticação',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'online' },
        message: {
          type: 'string',
          example: 'Serviço de autenticação está funcionando',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  getStatus(): { status: string; message: string; timestamp: string } {
    return {
      status: 'online',
      message: 'Serviço de autenticação está funcionando',
      timestamp: new Date().toISOString(),
    };
  }
}
