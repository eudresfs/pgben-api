import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoMappingService } from '../services/pagamento-mapping.service';
import { PagamentoResponseService } from '../services/pagamento-response.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoPendenteCreateDto } from '../dtos/pagamento-pendente-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { PagamentoAccessGuard } from '../guards/pagamento-access.guard';
import {
  ApenasAdmin,
  AuditorOuAdmin,
  OperadorOuAdmin,
  VerificarUnidade,
} from '../decorators/pagamento-access.decorator';
import { NotFoundException } from '@nestjs/common';
import { DataMaskingInterceptor } from '../interceptors/data-masking.interceptor';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { AuditoriaPagamento } from '../decorators/auditoria.decorator';

/**
 * Controller para gerenciamento de pagamentos
 *
 * Este controller expõe endpoints para gerenciar o ciclo de vida de pagamentos
 * no sistema, incluindo criação, consulta, cancelamento e listagem.
 *
 * @author Equipe PGBen
 */
@ApiTags('Pagamentos')
@Controller('pagamentos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingInterceptor, AuditoriaInterceptor)
export class PagamentoController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly mappingService: PagamentoMappingService,
    private readonly responseService: PagamentoResponseService,
  ) {}

  /**
   * Lista pagamentos com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'query.unidadeId'
  })
  @AuditoriaPagamento.Consulta('Listagem de pagamentos')
  @ApiOperation({ summary: 'Lista pagamentos com filtros' })
  @ApiQuery({ name: 'status', required: false, enum: StatusPagamentoEnum })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date })
  @ApiQuery({ name: 'data_fim', required: false, type: Date })
  @ApiQuery({ name: 'metodo_pagamento', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagamentos',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            $ref: '#/components/schemas/PagamentoResponseDto',
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAll(
    @Query('status') status?: StatusPagamentoEnum,
    @Query('unidadeId') unidadeId?: string,
    @Query('dataInicio') dataInicio?: Date,
    @Query('dataFim') dataFim?: Date,
    @Query('metodoPagamento') metodoPagamento?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    // Mapear filtros para critérios de busca
    const criterios = this.mappingService.mapFiltersToCriteria({
      status,
      unidadeId,
      dataInicio,
      dataFim,
      metodoPagamento,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    }, contextoUsuario);

    // Buscar pagamentos
    const pagamentos = await this.pagamentoService.findAll(criterios);

    // Mapear entidades para DTOs de resposta
    const responseDtos = await this.mappingService.mapEntitiesToResponseDtos(
      pagamentos.data,
      contextoUsuario,
    );

    // Construir resposta paginada
    return this.mappingService.buildPaginatedResponse(
      responseDtos,
      pagamentos.total,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Retorna detalhes de um pagamento específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.id'
  })
  @AuditoriaPagamento.Consulta('Consulta de pagamento por ID')
  @ApiOperation({ summary: 'Retorna detalhes de um pagamento específico' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do pagamento',
    type: PagamentoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })

  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req?: any,
  ) {
    const pagamento = await this.pagamentoService.findOneWithRelations(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    // Mapear entidade para DTO de resposta
    return this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario,
    );
  }

  /**
   * Cancela um pagamento existente
   */
  @Patch(':id/cancelar')
  @AuditoriaPagamento.Cancelamento()
  @ApiOperation({ summary: 'Cancela um pagamento existente' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Pagamento cancelado com sucesso',
    type: PagamentoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 409, description: 'Pagamento não pode ser cancelado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @ApenasAdmin()
  @VerificarUnidade(true)
  async cancelPagamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: { motivoCancelamento: string },
    @Request() req?: any,
  ) {
    // Usar o ID do usuário atual autenticado
    const usuarioId = req?.user?.id || '';

    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    const pagamento = await this.pagamentoService.cancelarPagamento(
      id,
      usuarioId,
      cancelDto.motivoCancelamento,
    );

    // Mapear entidade para DTO de resposta
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario,
    );

    // Retornar resposta de atualização
    return this.responseService.updated(
      responseDto,
      'Pagamento cancelado com sucesso',
    );
  }

  /**
   * Cria um novo pagamento com status pendente
   */
  @Post()
  @RequiresPermission({
    permissionName: 'pagamento.criar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'body.solicitacaoId'
  })
  @AuditoriaPagamento.Criacao()
  @ApiOperation({
    summary: 'Cria um novo pagamento com status pendente',
  })
  @ApiResponse({
    status: 201,
    description: 'Pagamento criado com sucesso',
    type: PagamentoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async createPagamentoPendente(
    @Body() createDto: PagamentoPendenteCreateDto,
    @Request() req?: any,
  ) {
    const usuarioId = req?.user?.id || '';

    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    const pagamento = await this.pagamentoService.createPagamentoPendente(
      createDto,
      usuarioId,
    );

    // Mapear entidade para DTO de resposta
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario,
    );

    // Retornar resposta de criação
    return this.responseService.created(
      responseDto,
      'Pagamento criado com sucesso',
    );
  }

  /**
   * Atualiza o status de um pagamento
   */
  @Patch(':id/status')
  @RequiresPermission({
    permissionName: 'pagamento.atualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.id'
  })
  @AuditoriaPagamento.AtualizacaoStatus()
  @ApiOperation({ summary: 'Atualiza o status de um pagamento' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Status do pagamento atualizado com sucesso',
    type: PagamentoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: PagamentoUpdateStatusDto,
    @Request() req?: any,
  ) {
    const usuarioId = req?.user?.id || '';

    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    const pagamento = await this.pagamentoService.updateStatus(
      id,
      updateStatusDto,
      usuarioId,
    );

    // Mapear entidade para DTO de resposta
    const responseDto = await this.mappingService.mapEntityToResponseDto(
      pagamento,
      contextoUsuario,
    );

    // Retornar resposta de atualização
    return this.responseService.updated(
      responseDto,
      'Status do pagamento atualizado com sucesso',
    );
  }

  /**
   * Lista pagamentos pendentes (criados mas não agendados)
   */
  @Get('pendentes')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'query.unidadeId'
  })
  @AuditoriaPagamento.Consulta('Consulta de pagamentos pendentes')
  @ApiOperation({
    summary: 'Lista pagamentos pendentes (criados mas não agendados)',
  })
  @ApiQuery({ name: 'unidadeId', required: false })
  @ApiQuery({ name: 'tipoBeneficioId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos pendentes',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            $ref: '#/components/schemas/PagamentoResponseDto',
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findPendentes(
    @Query('unidadeId') unidadeId?: string,
    @Query('tipoBeneficioId') tipoBeneficioId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    const contextoUsuario = {
      id: req?.user?.id || '',
      perfil: req?.user?.perfil || 'OPERADOR',
      unidadeId: req?.user?.unidadeId,
      permissoes: req?.user?.permissoes || [],
      isAdmin: req?.user?.isAdmin || false,
      isSupervisor: req?.user?.isSupervisor || false,
    };

    const pagamentos = await this.pagamentoService.findByStatus(
      StatusPagamentoEnum.PENDENTE,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );

    // Mapear entidades para DTOs de resposta
    const responseDtos = await this.mappingService.mapEntitiesToResponseDtos(
      pagamentos.data,
      contextoUsuario,
    );

    // Construir resposta paginada
    return this.mappingService.buildPaginatedResponse(
      responseDtos,
      pagamentos.total,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}