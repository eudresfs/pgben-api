/**
 * Domínio de Erros: RELATORIO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de relatórios do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de relatório
 */
export interface RelatorioErrorContext extends ErrorContext {
  data?: {
    relatorioId?: string;
    tipoRelatorio?: string;
    formato?: string;
    parametros?: any;
    dataInicio?: string;
    dataFim?: string;
    filtros?: any;
    userId?: string;
    tamanhoResultado?: number;
    tempoExecucao?: number;
    caminhoArquivo?: string;
    nomeArquivo?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio RELATORIO
 */
export const RELATORIO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  RELATORIO_NOT_FOUND: {
    code: 'RELATORIO_NOT_FOUND',
    message: 'Relatório não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Relatório não encontrado no sistema',
      'en-US': 'Report not found in the system',
    },
  },

  RELATORIO_TEMPLATE_NOT_FOUND: {
    code: 'RELATORIO_TEMPLATE_NOT_FOUND',
    message: 'Template de relatório não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Template de relatório não encontrado',
      'en-US': 'Report template not found',
    },
  },

  RELATORIO_CREATION_FAILED: {
    code: 'RELATORIO_CREATION_FAILED',
    message: 'Falha na criação do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao criar relatório',
      'en-US': 'Error creating report',
    },
  },

  RELATORIO_DELETE_FAILED: {
    code: 'RELATORIO_DELETE_FAILED',
    message: 'Falha na exclusão do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao excluir relatório',
      'en-US': 'Error deleting report',
    },
  },

  // ========================================
  // VALIDAÇÕES DE PARÂMETROS
  // ========================================

  RELATORIO_INVALID_TYPE: {
    code: 'RELATORIO_INVALID_TYPE',
    message: 'Tipo de relatório inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de relatório especificado é inválido',
      'en-US': 'Specified report type is invalid',
    },
  },

  RELATORIO_INVALID_FORMAT: {
    code: 'RELATORIO_INVALID_FORMAT',
    message: 'Formato de relatório inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Formato de relatório especificado é inválido',
      'en-US': 'Specified report format is invalid',
    },
  },

  RELATORIO_INVALID_DATE_RANGE: {
    code: 'RELATORIO_INVALID_DATE_RANGE',
    message: 'Intervalo de datas inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Intervalo de datas especificado é inválido',
      'en-US': 'Specified date range is invalid',
    },
  },

  RELATORIO_DATE_RANGE_TOO_LARGE: {
    code: 'RELATORIO_DATE_RANGE_TOO_LARGE',
    message: 'Intervalo de datas muito amplo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Intervalo de datas é muito amplo para processamento',
      'en-US': 'Date range is too large for processing',
    },
  },

  RELATORIO_MISSING_PARAMETERS: {
    code: 'RELATORIO_MISSING_PARAMETERS',
    message: 'Parâmetros obrigatórios ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Parâmetros obrigatórios para o relatório estão ausentes',
      'en-US': 'Required report parameters are missing',
    },
  },

  RELATORIO_INVALID_PARAMETERS: {
    code: 'RELATORIO_INVALID_PARAMETERS',
    message: 'Parâmetros inválidos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Parâmetros fornecidos são inválidos',
      'en-US': 'Provided parameters are invalid',
    },
  },

  RELATORIO_INVALID_FILTERS: {
    code: 'RELATORIO_INVALID_FILTERS',
    message: 'Filtros inválidos',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Filtros aplicados são inválidos',
      'en-US': 'Applied filters are invalid',
    },
  },

  // ========================================
  // GERAÇÃO DE RELATÓRIOS
  // ========================================

  RELATORIO_GENERATION_FAILED: {
    code: 'RELATORIO_GENERATION_FAILED',
    message: 'Falha na geração do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório',
      'en-US': 'Error generating report',
    },
  },

  RELATORIO_QUERY_FAILED: {
    code: 'RELATORIO_QUERY_FAILED',
    message: 'Falha na consulta de dados',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao consultar dados para o relatório',
      'en-US': 'Error querying data for report',
    },
  },

  RELATORIO_PROCESSING_TIMEOUT: {
    code: 'RELATORIO_PROCESSING_TIMEOUT',
    message: 'Timeout no processamento do relatório',
    httpStatus: HttpStatus.REQUEST_TIMEOUT,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Timeout no processamento do relatório',
      'en-US': 'Report processing timeout',
    },
  },

  RELATORIO_DATA_TOO_LARGE: {
    code: 'RELATORIO_DATA_TOO_LARGE',
    message: 'Volume de dados muito grande',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Volume de dados é muito grande para processamento',
      'en-US': 'Data volume is too large for processing',
    },
  },

  RELATORIO_NO_DATA_FOUND: {
    code: 'RELATORIO_NO_DATA_FOUND',
    message: 'Nenhum dado encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Nenhum dado encontrado para os critérios especificados',
      'en-US': 'No data found for the specified criteria',
    },
  },

  RELATORIO_COMPILATION_FAILED: {
    code: 'RELATORIO_COMPILATION_FAILED',
    message: 'Falha na compilação do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao compilar template do relatório',
      'en-US': 'Error compiling report template',
    },
  },

  // ========================================
  // EXPORTAÇÃO E FORMATOS
  // ========================================

  RELATORIO_EXPORT_FAILED: {
    code: 'RELATORIO_EXPORT_FAILED',
    message: 'Falha na exportação do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao exportar relatório',
      'en-US': 'Error exporting report',
    },
  },

  RELATORIO_PDF_GENERATION_FAILED: {
    code: 'RELATORIO_PDF_GENERATION_FAILED',
    message: 'Falha na geração de PDF',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório em PDF',
      'en-US': 'Error generating PDF report',
    },
  },

  RELATORIO_EXCEL_GENERATION_FAILED: {
    code: 'RELATORIO_EXCEL_GENERATION_FAILED',
    message: 'Falha na geração de Excel',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório em Excel',
      'en-US': 'Error generating Excel report',
    },
  },

  RELATORIO_CSV_GENERATION_FAILED: {
    code: 'RELATORIO_CSV_GENERATION_FAILED',
    message: 'Falha na geração de CSV',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao gerar relatório em CSV',
      'en-US': 'Error generating CSV report',
    },
  },

  RELATORIO_FILE_SAVE_FAILED: {
    code: 'RELATORIO_FILE_SAVE_FAILED',
    message: 'Falha ao salvar arquivo do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao salvar arquivo do relatório',
      'en-US': 'Error saving report file',
    },
  },

  RELATORIO_FILE_NOT_FOUND: {
    code: 'RELATORIO_FILE_NOT_FOUND',
    message: 'Arquivo do relatório não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Arquivo do relatório não foi encontrado',
      'en-US': 'Report file not found',
    },
  },

  // ========================================
  // PERMISSÕES E ACESSO
  // ========================================

  RELATORIO_ACCESS_DENIED: {
    code: 'RELATORIO_ACCESS_DENIED',
    message: 'Acesso negado ao relatório',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar este relatório',
      'en-US': 'You do not have permission to access this report',
    },
  },

  RELATORIO_INSUFFICIENT_PRIVILEGES: {
    code: 'RELATORIO_INSUFFICIENT_PRIVILEGES',
    message: 'Privilégios insuficientes',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Privilégios insuficientes para gerar este relatório',
      'en-US': 'Insufficient privileges to generate this report',
    },
  },

  RELATORIO_DATA_ACCESS_RESTRICTED: {
    code: 'RELATORIO_DATA_ACCESS_RESTRICTED',
    message: 'Acesso aos dados restrito',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Acesso aos dados necessários para o relatório é restrito',
      'en-US': 'Access to data required for the report is restricted',
    },
  },

  // ========================================
  // AGENDAMENTO E AUTOMAÇÃO
  // ========================================

  RELATORIO_SCHEDULE_FAILED: {
    code: 'RELATORIO_SCHEDULE_FAILED',
    message: 'Falha no agendamento do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao agendar relatório',
      'en-US': 'Error scheduling report',
    },
  },

  RELATORIO_INVALID_SCHEDULE: {
    code: 'RELATORIO_INVALID_SCHEDULE',
    message: 'Agendamento inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Configuração de agendamento é inválida',
      'en-US': 'Schedule configuration is invalid',
    },
  },

  RELATORIO_SCHEDULE_CONFLICT: {
    code: 'RELATORIO_SCHEDULE_CONFLICT',
    message: 'Conflito de agendamento',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Conflito no agendamento do relatório',
      'en-US': 'Report scheduling conflict',
    },
  },

  RELATORIO_AUTOMATION_FAILED: {
    code: 'RELATORIO_AUTOMATION_FAILED',
    message: 'Falha na automação do relatório',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro na execução automática do relatório',
      'en-US': 'Error in automatic report execution',
    },
  },

  // ========================================
  // PERFORMANCE E RECURSOS
  // ========================================

  RELATORIO_MEMORY_LIMIT_EXCEEDED: {
    code: 'RELATORIO_MEMORY_LIMIT_EXCEEDED',
    message: 'Limite de memória excedido',
    httpStatus: HttpStatus.INSUFFICIENT_STORAGE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Limite de memória excedido durante geração do relatório',
      'en-US': 'Memory limit exceeded during report generation',
    },
  },

  RELATORIO_CONCURRENT_LIMIT_EXCEEDED: {
    code: 'RELATORIO_CONCURRENT_LIMIT_EXCEEDED',
    message: 'Limite de relatórios simultâneos excedido',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Limite de relatórios simultâneos excedido',
      'en-US': 'Concurrent reports limit exceeded',
    },
  },

  RELATORIO_DISK_SPACE_INSUFFICIENT: {
    code: 'RELATORIO_DISK_SPACE_INSUFFICIENT',
    message: 'Espaço em disco insuficiente',
    httpStatus: HttpStatus.INSUFFICIENT_STORAGE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Espaço em disco insuficiente para gerar relatório',
      'en-US': 'Insufficient disk space to generate report',
    },
  },

  // ========================================
  // TEMPLATES E CONFIGURAÇÃO
  // ========================================

  RELATORIO_TEMPLATE_INVALID: {
    code: 'RELATORIO_TEMPLATE_INVALID',
    message: 'Template de relatório inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Template de relatório é inválido',
      'en-US': 'Report template is invalid',
    },
  },

  RELATORIO_TEMPLATE_SYNTAX_ERROR: {
    code: 'RELATORIO_TEMPLATE_SYNTAX_ERROR',
    message: 'Erro de sintaxe no template',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro de sintaxe no template do relatório',
      'en-US': 'Syntax error in report template',
    },
  },

  RELATORIO_CONFIGURATION_INVALID: {
    code: 'RELATORIO_CONFIGURATION_INVALID',
    message: 'Configuração do relatório inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Configuração do relatório é inválida',
      'en-US': 'Report configuration is invalid',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA RELATORIO
// ========================================

/**
 * Lança erro de relatório não encontrado
 */
export function throwRelatorioNotFound(
  relatorioId: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_NOT_FOUND',
    {
      ...context,
      data: {
        relatorioId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na geração
 */
export function throwGenerationFailed(
  tipoRelatorio: string,
  erro: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_GENERATION_FAILED',
    {
      ...context,
      data: {
        tipoRelatorio,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de intervalo de datas inválido
 */
export function throwInvalidDateRange(
  dataInicio: Date,
  dataFim: Date,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_INVALID_DATE_RANGE',
    {
      ...context,
      data: {
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de parâmetros ausentes
 */
export function throwMissingParameters(
  parametrosAusentes: string[],
  tipoRelatorio: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_MISSING_PARAMETERS',
    {
      ...context,
      data: {
        parametrosAusentes,
        tipoRelatorio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de timeout no processamento
 */
export function throwProcessingTimeout(
  tempoExecucao: number,
  tempoLimite: number,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_PROCESSING_TIMEOUT',
    {
      ...context,
      data: {
        tempoExecucao,
        tempoLimite,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de volume de dados muito grande
 */
export function throwDataTooLarge(
  tamanhoResultado: number,
  limiteMaximo: number,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_DATA_TOO_LARGE',
    {
      ...context,
      data: {
        tamanhoResultado,
        limiteMaximo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de acesso negado
 */
export function throwRelatorioAccessDenied(
  userId: string,
  tipoRelatorio: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_ACCESS_DENIED',
    {
      ...context,
      data: {
        userId,
        tipoRelatorio,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha na exportação
 */
export function throwExportFailed(
  formato: string,
  erro: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_EXPORT_FAILED',
    {
      ...context,
      data: {
        formato,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de nenhum dado encontrado
 */
export function throwNoDataFound(
  filtros: any,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_NO_DATA_FOUND',
    {
      ...context,
      data: {
        filtros,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de limite de memória excedido
 */
export function throwMemoryLimitExceeded(
  memoriaUtilizada: number,
  limiteMemoria: number,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_MEMORY_LIMIT_EXCEEDED',
    {
      ...context,
      data: {
        memoriaUtilizada,
        limiteMemoria,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de template não encontrado
 */
export function throwTemplateNotFound(
  templateId: string,
  context: RelatorioErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'RELATORIO_TEMPLATE_NOT_FOUND',
    {
      ...context,
      data: {
        templateId,
        ...context.data,
      },
    },
    language,
  );
}
