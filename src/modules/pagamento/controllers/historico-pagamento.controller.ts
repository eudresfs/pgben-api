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
  HistoricoPagamentoResponseDto,
  HistoricoPagamentoExportacaoDto,
  HistoricoPagamentoExportacaoResponseDto,
  TipoExportacaoEnum,
  HistoricoPagamentoPaginadoResponseDto,
} from '../dtos';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { AuditoriaPagamento } from '../decorators/auditoria.decorator';

/**
 * Controller para gerenciamento do histórico individual de pagamentos
 *
 * Responsável por fornecer endpoints para consulta do histórico
 * de eventos de pagamentos específicos, operando exclusivamente
 * no escopo individual para garantir transparência e rastreabilidade.
 *
 * @author Equipe PGBen
 */
@ApiTags('Pagamentos')
@Controller('pagamentos')
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
  @Get(':pagamento_id/historico')
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
  ): Promise<HistoricoPagamentoPaginadoResponseDto> {
    const resultado = await this.historicoPagamentoService.buscarHistoricoPorPagamentoFormatado(
      pagamento_id,
      {
        tipoEvento: tipo_evento,
        dataInicio: data_inicial ? new Date(data_inicial) : undefined,
        dataFim: data_final ? new Date(data_final) : undefined,
      }
    );
    return {
      data: resultado.data,
      meta: resultado.meta,
      message: `Histórico do pagamento obtido com sucesso. ${resultado.data.length} evento(s) encontrado(s)`,
    };
  }

  /**
   * Exporta histórico de um pagamento específico
   *
   * Gera relatórios em PDF ou Excel do histórico de um pagamento
   * específico com base nos filtros especificados.
   */
  @Post(':pagamento_id/exportar')
  @AuditoriaPagamento.Exportacao('Exportação de histórico de pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.historico.exportar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Exporta histórico de um pagamento específico',
    description: `Gera relatórios do histórico de um pagamento específico para auditoria e análise.
    
    **Formatos disponíveis:**
    - PDF: Relatório formatado para impressão e apresentação
    - Excel: Planilha para análise de dados e manipulação
    
    **Funcionalidades:**
    - Aplicação de filtros personalizados
    - Títulos e observações customizáveis
    - Metadados de geração incluídos
    - Download direto ou URL temporária`,
  })
  @ApiParam({
    name: 'pagamento_id',
    type: 'string',
    description: 'ID único do pagamento',
    example: 'uuid-pagamento-123',
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
    @Param('pagamento_id', ParseUUIDPipe) pagamento_id: string,
    @Body() parametros: HistoricoPagamentoExportacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<HistoricoPagamentoExportacaoResponseDto | any> {
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

    // Adicionar pagamento_id aos parâmetros
     const dadosExportacao = {
       ...parametros,
       pagamento_id: pagamento_id,
     };
     
     const resultado = await this.historicoPagamentoService.exportarHistorico(
       dadosExportacao,
       usuario.id,
     );
     
     return {
       data: resultado,
       meta: null,
       message: `Exportação do histórico gerada com sucesso. ${resultado.total_registros} registro(s) exportado(s)`,
     };
  }

  /**
   * Download direto de arquivo de exportação
   *
   * Endpoint para download direto de arquivos de histórico
   * previamente gerados.
   */
  @Get(':pagamento_id/download/:arquivo_id')
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
    name: 'pagamento_id',
    type: 'string',
    description: 'ID único do pagamento',
    example: 'uuid-pagamento-123',
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
    @Param('pagamento_id', ParseUUIDPipe) pagamento_id: string,
    @Param('arquivo_id', ParseUUIDPipe) arquivo_id: string,
    @Res() response: Response,
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    // TODO: Implementar download de arquivo específico do pagamento
    throw new BadRequestException('Funcionalidade de download será implementada em versão futura');
  }

  /**
   * Estatísticas do histórico de um pagamento específico
   *
   * Retorna métricas e estatísticas sobre o histórico de um pagamento
   * específico para dashboards e relatórios gerenciais.
   */
  @Get(':pagamento_id/estatisticas')
  @AuditoriaPagamento.Consulta('Consulta de estatísticas do histórico')
  @RequiresPermission({
    permissionName: 'pagamento.historico.estatisticas',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Estatísticas do histórico de um pagamento específico',
    description: `Retorna métricas agregadas sobre o histórico de um pagamento específico.
    
    **Métricas incluídas:**
    - Total de eventos por tipo
    - Distribuição de transições de status
    - Usuários mais ativos
    - Tendências temporais
    - Tempo médio entre eventos`,
  })
  @ApiParam({
    name: 'pagamento_id',
    type: 'string',
    description: 'ID único do pagamento',
    example: 'uuid-pagamento-123',
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    type: String,
    description: 'Período para análise (ultimo_mes, ultimo_trimestre, ultimo_ano)',
    example: 'ultimo_mes',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      example: {
        total_eventos: 15,
        eventos_por_tipo: {
          ALTERACAO_STATUS: 8,
          APROVACAO: 3,
          UPLOAD_COMPROVANTE: 2,
          CANCELAMENTO: 2,
        },
        transicoes_status: [
          { de: 'PENDENTE', para: 'LIBERADO', data: '2024-01-15T10:30:00.000Z' },
          { de: 'LIBERADO', para: 'PAGO', data: '2024-01-20T14:45:00.000Z' },
        ],
        usuarios_envolvidos: [
          { usuario_id: 'uuid-1', nome: 'João Silva', total_eventos: 8 },
        ],
        periodo_analise: {
          data_inicial: '2024-01-01T00:00:00.000Z',
          data_final: '2024-01-31T23:59:59.999Z',
        },
      },
    },
  })
  async obterEstatisticas(
    @Param('pagamento_id', ParseUUIDPipe) pagamento_id: string,
    @Query('periodo') periodo?: string,
    @Query('data_inicial') data_inicial?: string,
    @Query('data_final') data_final?: string,
  ): Promise<any> {
    // Buscar histórico do pagamento para gerar estatísticas
    const { data: historico } = await this.historicoPagamentoService.buscarHistoricoPorPagamentoFormatado(
      pagamento_id,
      {
        dataInicio: data_inicial ? new Date(data_inicial) : undefined,
        dataFim: data_final ? new Date(data_final) : undefined,
      }
    );

    // Gerar estatísticas básicas
    const estatisticas = {
      total_eventos: historico.length,
      eventos_por_tipo: historico.reduce((acc, evento) => {
        const tipo = evento.tipo_evento || 'nao_identificado';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      transicoes_status: historico
        .filter(evento => evento.status_anterior && evento.status_atual)
        .map(evento => ({
          de: evento.status_anterior,
          para: evento.status_atual,
          data: evento.data_evento,
        })),
      usuarios_envolvidos: historico
        .filter(evento => evento.usuario_id)
        .reduce((acc, evento) => {
          const existente = acc.find(u => u.usuario_id === evento.usuario_id);
          if (existente) {
            existente.total_eventos++;
          } else {
            acc.push({
              usuario_id: evento.usuario_id,
              nome: evento.nome_usuario || 'Usuário não identificado',
              total_eventos: 1,
            });
          }
          return acc;
        }, [] as any[]),
      periodo_analise: {
        data_inicial: data_inicial || historico[0]?.data_evento,
        data_final: data_final || historico[historico.length - 1]?.data_evento,
      },
    };

    return {
      data: estatisticas,
      meta: null,
      message: 'Estatísticas do histórico de pagamento obtidas com sucesso',
    };
  }
}