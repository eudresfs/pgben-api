import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { WhatsAppFlowsService } from '../services/whatsapp-flows.service';
import {
  // EncryptedFlowRequestDto,
  WhatsAppFlowRequestDto,
} from '../dto/whatsapp-flow-request.dto';
import {
  EncryptedFlowResponseDto,
  WhatsAppFlowResponseDto,
} from '../dto/whatsapp-flow-response.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { AutoAudit } from '../../auditoria';
import { ScreenType } from '../enums/screen-type.enum';
import { Public } from '@/auth';
import { SkipResponseInterceptor } from '../../../shared/decorators/skip-response-interceptor.decorator';
import { SkipInputValidation } from '../../../shared/decorators/skip-input-validation.decorator';

/**
 * Controller responsável pelos endpoints do WhatsApp Flows
 *
 * Gerencia a comunicação criptografada com o WhatsApp Business API
 * para implementar fluxos interativos de atendimento ao cidadão.
 *
 * Funcionalidades:
 * - Processamento de requisições criptografadas do WhatsApp
 * - Gerenciamento de sessões de flow
 * - Consulta de estatísticas e sessões ativas
 * - Limpeza de sessões inativas
 */
@ApiTags('WhatsApp Flows')
@Controller('whatsapp-flows')
@UseGuards(JwtAuthGuard)
@AutoAudit({
  enabled: true,
  includeRequest: true,
  includeResponse: true,
  async: true,
})
export class WhatsAppFlowsController {
  private readonly logger = new Logger(WhatsAppFlowsController.name);

  constructor(private readonly whatsAppFlowsService: WhatsAppFlowsService) {
    this.logger.log('WhatsAppFlowsController inicializado');
  }

  /**
   * Endpoint principal para processar requisições do WhatsApp Flow
   * Recebe dados criptografados e retorna resposta criptografada
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Public()
  @SkipResponseInterceptor()
  @SkipInputValidation()
  @ApiOperation({
    summary: 'Processar requisição do WhatsApp Flow',
    description:
      'Endpoint principal para processar requisições criptografadas do WhatsApp Business API. ' +
      'Recebe dados criptografados com AES-256-GCM, processa através dos handlers de tela ' +
      'e retorna resposta criptografada. Suporta as telas: INICIO (login), ESQUECEU_SENHA ' +
      '(recuperação de senha) e BUSCAR_CIDADAO (busca por CPF).',
  })
  @ApiHeader({
    name: 'X-Hub-Signature-256',
    description: 'Assinatura HMAC-SHA256 do webhook do WhatsApp',
    required: true,
    example: 'sha256=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  })
  @ApiHeader({
    name: 'Content-Type',
    description: 'Tipo de conteúdo da requisição',
    required: true,
    example: 'application/json',
  })
  @ApiBody({
    type: WhatsAppFlowRequestDto,
    description:
      'Dados criptografados da requisição do WhatsApp Flow. ' +
      'Contém dados do usuário criptografados com AES-256-GCM.',
    examples: {
      'Requisição Criptografada': {
        summary: 'Exemplo de requisição criptografada',
        description:
          'Dados criptografados recebidos do WhatsApp Business API',
        value: {
          encrypted_flow_data:
            'eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...',
          encrypted_aes_key:
            'kx5jZWFyY2ggZm9yIGEgc2VjcmV0IGtleSBpbiB0aGUgZGF0YWJhc2U...',
          initial_vector: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: EncryptedFlowResponseDto,
    description:
      'Resposta criptografada processada com sucesso. ' +
      'Contém dados da próxima tela ou resultado da ação.',
    examples: {
      'Resposta de Sucesso': {
        summary: 'Resposta criptografada de sucesso',
        value: {
          encrypted_flow_data:
            'eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0...',
          encrypted_aes_key:
            'kx5jZWFyY2ggZm9yIGEgc2VjcmV0IGtleSBpbiB0aGUgZGF0YWJhc2U...',
          initial_vector: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados da requisição inválidos. Pode indicar problemas na ' +
      'criptografia, estrutura dos dados ou validação de campos.',
    examples: {
      'Erro de Validação': {
        summary: 'Erro de validação dos dados',
        value: {
          statusCode: 400,
          message: 'Dados criptografados inválidos',
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Falha na autenticação. Assinatura HMAC inválida ou ' +
      'credenciais de usuário incorretas.',
    examples: {
      'Erro de Autenticação': {
        summary: 'Falha na autenticação',
        value: {
          statusCode: 401,
          message: 'CPF ou senha inválidos',
          error: 'Unauthorized',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Recurso não encontrado. Pode indicar CPF não cadastrado ' +
      'ou sessão inexistente.',
    examples: {
      'Cidadão Não Encontrado': {
        summary: 'CPF não encontrado',
        value: {
          statusCode: 404,
          message: 'Cidadão não encontrado',
          error: 'Not Found',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description:
      'Erro interno do servidor. Problemas na criptografia, ' +
      'banco de dados ou integração com serviços externos.',
    examples: {
      'Erro Interno': {
        summary: 'Erro interno do servidor',
        value: {
          statusCode: 500,
          message: 'Erro interno do servidor',
          error: 'Internal Server Error',
        },
      },
    },
  })
  async processFlow(
    @Body() encryptedRequest: WhatsAppFlowRequestDto,
  ): Promise<EncryptedFlowResponseDto | any> {
    this.logger.debug('Recebida requisição do WhatsApp Flow');

    try {
      const startTime = Date.now();
      
      // Processar requisição criptografada
      const response = await this.whatsAppFlowsService.processEncryptedRequest(
        encryptedRequest,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Requisição do WhatsApp Flow processada em ${processingTime}ms`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Erro ao processar WhatsApp Flow: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Endpoint para consultar sessões ativas (uso administrativo)
   * Requer autenticação e permissões específicas
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiresPermission({
    permissionName: 'whatsapp_flows.admin',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Listar sessões ativas do WhatsApp Flow',
    description:
      'Endpoint administrativo para consultar sessões ativas do WhatsApp Flow. ' +
      'Permite filtrar por número de telefone, tela atual e limitar resultados. ' +
      'Requer permissões administrativas.',
  })
  @ApiQuery({
    name: 'phoneNumber',
    required: false,
    type: String,
    description: 'Filtrar por número de telefone',
    example: '+5511999999999',
  })
  @ApiQuery({
    name: 'currentScreen',
    required: false,
    enum: ScreenType,
    description: 'Filtrar por tela atual',
    example: ScreenType.INICIO,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de resultados (padrão: 50, máximo: 100)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões ativas retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          flowToken: { type: 'string' },
          currentScreen: { type: 'string', enum: Object.values(ScreenType) },
          phoneNumber: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastActivity: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para acessar sessões',
  })
  async getActiveSessions(
    @Query('phoneNumber') phoneNumber?: string,
    @Query('currentScreen') currentScreen?: ScreenType,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    this.logger.debug(
      `Consultando sessões ativas - Filtros: phoneNumber=${phoneNumber}, currentScreen=${currentScreen}, limit=${limit}`,
    );

    // Validar limite máximo
    const maxLimit = Math.min(limit || 50, 100);

    const sessions = await this.whatsAppFlowsService.findActiveSessions({
      phoneNumber,
      currentScreen,
      limit: maxLimit,
    });

    this.logger.log(`Retornadas ${sessions.length} sessões ativas`);
    return sessions;
  }

  /**
   * Endpoint para obter estatísticas das sessões (uso administrativo)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiresPermission({
    permissionName: 'whatsapp_flows.admin',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Obter estatísticas das sessões do WhatsApp Flow',
    description:
      'Endpoint administrativo para obter estatísticas detalhadas das sessões ' +
      'do WhatsApp Flow, incluindo contadores, distribuição por tela e ' +
      'duração média das sessões.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        activeSessions: {
          type: 'number',
          description: 'Número de sessões ativas',
        },
        totalSessions: {
          type: 'number',
          description: 'Número total de sessões',
        },
        sessionsByScreen: {
          type: 'object',
          description: 'Distribuição de sessões por tela',
          additionalProperties: { type: 'number' },
        },
        averageSessionDuration: {
          type: 'number',
          description: 'Duração média das sessões em minutos',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para acessar estatísticas',
  })
  async getSessionStats() {
    this.logger.debug('Consultando estatísticas das sessões');

    const stats = await this.whatsAppFlowsService.getSessionStats();

    this.logger.log(
      `Estatísticas obtidas - Sessões ativas: ${stats.activeSessions}, Total: ${stats.totalSessions}`,
    );

    return stats;
  }

  /**
   * Endpoint para limpar sessões inativas (uso administrativo)
   */
  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiresPermission({
    permissionName: 'whatsapp_flows.admin',
    scopeType: ScopeType.GLOBAL,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpar sessões inativas do WhatsApp Flow',
    description:
      'Endpoint administrativo para finalizar sessões inativas baseado ' +
      'no tempo de inatividade. Por padrão, sessões inativas por mais de ' +
      '30 minutos são finalizadas.',
  })
  @ApiQuery({
    name: 'inactiveMinutes',
    required: false,
    type: Number,
    description:
      'Minutos de inatividade para considerar sessão expirada (padrão: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Limpeza realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        cleanedSessions: {
          type: 'number',
          description: 'Número de sessões finalizadas',
        },
        message: {
          type: 'string',
          description: 'Mensagem de confirmação',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para limpar sessões',
  })
  async cleanupInactiveSessions(
    @Query('inactiveMinutes', new DefaultValuePipe(30), ParseIntPipe)
    inactiveMinutes?: number,
  ) {
    this.logger.debug(
      `Iniciando limpeza de sessões inativas - Inatividade: ${inactiveMinutes} minutos`,
    );

    // Validar parâmetro
    const validInactiveMinutes = Math.max(inactiveMinutes || 30, 5); // Mínimo 5 minutos

    const cleanedCount = await this.whatsAppFlowsService.cleanupInactiveSessions(
      validInactiveMinutes,
    );

    const message = `${cleanedCount} sessões inativas foram finalizadas`;
    this.logger.log(message);

    return {
      cleanedSessions: cleanedCount,
      message,
    };
  }
}