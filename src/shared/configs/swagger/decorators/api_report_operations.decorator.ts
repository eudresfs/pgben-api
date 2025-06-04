import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import {
  RelatorioSolicitacoesResponseDto,
  DashboardMetricasResponseDto,
  RelatorioFinanceiroResponseDto,
  ApiErrorResponse,
  ValidationErrorResponse,
  UnauthorizedErrorResponse,
} from '../schemas';

/**
 * Decorator para operação de geração de relatório de solicitações
 */
export function ApiGerarRelatorioSolicitacoes() {
  return applyDecorators(
    ApiOperation({
      summary: 'Gerar relatório de solicitações',
      description:
        'Gera um relatório detalhado das solicitações de benefícios com base nos filtros especificados. Suporta múltiplos formatos de saída.',
      operationId: 'gerarRelatorioSolicitacoes',
    }),
    ApiQuery({
      name: 'dataInicio',
      description: 'Data inicial do período (formato: YYYY-MM-DD)',
      type: 'string',
      format: 'date',
      example: '2025-01-01',
      required: true,
    }),
    ApiQuery({
      name: 'dataFim',
      description: 'Data final do período (formato: YYYY-MM-DD)',
      type: 'string',
      format: 'date',
      example: '2025-01-31',
      required: true,
    }),
    ApiQuery({
      name: 'tipoBeneficioId',
      description: 'Filtrar por tipo de benefício específico',
      type: 'string',
      example: '507f1f77bcf86cd799439011',
      required: false,
    }),
    ApiQuery({
      name: 'status',
      description: 'Filtrar por status das solicitações',
      enum: ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'CANCELADA'],
      type: 'string',
      example: 'APROVADA',
      required: false,
    }),
    ApiQuery({
      name: 'analistaId',
      description: 'Filtrar por analista responsável',
      type: 'string',
      example: '507f1f77bcf86cd799439014',
      required: false,
    }),
    ApiQuery({
      name: 'formato',
      description: 'Formato de saída do relatório',
      enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
      type: 'string',
      example: 'PDF',
      required: false,
    }),
    ApiQuery({
      name: 'incluirDetalhesCidadao',
      description: 'Incluir detalhes dos cidadãos no relatório',
      type: 'boolean',
      example: true,
      required: false,
    }),
    ApiQuery({
      name: 'incluirDocumentos',
      description: 'Incluir lista de documentos anexados',
      type: 'boolean',
      example: false,
      required: false,
    }),
    ApiQuery({
      name: 'agruparPor',
      description: 'Agrupar resultados por campo específico',
      enum: ['tipoBeneficio', 'status', 'analista', 'mes', 'bairro'],
      type: 'string',
      example: 'tipoBeneficio',
      required: false,
    }),
    ApiBearerAuth(),
    ApiProduces(
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ),
    ApiResponse({
      status: 200,
      description: 'Relatório gerado com sucesso',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/RelatorioSolicitacoesResponseDto',
          },
        },
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary',
          },
          example: 'Arquivo PDF do relatório',
        },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
          example: 'Arquivo Excel do relatório',
        },
        'text/csv': {
          schema: {
            type: 'string',
          },
          example: 'Dados CSV do relatório',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Parâmetros de relatório inválidos',
      type: ValidationErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para gerar relatórios',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 422,
      description: 'Período muito extenso ou dados insuficientes',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}

/**
 * Decorator para operação de obtenção de métricas do dashboard
 */
export function ApiObterDashboardMetricas() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obter métricas do dashboard',
      description:
        'Retorna métricas consolidadas para exibição no dashboard principal, incluindo estatísticas de solicitações, aprovações e comparações temporais.',
      operationId: 'obterDashboardMetricas',
    }),
    ApiQuery({
      name: 'periodo',
      description: 'Período para cálculo das métricas (em dias)',
      type: 'integer',
      minimum: 1,
      maximum: 365,
      example: 30,
      required: false,
    }),
    ApiQuery({
      name: 'incluirComparacao',
      description: 'Incluir comparação com período anterior',
      type: 'boolean',
      example: true,
      required: false,
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Métricas do dashboard retornadas com sucesso',
      type: DashboardMetricasResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Parâmetros de consulta inválidos',
      type: ValidationErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para acessar métricas',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}

/**
 * Decorator para operação de geração de relatório financeiro
 */
export function ApiGerarRelatorioFinanceiro() {
  return applyDecorators(
    ApiOperation({
      summary: 'Gerar relatório financeiro',
      description:
        'Gera um relatório financeiro detalhado com informações sobre valores concedidos, pagos e projeções orçamentárias.',
      operationId: 'gerarRelatorioFinanceiro',
    }),
    ApiQuery({
      name: 'ano',
      description: 'Ano de referência do relatório',
      type: 'integer',
      minimum: 2020,
      maximum: 2030,
      example: 2025,
      required: true,
    }),
    ApiQuery({
      name: 'mes',
      description:
        'Mês específico (1-12), se não informado considera o ano todo',
      type: 'integer',
      minimum: 1,
      maximum: 12,
      example: 1,
      required: false,
    }),
    ApiQuery({
      name: 'tipoBeneficioId',
      description: 'Filtrar por tipo de benefício específico',
      type: 'string',
      example: '507f1f77bcf86cd799439011',
      required: false,
    }),
    ApiQuery({
      name: 'incluirProjecoes',
      description: 'Incluir projeções para os próximos meses',
      type: 'boolean',
      example: true,
      required: false,
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Relatório financeiro gerado com sucesso',
      type: RelatorioFinanceiroResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Parâmetros de relatório inválidos',
      type: ValidationErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para gerar relatórios financeiros',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 422,
      description: 'Dados insuficientes para o período solicitado',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}

/**
 * Decorator para operação de download de relatório
 */
export function ApiDownloadRelatorio() {
  return applyDecorators(
    ApiOperation({
      summary: 'Download de relatório',
      description:
        'Realiza o download de um relatório previamente gerado. O arquivo é retornado no formato especificado durante a geração.',
      operationId: 'downloadRelatorio',
    }),
    ApiParam({
      name: 'id',
      description: 'ID único do relatório gerado',
      type: 'string',
      example: '507f1f77bcf86cd799439020',
    }),
    ApiBearerAuth(),
    ApiProduces(
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ),
    ApiResponse({
      status: 200,
      description: 'Arquivo do relatório',
      content: {
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'text/csv': {
          schema: {
            type: 'string',
          },
        },
      },
      headers: {
        'Content-Disposition': {
          description: 'Nome do arquivo para download',
          schema: {
            type: 'string',
            example:
              'attachment; filename="relatorio_solicitacoes_2025_01.pdf"',
          },
        },
        'Content-Type': {
          description: 'Tipo MIME do arquivo',
          schema: {
            type: 'string',
            example: 'application/pdf',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para acessar este relatório',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Relatório não encontrado ou expirado',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}

/**
 * Decorator para operação de listagem de relatórios
 */
export function ApiListarRelatorios() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar relatórios gerados',
      description:
        'Lista os relatórios gerados anteriormente, com informações sobre status, formato e data de geração.',
      operationId: 'listarRelatorios',
    }),
    ApiQuery({
      name: 'tipo',
      description: 'Filtrar por tipo de relatório',
      enum: ['SOLICITACOES', 'FINANCEIRO', 'DASHBOARD'],
      type: 'string',
      example: 'SOLICITACOES',
      required: false,
    }),
    ApiQuery({
      name: 'status',
      description: 'Filtrar por status do relatório',
      enum: ['PROCESSANDO', 'CONCLUIDO', 'ERRO', 'EXPIRADO'],
      type: 'string',
      example: 'CONCLUIDO',
      required: false,
    }),
    ApiQuery({
      name: 'dataInicio',
      description: 'Data inicial para filtro por período de geração',
      type: 'string',
      format: 'date',
      example: '2025-01-01',
      required: false,
    }),
    ApiQuery({
      name: 'dataFim',
      description: 'Data final para filtro por período de geração',
      type: 'string',
      format: 'date',
      example: '2025-01-31',
      required: false,
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Lista de relatórios retornada com sucesso',
      schema: {
        allOf: [
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID único do relatório',
                    },
                    tipo: {
                      type: 'string',
                      enum: ['SOLICITACOES', 'FINANCEIRO', 'DASHBOARD'],
                      description: 'Tipo do relatório',
                    },
                    titulo: {
                      type: 'string',
                      description: 'Título do relatório',
                    },
                    formato: {
                      type: 'string',
                      enum: ['PDF', 'EXCEL', 'CSV', 'JSON'],
                      description: 'Formato do arquivo',
                    },
                    status: {
                      type: 'string',
                      enum: ['PROCESSANDO', 'CONCLUIDO', 'ERRO', 'EXPIRADO'],
                      description: 'Status atual do relatório',
                    },
                    tamanhoArquivo: {
                      type: 'integer',
                      description: 'Tamanho do arquivo em bytes',
                    },
                    dataGeracao: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Data e hora de geração',
                    },
                    dataExpiracao: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Data de expiração do arquivo',
                    },
                    geradoPor: {
                      type: 'string',
                      description: 'Nome do usuário que gerou',
                    },
                    urlDownload: {
                      type: 'string',
                      format: 'uri',
                      description: 'URL para download (quando disponível)',
                    },
                  },
                },
              },
            },
          },
          { $ref: '#/components/schemas/PaginatedResponse' },
        ],
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Parâmetros de filtro inválidos',
      type: ValidationErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para listar relatórios',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}

/**
 * Decorator para operação de exclusão de relatório
 */
export function ApiExcluirRelatorio() {
  return applyDecorators(
    ApiOperation({
      summary: 'Excluir relatório',
      description:
        'Remove um relatório gerado do sistema. Esta operação é irreversível.',
      operationId: 'excluirRelatorio',
    }),
    ApiParam({
      name: 'id',
      description: 'ID único do relatório a ser excluído',
      type: 'string',
      example: '507f1f77bcf86cd799439020',
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 204,
      description: 'Relatório excluído com sucesso',
    }),
    ApiResponse({
      status: 401,
      description: 'Token de acesso inválido ou expirado',
      type: UnauthorizedErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Sem permissão para excluir relatórios',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Relatório não encontrado',
      type: ApiErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Erro interno do servidor',
      type: ApiErrorResponse,
    }),
  );
}
