import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { PagamentoAccessGuard } from '../guards/pagamento-access.guard';
import { ApenasAdmin, AuditorOuAdmin, OperadorOuAdmin, VerificarUnidade } from '../decorators/pagamento-access.decorator';
import { NotFoundException } from '@nestjs/common';

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
    // Outros serviços necessários serão injetados aqui
  ) {}

  /**
   * Lista pagamentos com filtros e paginação
   */
  @Get()
  @ApiOperation({ summary: 'Lista pagamentos com filtros' })
  @ApiQuery({ name: 'status', required: false, enum: StatusPagamentoEnum })
  @ApiQuery({ name: 'unidadeId', required: false })
  @ApiQuery({ name: 'dataInicio', required: false, type: Date })
  @ApiQuery({ name: 'dataFim', required: false, type: Date })
  @ApiQuery({ name: 'metodoPagamento', required: false })
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
          items: { type: 'object', $ref: '#/components/schemas/PagamentoResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    }
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
      limit: limit ? Number(limit) : 10
    });

    // Mapear para DTOs de resposta com dados sensíveis mascarados
    const responseDtos = pagamentos.items.map(pagamento => {
      // Implementação do mapeamento para PagamentoResponseDto
      return {
        id: pagamento.id,
        solicitacaoId: pagamento.solicitacaoId,
        infoBancariaId: pagamento.infoBancariaId,
        valor: pagamento.valor,
        dataLiberacao: pagamento.dataLiberacao,
        status: pagamento.status,
        metodoPagamento: pagamento.metodoPagamento,
        responsavelLiberacao: {
          id: 'placeholder', // seria obtido da entidade Usuario
          nome: 'Técnico Responsável',
          cargo: 'Técnico SEMTAS'
        },
        quantidadeComprovantes: 0, // seria calculado pela relação
        observacoes: pagamento.observacoes,
        createdAt: pagamento.created_at,
        updatedAt: pagamento.updated_at
      } as PagamentoResponseDto;
    });

    return {
      items: responseDtos,
      total: pagamentos.total,
      page: pagamentos.page,
      limit: pagamentos.limit
    };
  }

  /**
   * Retorna detalhes de um pagamento específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna detalhes de um pagamento específico' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Detalhes do pagamento', type: PagamentoResponseDto })
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

    // Mapear para DTO de resposta com dados sensíveis mascarados
    return {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId,
      infoBancariaId: pagamento.infoBancariaId,
      valor: pagamento.valor,
      dataLiberacao: pagamento.dataLiberacao,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      responsavelLiberacao: {
        id: 'placeholder', // seria obtido da entidade Usuario
        nome: 'Técnico Responsável',
        cargo: 'Técnico SEMTAS'
      },
      quantidadeComprovantes: pagamento.comprovantes?.length || 0,
      confirmacaoRecebimento: pagamento.confirmacoes?.length ? {
        id: pagamento.confirmacoes[0].id,
        dataConfirmacao: pagamento.confirmacoes[0].dataConfirmacao,
        metodoConfirmacao: pagamento.confirmacoes[0].metodoConfirmacao,
        responsavel: {
          id: 'placeholder',
          nome: 'Responsável Confirmação'
        }
      } : undefined,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at
    } as PagamentoResponseDto;
  }

  /**
   * Registra a liberação de um pagamento para uma solicitação aprovada
   */
  @Post('liberar/:solicitacaoId')
  @ApiOperation({ summary: 'Registra a liberação de um pagamento para uma solicitação aprovada' })
  @ApiParam({ name: 'solicitacaoId', type: 'string', description: 'ID da solicitação' })
  @ApiResponse({ status: 201, description: 'Pagamento registrado com sucesso', type: PagamentoResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou solicitação não aprovada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async createPagamento(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Body() createDto: PagamentoCreateDto,
    // @CurrentUser() usuario: Usuario
  ) {
    // Usar o ID do usuário atual
    const usuarioId = 'placeholder'; // usuario.id;
    
    const pagamento = await this.pagamentoService.createPagamento(
      solicitacaoId,
      createDto,
      usuarioId
    );

    // Mapear para DTO de resposta
    return {
      id: pagamento.id,
      solicitacaoId: pagamento.solicitacaoId,
      infoBancariaId: pagamento.infoBancariaId,
      valor: pagamento.valor,
      dataLiberacao: pagamento.dataLiberacao,
      status: pagamento.status,
      metodoPagamento: pagamento.metodoPagamento,
      responsavelLiberacao: {
        id: usuarioId,
        nome: 'Técnico Responsável',
        cargo: 'Técnico SEMTAS'
      },
      quantidadeComprovantes: 0,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at
    } as PagamentoResponseDto;
  }

  /**
   * Cancela um pagamento existente
   */
  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela um pagamento existente' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado com sucesso', type: PagamentoResponseDto })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 409, description: 'Pagamento não pode ser cancelado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @ApenasAdmin()
  @VerificarUnidade(true)
  async cancelPagamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: { motivoCancelamento: string },
    // @CurrentUser() usuario: Usuario
  ) {
    // Usar o ID do usuário atual
    const usuarioId = 'placeholder'; // usuario.id;
    
    const pagamento = await this.pagamentoService.cancelarPagamento(
      id,
      usuarioId,
      cancelDto.motivoCancelamento
    );

    // Mapear para DTO de resposta
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
        cargo: 'Técnico SEMTAS'
      },
      quantidadeComprovantes: 0,
      observacoes: pagamento.observacoes,
      createdAt: pagamento.created_at,
      updatedAt: pagamento.updated_at
    } as PagamentoResponseDto;
  }

  /**
   * Lista pagamentos pendentes (liberados mas não confirmados)
   */
  @Get('pendentes')
  @ApiOperation({ summary: 'Lista pagamentos pendentes (liberados mas não confirmados)' })
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
          items: { type: 'object', $ref: '#/components/schemas/PagamentoResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    }
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
    const pagamentos = await this.pagamentoService.findPendentes({
      unidadeId,
      tipoBeneficioId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });

    // Mapear para DTOs de resposta
    const responseDtos = pagamentos.items.map(pagamento => {
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
          cargo: 'Técnico SEMTAS'
        },
        quantidadeComprovantes: 0,
        observacoes: pagamento.observacoes,
        createdAt: pagamento.created_at,
        updatedAt: pagamento.updated_at
      } as PagamentoResponseDto;
    });

    return {
      items: responseDtos,
      total: pagamentos.total,
      page: pagamentos.page,
      limit: pagamentos.limit
    };
  }

  /**
   * Obtém informações bancárias/PIX cadastradas para o beneficiário
   */
  @Get('info-bancarias/:beneficiarioId')
  @ApiOperation({ summary: 'Obtém informações bancárias/PIX cadastradas para o beneficiário' })
  @ApiParam({ name: 'beneficiarioId', type: 'string', description: 'ID do beneficiário' })
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
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Beneficiário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @UseGuards(PagamentoAccessGuard)
  @OperadorOuAdmin()
  @VerificarUnidade(true)
  async getInfoBancarias(@Param('beneficiarioId', ParseUUIDPipe) beneficiarioId: string) {
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
        created_at: new Date().toISOString()
      },
      {
        id: 'placeholder-id-2',
        pix_tipo: 'email',
        pix_chave: 'b****@****.com', // mascarado para segurança
        created_at: new Date().toISOString()
      }
    ];
  }
}
