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
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { Usuario } from '../../../entities';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';

/**
 * Controller simplificado para gerenciamento de pagamentos
 * Foca apenas nos endpoints essenciais com lógica mínima
 */
@ApiTags('Pagamentos')
@Controller('pagamentos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor)
export class PagamentoController {
  constructor(private readonly pagamentoService: PagamentoService) {}

  /**
   * Lista pagamentos com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Lista pagamentos com filtros' })
  @ApiQuery({ name: 'status', required: false, enum: StatusPagamentoEnum })
  @ApiQuery({ name: 'solicitacao_id', required: false, type: String })
  @ApiQuery({ name: 'concessao_id', required: false, type: String })
  @ApiQuery({ name: 'data_inicio', required: false, type: String })
  @ApiQuery({ name: 'data_fim', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de pagamentos' })
  async findAll(
    @Query('status') status?: StatusPagamentoEnum,
    @Query('solicitacao_id') solicitacao_id?: string,
    @Query('concessao_id') concessao_id?: string,
    @Query('data_inicio') data_inicio?: string,
    @Query('data_fim') data_fim?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filtros = {
      status,
      solicitacao_id: solicitacao_id,
      concessao_id: concessao_id,
      data_inicio: data_inicio,
      data_fim: data_fim,
      page: page || 1,
      limit: Math.min(limit || 10, 100), // Limita a 100 itens
    };

    return await this.pagamentoService.findAll(filtros);
  }

  /**
   * Busca pagamento por ID
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamento por ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Detalhes do pagamento' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.pagamentoService.findById(id);
  }

  /**
   * Cria um novo pagamento
   */
  @Post()
  @RequiresPermission({
    permissionName: 'pagamento.criar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Cria um novo pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createDto: PagamentoCreateDto,
    @GetUser() usuario: Usuario,
  ) {
    const pagamento = await this.pagamentoService.create(createDto, usuario.id);

    return {
      success: true,
      data: pagamento,
      message: 'Pagamento criado com sucesso',
    };
  }

  /**
   * Atualiza status do pagamento
   */
  @Patch(':id/status')
  @RequiresPermission({
    permissionName: 'pagamento.atualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Atualiza status do pagamento' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: PagamentoUpdateStatusDto,
    @GetUser() usuario: Usuario,
  ) {
    const pagamento = await this.pagamentoService.updateStatus(
      id,
      updateDto,
      usuario.id,
    );

    return {
      success: true,
      data: pagamento,
      message: 'Status atualizado com sucesso',
    };
  }

  /**
   * Cancela um pagamento
   */
  @Patch(':id/cancelar')
  @RequiresPermission({
    permissionName: 'pagamento.cancelar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Cancela um pagamento' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado com sucesso' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { motivo: string },
    @GetUser() usuario: Usuario,
  ) {
    if (!body.motivo?.trim()) {
      throw new BadRequestException('Motivo do cancelamento é obrigatório');
    }

    const pagamento = await this.pagamentoService.cancelar(
      id,
      body.motivo,
      usuario.id,
    );

    return {
      success: true,
      data: pagamento,
      message: 'Pagamento cancelado com sucesso',
    };
  }

  /**
   * Busca pagamentos por solicitação
   */
  @Get('solicitacao/:solicitacao_id')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamentos de uma solicitação' })
  @ApiParam({
    name: 'solicitacao_id',
    type: 'string',
    description: 'ID da solicitação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos da solicitação',
  })
  async findBySolicitacao(
    @Param('solicitacao_id', ParseUUIDPipe) solicitacao_id: string,
  ) {
    const pagamentos =
      await this.pagamentoService.findBySolicitacao(solicitacao_id);

    return {
      success: true,
      data: pagamentos,
      total: pagamentos.length,
    };
  }

  /**
   * Busca pagamentos por concessão
   */
  @Get('concessao/:concessao_id')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamentos de uma concessão' })
  @ApiParam({
    name: 'concessao_id',
    type: 'string',
    description: 'ID da concessão',
  })
  @ApiResponse({ status: 200, description: 'Lista de pagamentos da concessão' })
  async findByConcessao(
    @Param('concessao_id', ParseUUIDPipe) concessao_id: string,
  ) {
    const pagamentos = await this.pagamentoService.findByConcessao(concessao_id);

    return {
      success: true,
      data: pagamentos,
      total: pagamentos.length,
    };
  }

  /**
   * Processa vencimentos automáticos
   */
  @Post('processar-vencimentos')
  @RequiresPermission({
    permissionName: 'pagamento.processar_vencimentos',
    scopeType: TipoEscopo.SISTEMA,
  })
  @ApiOperation({ summary: 'Processa vencimentos automáticos' })
  @ApiResponse({ status: 200, description: 'Vencimentos processados' })
  async processarVencimentos(@GetUser() usuario: Usuario) {
    // const pagamentosVencidos = await this.pagamentoService.processarVencimentos();

    return {
      success: true,
      data: [],
      message: `0 pagamentos marcados como vencidos`,
    };
  }

  /**
   * Obtém estatísticas de pagamentos
   */
  @Get('estatisticas')
  @RequiresPermission({
    permissionName: 'pagamento.estatisticas',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Obtém estatísticas de pagamentos' })
  @ApiResponse({ status: 200, description: 'Estatísticas de pagamentos' })
  async getEstatisticas() {
    const estatisticas = await this.pagamentoService.getEstatisticas();

    return {
      success: true,
      data: estatisticas,
    };
  }
}
