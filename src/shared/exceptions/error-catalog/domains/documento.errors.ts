/**
 * Domínio de Erros: DOCUMENTO
 *
 * Define códigos de erro específicos para operações relacionadas
 * ao módulo de documentos do sistema SEMTAS.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../types';
import { AppError, ErrorContext } from '../AppError';

/**
 * Tipo para dados de contexto específicos de documento
 */
export interface DocumentoErrorContext extends ErrorContext {
  data?: {
    documentoId?: string;
    tipoDocumento?: string;
    nomeArquivo?: string;
    tamanhoArquivo?: number;
    formatoArquivo?: string;
    cidadaoId?: string;
    solicitacaoId?: string;
    beneficioId?: string;
    urlArquivo?: string;
    motivoRejeicao?: string;
    dataVencimento?: string;
    [key: string]: any;
  };
}

/**
 * Catálogo de erros específicos do domínio DOCUMENTO
 */
export const DOCUMENTO_ERRORS: Record<string, ErrorDefinition> = {
  // ========================================
  // OPERAÇÕES CRUD
  // ========================================

  DOCUMENTO_NOT_FOUND: {
    code: 'DOCUMENTO_NOT_FOUND',
    message: 'Documento não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento não encontrado no sistema',
      'en-US': 'Document not found in the system',
    },
  },

  DOCUMENTO_TYPE_NOT_FOUND: {
    code: 'DOCUMENTO_TYPE_NOT_FOUND',
    message: 'Tipo de documento não encontrado',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tipo de documento não encontrado no sistema',
      'en-US': 'Document type not found in the system',
    },
  },

  DOCUMENTO_ALREADY_EXISTS: {
    code: 'DOCUMENTO_ALREADY_EXISTS',
    message: 'Documento já existe',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento deste tipo já foi fornecido',
      'en-US': 'Document of this type has already been provided',
    },
  },

  DOCUMENTO_CANNOT_DELETE: {
    code: 'DOCUMENTO_CANNOT_DELETE',
    message: 'Documento não pode ser excluído',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento não pode ser excluído no status atual',
      'en-US': 'Document cannot be deleted in current status',
    },
  },

  // ========================================
  // VALIDAÇÕES DE UPLOAD
  // ========================================

  DOCUMENTO_FILE_NOT_PROVIDED: {
    code: 'DOCUMENTO_FILE_NOT_PROVIDED',
    message: 'Arquivo não fornecido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Arquivo do documento não foi fornecido',
      'en-US': 'Document file was not provided',
    },
  },

  DOCUMENTO_INVALID_FILE_FORMAT: {
    code: 'DOCUMENTO_INVALID_FILE_FORMAT',
    message: 'Formato de arquivo inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Formato do arquivo não é suportado',
      'en-US': 'File format is not supported',
    },
  },

  DOCUMENTO_FILE_SIZE_EXCEEDS_LIMIT: {
    code: 'DOCUMENTO_FILE_SIZE_EXCEEDS_LIMIT',
    message: 'Tamanho do arquivo excede limite',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Tamanho do arquivo excede o limite permitido',
      'en-US': 'File size exceeds allowed limit',
    },
  },

  DOCUMENTO_FILE_CORRUPTED: {
    code: 'DOCUMENTO_FILE_CORRUPTED',
    message: 'Arquivo corrompido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Arquivo está corrompido ou ilegível',
      'en-US': 'File is corrupted or unreadable',
    },
  },

  DOCUMENTO_FILE_EMPTY: {
    code: 'DOCUMENTO_FILE_EMPTY',
    message: 'Arquivo vazio',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Arquivo está vazio',
      'en-US': 'File is empty',
    },
  },

  DOCUMENTO_INVALID_FILENAME: {
    code: 'DOCUMENTO_INVALID_FILENAME',
    message: 'Nome do arquivo inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Nome do arquivo contém caracteres inválidos',
      'en-US': 'Filename contains invalid characters',
    },
  },

  // ========================================
  // VALIDAÇÕES DE CONTEÚDO
  // ========================================

  DOCUMENTO_CONTENT_VALIDATION_FAILED: {
    code: 'DOCUMENTO_CONTENT_VALIDATION_FAILED',
    message: 'Falha na validação do conteúdo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Conteúdo do documento não passou na validação',
      'en-US': 'Document content failed validation',
    },
  },

  DOCUMENTO_INVALID_QUALITY: {
    code: 'DOCUMENTO_INVALID_QUALITY',
    message: 'Qualidade do documento inadequada',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Qualidade da imagem do documento é inadequada para análise',
      'en-US': 'Document image quality is inadequate for analysis',
    },
  },

  DOCUMENTO_TEXT_NOT_READABLE: {
    code: 'DOCUMENTO_TEXT_NOT_READABLE',
    message: 'Texto do documento ilegível',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Texto do documento não é legível',
      'en-US': 'Document text is not readable',
    },
  },

  DOCUMENTO_MISSING_REQUIRED_FIELDS: {
    code: 'DOCUMENTO_MISSING_REQUIRED_FIELDS',
    message: 'Campos obrigatórios ausentes',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento não contém todos os campos obrigatórios',
      'en-US': 'Document does not contain all required fields',
    },
  },

  DOCUMENTO_INVALID_DATE: {
    code: 'DOCUMENTO_INVALID_DATE',
    message: 'Data do documento inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Data presente no documento é inválida',
      'en-US': 'Date in document is invalid',
    },
  },

  DOCUMENTO_EXPIRED: {
    code: 'DOCUMENTO_EXPIRED',
    message: 'Documento expirado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Documento está expirado',
      'en-US': 'Document has expired',
    },
  },

  // ========================================
  // TIPOS ESPECÍFICOS DE DOCUMENTO
  // ========================================

  DOCUMENTO_CPF_MISMATCH: {
    code: 'DOCUMENTO_CPF_MISMATCH',
    message: 'CPF do documento não confere',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'CPF presente no documento não confere com o cadastro',
      'en-US': 'CPF in document does not match registration',
    },
  },

  DOCUMENTO_RG_INVALID: {
    code: 'DOCUMENTO_RG_INVALID',
    message: 'RG inválido no documento',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'RG presente no documento é inválido',
      'en-US': 'RG in document is invalid',
    },
  },

  DOCUMENTO_BIRTH_CERTIFICATE_INVALID: {
    code: 'DOCUMENTO_BIRTH_CERTIFICATE_INVALID',
    message: 'Certidão de nascimento inválida',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Certidão de nascimento é inválida',
      'en-US': 'Birth certificate is invalid',
    },
  },

  DOCUMENTO_INCOME_PROOF_INVALID: {
    code: 'DOCUMENTO_INCOME_PROOF_INVALID',
    message: 'Comprovante de renda inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Comprovante de renda é inválido',
      'en-US': 'Income proof is invalid',
    },
  },

  DOCUMENTO_ADDRESS_PROOF_INVALID: {
    code: 'DOCUMENTO_ADDRESS_PROOF_INVALID',
    message: 'Comprovante de endereço inválido',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Comprovante de endereço é inválido',
      'en-US': 'Address proof is invalid',
    },
  },

  // ========================================
  // INTEGRAÇÃO COM AZURE BLOB STORAGE
  // ========================================

  DOCUMENTO_UPLOAD_FAILED: {
    code: 'DOCUMENTO_UPLOAD_FAILED',
    message: 'Falha no upload do documento',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao fazer upload do documento',
      'en-US': 'Error uploading document',
    },
  },

  DOCUMENTO_DOWNLOAD_FAILED: {
    code: 'DOCUMENTO_DOWNLOAD_FAILED',
    message: 'Falha no download do documento',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Erro ao fazer download do documento',
      'en-US': 'Error downloading document',
    },
  },

  DOCUMENTO_STORAGE_QUOTA_EXCEEDED: {
    code: 'DOCUMENTO_STORAGE_QUOTA_EXCEEDED',
    message: 'Cota de armazenamento excedida',
    httpStatus: HttpStatus.INSUFFICIENT_STORAGE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Cota de armazenamento foi excedida',
      'en-US': 'Storage quota has been exceeded',
    },
  },

  DOCUMENTO_STORAGE_CONNECTION_FAILED: {
    code: 'DOCUMENTO_STORAGE_CONNECTION_FAILED',
    message: 'Falha na conexão com armazenamento',
    httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Falha na conexão com o serviço de armazenamento',
      'en-US': 'Failed to connect to storage service',
    },
  },

  DOCUMENTO_BLOB_NOT_FOUND: {
    code: 'DOCUMENTO_BLOB_NOT_FOUND',
    message: 'Arquivo não encontrado no armazenamento',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Arquivo não encontrado no armazenamento',
      'en-US': 'File not found in storage',
    },
  },

  // ========================================
  // SEGURANÇA E ACESSO
  // ========================================

  DOCUMENTO_ACCESS_DENIED: {
    code: 'DOCUMENTO_ACCESS_DENIED',
    message: 'Acesso negado ao documento',
    httpStatus: HttpStatus.FORBIDDEN,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Você não tem permissão para acessar este documento',
      'en-US': 'You do not have permission to access this document',
    },
  },

  DOCUMENTO_VIRUS_DETECTED: {
    code: 'DOCUMENTO_VIRUS_DETECTED',
    message: 'Vírus detectado no arquivo',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.CRITICAL,
    localizedMessages: {
      'pt-BR': 'Vírus ou malware detectado no arquivo',
      'en-US': 'Virus or malware detected in file',
    },
  },

  DOCUMENTO_ENCRYPTION_FAILED: {
    code: 'DOCUMENTO_ENCRYPTION_FAILED',
    message: 'Falha na criptografia do documento',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao criptografar o documento',
      'en-US': 'Error encrypting document',
    },
  },

  DOCUMENTO_DECRYPTION_FAILED: {
    code: 'DOCUMENTO_DECRYPTION_FAILED',
    message: 'Falha na descriptografia do documento',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.INTEGRATIONS,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Erro ao descriptografar o documento',
      'en-US': 'Error decrypting document',
    },
  },

  // ========================================
  // WORKFLOW E APROVAÇÃO
  // ========================================

  DOCUMENTO_PENDING_APPROVAL: {
    code: 'DOCUMENTO_PENDING_APPROVAL',
    message: 'Documento pendente de aprovação',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento está pendente de aprovação',
      'en-US': 'Document is pending approval',
    },
  },

  DOCUMENTO_ALREADY_APPROVED: {
    code: 'DOCUMENTO_ALREADY_APPROVED',
    message: 'Documento já aprovado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento já foi aprovado',
      'en-US': 'Document has already been approved',
    },
  },

  DOCUMENTO_ALREADY_REJECTED: {
    code: 'DOCUMENTO_ALREADY_REJECTED',
    message: 'Documento já rejeitado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Documento já foi rejeitado',
      'en-US': 'Document has already been rejected',
    },
  },

  DOCUMENTO_REJECTION_REASON_REQUIRED: {
    code: 'DOCUMENTO_REJECTION_REASON_REQUIRED',
    message: 'Motivo da rejeição obrigatório',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Motivo da rejeição é obrigatório',
      'en-US': 'Rejection reason is required',
    },
  },

  // ========================================
  // VERSIONING E HISTÓRICO
  // ========================================

  DOCUMENTO_VERSION_NOT_FOUND: {
    code: 'DOCUMENTO_VERSION_NOT_FOUND',
    message: 'Versão do documento não encontrada',
    httpStatus: HttpStatus.NOT_FOUND,
    category: ErrorCategory.VALIDATIONS,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Versão do documento não encontrada',
      'en-US': 'Document version not found',
    },
  },

  DOCUMENTO_VERSION_CONFLICT: {
    code: 'DOCUMENTO_VERSION_CONFLICT',
    message: 'Conflito de versão do documento',
    httpStatus: HttpStatus.CONFLICT,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.MEDIUM,
    localizedMessages: {
      'pt-BR': 'Conflito de versão do documento',
      'en-US': 'Document version conflict',
    },
  },

  DOCUMENTO_CANNOT_REPLACE_APPROVED: {
    code: 'DOCUMENTO_CANNOT_REPLACE_APPROVED',
    message: 'Não é possível substituir documento aprovado',
    httpStatus: HttpStatus.BAD_REQUEST,
    category: ErrorCategory.OPERATIONAL_FLOW,
    severity: ErrorSeverity.HIGH,
    localizedMessages: {
      'pt-BR': 'Não é possível substituir um documento já aprovado',
      'en-US': 'Cannot replace an already approved document',
    },
  },
};

// ========================================
// FUNÇÕES HELPER PARA DOCUMENTO
// ========================================

/**
 * Lança erro de documento não encontrado
 */
export function throwDocumentoNotFound(
  documentoId: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_NOT_FOUND',
    {
      ...context,
      data: {
        documentoId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de formato de arquivo inválido
 */
export function throwInvalidFileFormat(
  formatoRecebido: string,
  formatosPermitidos: string[],
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_INVALID_FILE_FORMAT',
    {
      ...context,
      data: {
        formatoRecebido,
        formatosPermitidos,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de tamanho de arquivo excedido
 */
export function throwFileSizeExceedsLimit(
  tamanhoArquivo: number,
  limiteMaximo: number,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_FILE_SIZE_EXCEEDS_LIMIT',
    {
      ...context,
      data: {
        tamanhoArquivo,
        limiteMaximo,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de falha no upload
 */
export function throwUploadFailed(
  nomeArquivo: string,
  erro: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_UPLOAD_FAILED',
    {
      ...context,
      data: {
        nomeArquivo,
        erro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de documento expirado
 */
export function throwDocumentoExpired(
  documentoId: string,
  dataVencimento: Date,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_EXPIRED',
    {
      ...context,
      data: {
        documentoId,
        dataVencimento: dataVencimento.toISOString(),
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de CPF não conferindo
 */
export function throwCpfMismatch(
  cpfDocumento: string,
  cpfCadastro: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_CPF_MISMATCH',
    {
      ...context,
      data: {
        cpfDocumento,
        cpfCadastro,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de vírus detectado
 */
export function throwVirusDetected(
  nomeArquivo: string,
  virusDetectado: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_VIRUS_DETECTED',
    {
      ...context,
      data: {
        nomeArquivo,
        virusDetectado,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de acesso negado
 */
export function throwDocumentoAccessDenied(
  documentoId: string,
  userId: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_ACCESS_DENIED',
    {
      ...context,
      data: {
        documentoId,
        userId,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de campos obrigatórios ausentes
 */
export function throwMissingRequiredFields(
  camposAusentes: string[],
  tipoDocumento: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_MISSING_REQUIRED_FIELDS',
    {
      ...context,
      data: {
        camposAusentes,
        tipoDocumento,
        ...context.data,
      },
    },
    language,
  );
}

/**
 * Lança erro de motivo de rejeição obrigatório
 */
export function throwRejectionReasonRequired(
  documentoId: string,
  context: DocumentoErrorContext = {},
  language: string = 'pt-BR',
): never {
  throw new AppError(
    'DOCUMENTO_REJECTION_REASON_REQUIRED',
    {
      ...context,
      data: {
        documentoId,
        ...context.data,
      },
    },
    language,
  );
}
