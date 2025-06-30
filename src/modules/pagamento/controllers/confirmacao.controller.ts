import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities';
import { ConfirmacaoService } from '../services/confirmacao.service';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';
import { ConfirmacaoResponseDto } from '../dtos/confirmacao-response.dto';
import { PagamentoUnifiedMapper as ConfirmacaoMapper } from '../mappers';

/**
 * Controller para gerenciamento de confirmações de recebimento
 * Implementa endpoints para registrar e consultar confirmações de pagamentos
 */
@ApiTags('Pagamentos - Confirmações')
@Controller('pagamentos/:pagamentoId/confirmacao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor)
export class ConfirmacaoController {
  constructor(
    private readonly confirmacaoService: ConfirmacaoService,
  ) {}

  /**
   * Lista confirmações de um pagamento
   */
  @Get()
  @ApiOperation({
    summary: 'Lista confirmações de recebimento de um pagamento',
    description: 'Retorna todas as confirmações registradas para o pagamento especificado'
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    format: 'uuid',
    description: 'ID do pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de confirmações retornada com sucesso',
    type: [ConfirmacaoResponseDto],
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Pagamento não encontrado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Pagamento não encontrado' }
      }
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Acesso negado - Usuário não possui permissão' 
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async findAll(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string
  ) {
    const confirmacoes = await this.confirmacaoService.findByPagamento(pagamentoId);
    
    return {
      success: true,
      data: ConfirmacaoMapper.confirmacaoToResponseDtoList(confirmacoes),
      meta: {
        total: confirmacoes.length,
        pagamentoId
      }
    };
  }

  /**
   * Obtém detalhes de uma confirmação específica
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtém detalhes de uma confirmação específica',
    description: 'Retorna informações completas de uma confirmação incluindo dados relacionados'
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    format: 'uuid',
    description: 'ID do pagamento'
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    format: 'uuid',
    description: 'ID da confirmação',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da confirmação retornados com sucesso',
    type: ConfirmacaoResponseDto,
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Confirmação não encontrada' 
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async findOne(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const confirmacao = await this.confirmacaoService.findByIdWithRelations(id);
    
    return {
      success: true,
      data: ConfirmacaoMapper.confirmacaoToResponseDto(confirmacao),
      meta: {
        pagamentoId
      }
    };
  }

  /**
   * Registra nova confirmação de recebimento
   */
  @Post()
  @ApiOperation({
    summary: 'Registra confirmação de recebimento',
    description: 'Cria uma nova confirmação de recebimento para o pagamento especificado'
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    format: 'uuid',
    description: 'ID do pagamento a ser confirmado'
  })
  @ApiResponse({
    status: 201,
    description: 'Confirmação registrada com sucesso',
    type: ConfirmacaoResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Dados inválidos' },
        errors: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['Data de confirmação é obrigatória', 'Método de confirmação inválido']
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Pagamento não encontrado' 
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - Pagamento já confirmado ou em status inválido',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Pagamento já possui confirmação de recebimento' }
      }
    }
  })
  @RequiresPermission({
    permissionName: 'pagamento.confirmar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async create(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @Body() createDto: ConfirmacaoRecebimentoDto,
    @GetUser() usuario: Usuario
  ) {
    const confirmacao = await this.confirmacaoService.create(
      pagamentoId,
      createDto,
      usuario.id,
    );

    return {
      success: true,
      data: ConfirmacaoMapper.confirmacaoToResponseDto(confirmacao),
      message: 'Confirmação de recebimento registrada com sucesso',
      meta: {
        pagamentoId,
        criadoPor: usuario.id
      }
    };
  }

  /**
   * Verifica status de confirmação do pagamento
   */
  @Get('status')
  @ApiOperation({
    summary: 'Verifica status de confirmação do pagamento',
    description: 'Retorna se o pagamento possui confirmação e qual o status atual'
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    format: 'uuid',
    description: 'ID do pagamento'
  })
  @ApiResponse({
    status: 200,
    description: 'Status da confirmação retornado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            temConfirmacao: { type: 'boolean', example: true },
            status: { 
              type: 'string', 
              enum: ['CONFIRMADO', 'PENDENTE_CONFIRMACAO'],
              example: 'CONFIRMADO' 
            },
            quantidadeConfirmacoes: { type: 'number', example: 1 },
            ultimaConfirmacao: {
              type: 'object',
              properties: {
                dataConfirmacao: { type: 'string', format: 'date-time' },
                metodoConfirmacao: { type: 'string' }
              },
              nullable: true
            }
          }
        }
      }
    }
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async verificarStatus(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
  ) {
    const statusConfirmacao = await this.confirmacaoService.getStatusConfirmacao(pagamentoId);

    return {
      success: true,
      data: statusConfirmacao,
      meta: {
        pagamentoId,
        consultadoEm: new Date().toISOString()
      }
    };
  }
}