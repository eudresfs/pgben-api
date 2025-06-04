import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfirmacaoService } from '../services/confirmacao.service';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { ConfirmacaoResponseDto } from '../dtos/confirmacao-response.dto';
import { NotFoundException } from '@nestjs/common';

/**
 * Controller para gerenciamento de confirmações de recebimento
 *
 * Implementa endpoints para registrar e consultar as confirmações
 * de recebimento de pagamentos pelos beneficiários.
 *
 * @author Equipe PGBen
 */
@ApiTags('Pagamentos')
@Controller('pagamentos/:pagamentoId/confirmacao')
export class ConfirmacaoController {
  constructor(private readonly confirmacaoService: ConfirmacaoService) {}

  /**
   * Lista confirmações para um determinado pagamento
   */
  @Get()
  @ApiOperation({
    summary: 'Lista confirmações de recebimento para um pagamento',
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de confirmações',
    type: [ConfirmacaoResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  // @UseGuards(RolesGuard)
  // @Roles('admin', 'gestor_semtas', 'tecnico')
  async findAll(@Param('pagamentoId', ParseUUIDPipe) pagamentoId: string) {
    const confirmacoes =
      await this.confirmacaoService.findByPagamento(pagamentoId);

    // Mapear para DTO de resposta
    return confirmacoes.map((confirmacao) => ({
      id: confirmacao.id,
      pagamentoId: confirmacao.pagamento_id,
      dataConfirmacao: confirmacao.data_confirmacao,
      metodoConfirmacao: confirmacao.metodo_confirmacao,
      responsavel: {
        id: confirmacao.confirmado_por,
        nome: 'Responsável Confirmação', // seria obtido da entidade Usuario
      },
      destinatario: confirmacao.destinatario_id
        ? {
            id: confirmacao.destinatario_id,
            nome: 'Nome do Destinatário', // seria obtido da entidade Cidadao
          }
        : undefined,
      observacoes: confirmacao.observacoes,
    }));
  }

  /**
   * Obtém uma confirmação específica por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtém detalhes de uma confirmação específica' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da confirmação' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da confirmação',
    type: ConfirmacaoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Confirmação não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  // @UseGuards(RolesGuard)
  // @Roles('admin', 'gestor_semtas', 'tecnico')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const confirmacao = await this.confirmacaoService.findOneWithRelations(id);

    if (!confirmacao) {
      throw new NotFoundException('Confirmação não encontrada');
    }

    // Mapear para DTO de resposta
    return {
      id: confirmacao.id,
      pagamentoId: confirmacao.pagamento_id,
      dataConfirmacao: confirmacao.data_confirmacao,
      metodoConfirmacao: confirmacao.metodo_confirmacao,
      responsavel: {
        id: confirmacao.confirmado_por,
        nome: 'Responsável Confirmação', // seria obtido da entidade Usuario
      },
      destinatario: confirmacao.destinatario_id
        ? {
            id: confirmacao.destinatario_id,
            nome: 'Nome do Destinatário', // seria obtido da entidade Cidadao
          }
        : undefined,
      pagamento: confirmacao.pagamento
        ? {
            id: confirmacao.pagamento.id,
            valor: confirmacao.pagamento.valor,
            dataLiberacao: confirmacao.pagamento.dataLiberacao,
            metodoPagamento: confirmacao.pagamento.metodoPagamento,
          }
        : undefined,
      observacoes: confirmacao.observacoes,
    };
  }

  /**
   * Registra uma nova confirmação de recebimento
   */
  @Post()
  @ApiOperation({
    summary: 'Registra uma confirmação de recebimento para um pagamento',
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 201,
    description: 'Confirmação registrada com sucesso',
    type: ConfirmacaoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Pagamento já confirmado ou não pode ser confirmado',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  // @UseGuards(RolesGuard)
  // @Roles('admin', 'gestor_semtas', 'tecnico')
  async create(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @Body() createDto: ConfirmacaoRecebimentoDto,
    // @CurrentUser() usuario: Usuario
  ) {
    // Usar o ID do usuário atual
    const usuarioId = 'placeholder'; // usuario.id;

    const confirmacao = await this.confirmacaoService.registrarConfirmacao(
      pagamentoId,
      createDto,
      usuarioId,
    );

    // Mapear para DTO de resposta
    return {
      id: confirmacao.id,
      pagamentoId: confirmacao.pagamento_id,
      dataConfirmacao: confirmacao.data_confirmacao,
      metodoConfirmacao: confirmacao.metodo_confirmacao,
      responsavel: {
        id: usuarioId,
        nome: 'Responsável Confirmação', // seria obtido da entidade Usuario
      },
      destinatario: confirmacao.destinatario_id
        ? {
            id: confirmacao.destinatario_id,
            nome: 'Nome do Destinatário', // seria obtido da entidade Cidadao
          }
        : undefined,
      observacoes: confirmacao.observacoes,
    };
  }

  /**
   * Verifica se um pagamento tem confirmação
   */
  @Get('verificar')
  @ApiOperation({
    summary: 'Verifica se um pagamento tem confirmação de recebimento',
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da confirmação',
    schema: {
      type: 'object',
      properties: {
        temConfirmacao: { type: 'boolean' },
        status: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  // @UseGuards(RolesGuard)
  // @Roles('admin', 'gestor_semtas', 'tecnico')
  async verificaConfirmacao(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
  ) {
    const temConfirmacao =
      await this.confirmacaoService.temConfirmacao(pagamentoId);

    return {
      temConfirmacao,
      status: temConfirmacao ? 'CONFIRMADO' : 'PENDENTE_CONFIRMACAO',
    };
  }
}
