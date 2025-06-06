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
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
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
import { UsuarioService } from '../../usuario/services/usuario.service';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';

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
export class PagamentoController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly usuarioService: UsuarioService,
    private readonly solicitacaoService: SolicitacaoService,
  ) {}

  /**
   * Lista pagamentos com filtros e paginação
   */
  @Get()
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
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(false)
  async findAll(
    @Query('status') status?: StatusPagamentoEnum,
    @Query('unidadeId') unidadeId?: string,
    @Query('dataInicio') dataInicio?: Date,
    @Query('dataFim') dataFim?: Date,
    @Query('metodoPagamento') metodoPagamento?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagamentos = await this.pagamentoService.findAll({
      status,
      unidadeId,
      dataInicio,
      dataFim,
      metodoPagamento,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    // Mapear para DTOs de resposta com dados sensíveis mascarados
    const responseDtos = await Promise.all(
      pagamentos.data.map(async (pagamento) => {
        // Buscar dados reais do responsável pela liberação
        const responsavel = await this.usuarioService.findById(
          pagamento.liberadoPor,
        );

        // Buscar dados da solicitação
        const solicitacao = await this.solicitacaoService.findById(
      pagamento.solicitacaoId,
    );

        return {
          id: pagamento.id,
          solicitacaoId: pagamento.solicitacaoId,
          infoBancariaId: pagamento.infoBancariaId,
          valor: pagamento.valor,
          dataLiberacao: pagamento.dataLiberacao,
          status: pagamento.status,
          metodoPagamento: pagamento.metodoPagamento,
          responsavelLiberacao: {
            id: responsavel?.id || 'N/A',
            nome: responsavel?.nome || 'Usuário não encontrado',
            role: responsavel?.role?.nome || 'N/A',
          },
          solicitacao: solicitacao
            ? {
                numeroProcesso: solicitacao.id,
                cidadaoNome: solicitacao.beneficiario?.nome || 'N/A',
                tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
                unidade: solicitacao.unidade?.nome || 'N/A',
              }
            : undefined,
          quantidadeComprovantes: pagamento.comprovantes?.length || 0,
          observacoes: pagamento.observacoes,
          createdAt: pagamento.created_at,
          updatedAt: pagamento.updated_at,
        } as PagamentoResponseDto;
      }),
    );

    return {
      items: responseDtos,
      total: pagamentos.total,
      page: pagamentos.page,
      limit: pagamentos.limit,
    };
  }

  /**
   * Retorna detalhes de um pagamento específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna detalhes de um pagamento específico' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do pagamento',
    type: PagamentoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const pagamento = await this.pagamentoService.findOneWithRelations(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Buscar dados reais do responsável pela liberação
    const responsavel = await this.usuarioService.findById(
      pagamento.liberadoPor,
    );

    // Buscar dados da solicitação
    const solicitacao = await this.solicitacaoService.findById(
      pagamento.solicitacaoId,
    );

    // Buscar responsável pela confirmação se existir
    let responsavelConfirmacao: any = null;
    if (pagamento.confirmacoes?.length) {
      responsavelConfirmacao = await this.usuarioService.findById(
        pagamento.confirmacoes[0].responsavelId,
      );
    }

    // Mapear para DTO de resposta com dados reais
    return {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId,
      infoBancariaId: pagamento.infoBancariaId,
      valor: pagamento.valor,
      dataLiberacao: pagamento.dataLiberacao,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      responsavelLiberacao: {
        id: responsavel?.id || 'N/A',
        nome: responsavel?.nome || 'Usuário não encontrado',
        role: responsavel?.role?.nome || 'N/A',
      },
      solicitacao: solicitacao
        ? {
            numeroProcesso: solicitacao.processo_judicial?.numero_processo || null,
            cidadaoNome: solicitacao.beneficiario?.nome || 'N/A',
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
            unidade: solicitacao.unidade?.nome || 'N/A',
          }
        : undefined,
      quantidadeComprovantes: pagamento.comprovantes?.length || 0,
      confirmacaoRecebimento: pagamento.confirmacoes?.length
        ? {
            id: pagamento.confirmacoes[0].id,
            dataConfirmacao: pagamento.confirmacoes[0].dataConfirmacao,
            metodoConfirmacao: pagamento.confirmacoes[0].metodoConfirmacao,
            responsavel: {
              id: responsavelConfirmacao?.id || 'N/A',
              nome: responsavelConfirmacao?.nome || 'Usuário não encontrado',
            },
          }
        : undefined,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at,
    } as PagamentoResponseDto;
  }

  /**
   * Registra a liberação de um pagamento para uma solicitação aprovada
   */
  @Post('liberar/:solicitacaoId')
  @ApiOperation({
    summary:
      'Registra a liberação de um pagamento para uma solicitação aprovada',
  })
  @ApiParam({
    name: 'solicitacaoId',
    type: 'string',
    description: 'ID da solicitação',
  })
  @ApiResponse({
    status: 201,
    description: 'Pagamento registrado com sucesso',
    type: PagamentoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou solicitação não aprovada',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async createPagamento(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Body() createDto: PagamentoCreateDto,
    @Request() req: any,
  ) {
    // Usar o ID do usuário atual autenticado
    const usuarioId = req.user.id;

    const pagamento = await this.pagamentoService.createPagamento(
      solicitacaoId,
      createDto,
      usuarioId,
    );

    // Buscar dados reais do usuário responsável
    const responsavel = await this.usuarioService.findById(usuarioId);

    // Buscar dados da solicitação
    const solicitacao = await this.solicitacaoService.findById(
      pagamento.solicitacaoId,
    );

    // Mapear para DTO de resposta com dados reais
    return {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId,
      infoBancariaId: pagamento.infoBancariaId,
      valor: pagamento.valor,
      dataLiberacao: pagamento.dataLiberacao,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      responsavelLiberacao: {
        id: responsavel?.id || usuarioId,
        nome: responsavel?.nome || 'Usuário não encontrado',
        role: responsavel?.role?.nome || 'N/A',
      },
      solicitacao: solicitacao
        ? {
            numeroProcesso: solicitacao.processo_judicial?.numero_processo || null,
            cidadaoNome: solicitacao.beneficiario?.nome || 'N/A',
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
            unidade: solicitacao.unidade?.nome || 'N/A',
          }
        : undefined,
      quantidadeComprovantes: 0,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at,
    } as PagamentoResponseDto;
  }

  /**
   * Cancela um pagamento existente
   */
  @Patch(':id/cancelar')
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
    @Request() req: any,
  ) {
    // Usar o ID do usuário atual autenticado
    const usuarioId = req.user.id;

    const pagamento = await this.pagamentoService.cancelarPagamento(
      id,
      usuarioId,
      cancelDto.motivoCancelamento,
    );

    // Buscar dados reais do responsável pela liberação original
    const responsavelLiberacao = await this.usuarioService.findById(
      pagamento.liberadoPor,
    );

    // Buscar dados da solicitação
    const solicitacao = await this.solicitacaoService.findById(
      pagamento.solicitacaoId,
    );

    // Mapear para DTO de resposta com dados reais
    return {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId,
      infoBancariaId: pagamento.infoBancariaId,
      valor: pagamento.valor,
      dataLiberacao: pagamento.dataLiberacao,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      responsavelLiberacao: {
        id: responsavelLiberacao?.id || 'N/A',
        nome: responsavelLiberacao?.nome || 'Usuário não encontrado',
        role: responsavelLiberacao?.role?.nome || 'N/A',
      },
      solicitacao: solicitacao
        ? {
            numeroProcesso: solicitacao.processo_judicial?.numero_processo || null,
            cidadaoNome: solicitacao.beneficiario?.nome || 'N/A',
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
            unidade: solicitacao.unidade?.nome || 'N/A',
          }
        : undefined,
      quantidadeComprovantes: pagamento.comprovantes?.length || 0,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at,
    } as PagamentoResponseDto;
  }

  /**
   * Lista pagamentos pendentes (liberados mas não confirmados)
   */
  @Get('pendentes')
  @ApiOperation({
    summary: 'Lista pagamentos pendentes (liberados mas não confirmados)',
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
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(false)
  async findPendentes(
    @Query('unidadeId') unidadeId?: string,
    @Query('tipoBeneficioId') tipoBeneficioId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagamentos = await this.pagamentoService.findByStatus(
      StatusPagamentoEnum.AGENDADO,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );

    // Mapear para DTOs de resposta
    const responseDtos = pagamentos.data.map((pagamento) => {
      return {
        id: pagamento.id,
        solicitacaoId: pagamento.solicitacaoId,
        infoBancariaId: pagamento.infoBancariaId,
        valor: pagamento.valor,
        dataLiberacao: pagamento.dataLiberacao,
        status: pagamento.status,
        metodoPagamento: pagamento.metodoPagamento,
        responsavelLiberacao: {
          id: 'placeholder',
          nome: 'Técnico Responsável',
          role: 'Técnico SEMTAS',
        },
        quantidadeComprovantes: 0,
        observacoes: pagamento.observacoes,
        createdAt: pagamento.created_at,
        updatedAt: pagamento.updated_at,
      } as PagamentoResponseDto;
    });

    return {
      items: responseDtos,
      total: pagamentos.total,
      page: pagamentos.page,
      limit: pagamentos.limit,
    };
  }

  /**
   * Obtém informações bancárias/PIX cadastradas para o beneficiário
   */
  @Get('info-bancarias/:beneficiarioId')
  @ApiOperation({
    summary: 'Obtém informações bancárias/PIX cadastradas para o beneficiário',
  })
  @ApiParam({
    name: 'beneficiarioId',
    type: 'string',
    description: 'ID do beneficiário',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de informações bancárias',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          banco: { type: 'string' },
          agencia: { type: 'string' },
          conta: { type: 'string' },
          tipo_conta: { type: 'string' },
          pix_tipo: { type: 'string' },
          pix_chave: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Beneficiário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async getInfoBancarias(
    @Param('beneficiarioId', ParseUUIDPipe) beneficiarioId: string,
  ) {
    // Esta implementação seria integrada com o serviço de cidadão/beneficiário
    // const infoBancarias = await this.cidadaoService.getInfoBancarias(beneficiarioId);

    // Retorno mockado para demonstração
    return [
      {
        id: 'placeholder-id-1',
        banco: 'Banco do Brasil',
        agencia: '1234',
        conta: '12345-6',
        tipo_conta: 'Corrente',
        created_at: new Date().toISOString(),
      },
      {
        id: 'placeholder-id-2',
        pix_tipo: 'email',
        pix_chave: 'b****@****.com', // mascarado para segurança
        created_at: new Date().toISOString(),
      },
    ];
  }
}
