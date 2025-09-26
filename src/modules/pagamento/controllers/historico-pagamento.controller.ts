import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { Usuario } from '../../../entities';
import { HistoricoPagamentoService } from '../services/historico-pagamento.service';
import {
  HistoricoPagamentoFiltrosDto,
  HistoricoPagamentoResponseDto,
  HistoricoPagamentoPaginadoResponseDto,
  HistoricoPagamentoExportacaoDto,
  HistoricoPagamentoExportacaoResponseDto,
  TipoExportacaoEnum,
} from '../dtos';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { AuditoriaPagamento } from '../decorators/auditoria.decorator';

/**
 * Controller para gerenciamento do histórico de pagamentos
 *
 * Responsável por fornecer endpoints para consulta e exportação
 * do histórico completo de eventos relacionados aos pagamentos,
 * garantindo transparência e rastreabilidade no sistema.
 *
 * @author Equipe PGBen
 */
@ApiTags('Histórico de Pagamentos')
@Controller('pagamentos/historico')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor, AuditoriaInterceptor)
export class HistoricoPagamentoController {
  constructor(
    private readonly historicoPagamentoService: HistoricoPagamentoService,
  ) {}

  /**
   * Busca histórico de um pagamento específico
   *
   * Retorna todos os eventos registrados para um pagamento,
   * ordenados cronologicamente do mais antigo ao mais recente.
   */
  @Get('pagamento/:pagamento_id')
  @AuditoriaPagamento.Consulta('Consulta de histórico por pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.historico.consultar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Busca histórico de um pagamento específico',
    description: `Retorna o histórico completo de eventos de um pagamento específico.
    
    **Funcionalidades:**
    - Lista todos os eventos do pagamento em ordem cronológica
    - Inclui informações do usuário responsável por cada evento
    - Mostra transições de status e dados contextuais
    - Suporta filtros por tipo de evento e período`,
  })
  @ApiParam({
    name: 'pagamento_id',
    type: 'string',
    description: 'ID único do pagamento',
    example: 'uuid-pagamento-123',
  })
  @ApiQuery({
    name: 'tipo_evento',
    required: false,
    enum: TipoEventoHistoricoEnum,
    description: 'Filtrar por tipo de evento específico',
  })
  @ApiQuery({
    name: 'data_inicial',
    required: false,
    type: String,
    description: 'Data inicial para filtro (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'data_final',
    required: false,
    type: String,
    description: 'Data final para filtro (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico do pagamento retornado com sucesso',
    type: [HistoricoPagamentoResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Pagamento não encontrado',
  })
  async buscarHistoricoPorPagamento(
    @Param('pagamento_id', ParseUUIDPipe) pagamento_id: string,
    @Query('tipo_evento') tipo_evento?: TipoEventoHistoricoEnum,
    @Query('data_inicial') data_inicial?: string,
    @Query('data_final') data_final?: string,
  ): Promise<HistoricoPagamentoResponseDto[]> {
    const { data } = await this.historicoPagamentoService.buscarHistoricoPorPagamentoFormatado(
      pagamento_id,
      {
        tipoEvento: tipo_evento,
        dataInicio: data_inicial ? new Date(data_inicial) : undefined,
        dataFim: data_final ? new Date(data_final) : undefined,
      },
    );

    return data;
  }

  /**
   * Busca histórico com filtros avançados
   *
   * Permite consultas complexas no histórico de pagamentos
   * com múltiplos critérios de filtro e paginação.
   */
  @Post('buscar')
  @AuditoriaPagamento.Consulta('Consulta de histórico com filtros avançados')
  @RequiresPermission({
    permissionName: 'pagamento.historico.consultar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Busca histórico com filtros avançados',
    description: `Endpoint para consultas complexas no histórico de pagamentos.
    
    **Funcionalidades:**
    - Filtros por múltiplos critérios (usuário, tipo de evento, status, período)
    - Paginação otimizada para grandes volumes de dados
    - Ordenação personalizável
    - Busca textual em observações
    - Filtros por transições de status específicas`,
  })
  @ApiBody({
    type: HistoricoPagamentoFiltrosDto,
    description: 'Critérios de filtro para busca no histórico',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico filtrado retornado com sucesso',
    type: HistoricoPagamentoPaginadoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
  })
  async buscarHistoricoComFiltros(
    @Body() filtros: HistoricoPagamentoFiltrosDto,
  ): Promise<HistoricoPagamentoPaginadoResponseDto> {
    return await this.historicoPagamentoService.buscarHistoricoComFiltrosFormatado(
      filtros,
    );
  }

  /**
   * Exporta histórico de pagamentos
   *
   * Gera relatórios em PDF ou Excel do histórico de pagamentos
   * com base nos filtros especificados.
   */
  @Post('exportar')
  @AuditoriaPagamento.Exportacao('Exportação de histórico de pagamentos')
  @RequiresPermission({
    permissionName: 'pagamento.historico.exportar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Exporta histórico de pagamentos',
    description: `Gera relatórios do histórico de pagamentos para auditoria e análise.
    
    **Formatos disponíveis:**
    - PDF: Relatório formatado para impressão e apresentação
    - Excel: Planilha para análise de dados e manipulação
    
    **Funcionalidades:**
    - Aplicação de filtros personalizados
    - Títulos e observações customizáveis
    - Metadados de geração incluídos
    - Download direto ou URL temporária`,
  })
  @ApiBody({
    type: HistoricoPagamentoExportacaoDto,
    description: 'Parâmetros para exportação do histórico',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo de exportação gerado com sucesso',
    type: HistoricoPagamentoExportacaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de exportação inválidos',
  })
  @ApiResponse({
    status: 413,
    description: 'Volume de dados muito grande para exportação',
  })
  async exportarHistorico(
    @Body() parametros: HistoricoPagamentoExportacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<HistoricoPagamentoExportacaoResponseDto> {
    // Validar parâmetros de exportação
    if (
      parametros.data_inicial &&
      parametros.data_final &&
      new Date(parametros.data_inicial) > new Date(parametros.data_final)
    ) {
      throw new BadRequestException(
        'Data inicial não pode ser posterior à data final',
      );
    }

    return await this.historicoPagamentoService.exportarHistorico(
      parametros,
      usuario.id,
    );
  }

  /**
   * Download direto de arquivo de exportação
   *
   * Endpoint para download direto de arquivos de histórico
   * previamente gerados.
   */
  @Get('download/:arquivo_id')
  @AuditoriaPagamento.Download('Download de arquivo de histórico')
  @RequiresPermission({
    permissionName: 'pagamento.historico.exportar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Download de arquivo de histórico',
    description: `Realiza o download direto de um arquivo de histórico previamente gerado.
    
    **Funcionalidades:**
    - Download seguro com validação de permissões
    - Controle de expiração de links
    - Auditoria de downloads
    - Suporte a diferentes formatos de arquivo`,
  })
  @ApiParam({
    name: 'arquivo_id',
    type: 'string',
    description: 'ID único do arquivo gerado',
    example: 'uuid-arquivo-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo baixado com sucesso',
    headers: {
      'Content-Type': {
        description: 'Tipo do arquivo (application/pdf ou application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)',
      },
      'Content-Disposition': {
        description: 'Nome do arquivo para download',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Arquivo não encontrado ou expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado ao arquivo',
  })
  async downloadArquivo(
    @Param('arquivo_id', ParseUUIDPipe) arquivo_id: string,
    @Res() response: Response,
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    // TODO: Implementar lógica de download seguro
    // Por enquanto, retorna erro não implementado
    throw new BadRequestException(
      'Funcionalidade de download direto será implementada em versão futura',
    );
  }

  /**
   * Estatísticas do histórico de pagamentos
   *
   * Retorna métricas e estatísticas sobre o histórico de pagamentos
   * para dashboards e relatórios gerenciais.
   */
  @Get('estatisticas')
  @AuditoriaPagamento.Consulta('Consulta de estatísticas do histórico')
  @RequiresPermission({
    permissionName: 'pagamento.historico.estatisticas',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Estatísticas do histórico de pagamentos',
    description: `Retorna métricas agregadas sobre o histórico de pagamentos.
    
    **Métricas incluídas:**
    - Total de eventos por tipo
    - Distribuição de transições de status
    - Usuários mais ativos
    - Tendências temporais
    - Tempo médio entre eventos`,
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    type: String,
    description: 'Período para análise (ultimo_mes, ultimo_trimestre, ultimo_ano)',
    example: 'ultimo_mes',
  })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    type: String,
    description: 'Filtrar por unidade específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      example: {
        total_eventos: 1250,
        eventos_por_tipo: {
          ALTERACAO_STATUS: 800,
          APROVACAO: 200,
          UPLOAD_COMPROVANTE: 150,
          CANCELAMENTO: 100,
        },
        transicoes_mais_comuns: [
          { de: 'PENDENTE', para: 'LIBERADO', quantidade: 450 },
          { de: 'LIBERADO', para: 'PAGO', quantidade: 380 },
        ],
        usuarios_mais_ativos: [
          { usuario_id: 'uuid-1', nome: 'João Silva', total_eventos: 120 },
        ],
        periodo_analise: {
          data_inicial: '2024-01-01T00:00:00.000Z',
          data_final: '2024-01-31T23:59:59.999Z',
        },
      },
    },
  })
  async obterEstatisticas(
    @Query('periodo') periodo?: string,
    @Query('unidade_id') unidade_id?: string,
    @Query('data_inicial') data_inicial?: string,
    @Query('data_final') data_final?: string,
  ): Promise<any> {
    // TODO: Implementar lógica de estatísticas
    // Por enquanto, retorna erro não implementado
    throw new BadRequestException(
      'Funcionalidade de estatísticas será implementada em versão futura',
    );
  }
}