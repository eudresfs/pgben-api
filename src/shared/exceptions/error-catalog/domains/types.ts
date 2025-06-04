/**
 * Tipos e Interfaces para Domínios de Erro
 *
 * Este arquivo centraliza todas as definições de tipos
 * utilizadas pelos domínios de erro do sistema SEMTAS.
 */

import { ErrorContext } from '../AppError';

// ============================================================================
// INTERFACES DE CONTEXTO POR DOMÍNIO
// ============================================================================

/**
 * Contexto específico para erros do domínio USUARIO
 */
export interface UsuarioErrorContext extends ErrorContext {
  data?: {
    userId?: string;
    username?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    loginAttempts?: number;
    lastLogin?: Date;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Contexto específico para erros do domínio SOLICITACAO
 */
export interface SolicitacaoErrorContext extends ErrorContext {
  data?: {
    solicitacaoId?: string;
    cidadaoId?: string;
    beneficioTipo?: string;
    status?: string;
    etapaAtual?: string;
    proximaEtapa?: string;
    documentosPendentes?: string[];
    prazoLimite?: Date;
    responsavelId?: string;
    motivoRejeicao?: string;
    determinacaoJudicial?: boolean;
  };
}

/**
 * Contexto específico para erros do domínio CIDADAO
 */
export interface CidadaoErrorContext extends ErrorContext {
  data?: {
    cidadaoId?: string;
    cpf?: string;
    nis?: string;
    nome?: string;
    dataNascimento?: Date;
    idade?: number;
    email?: string;
    telefone?: string;
    cep?: string;
    municipio?: string;
    familiaId?: string;
    rendaFamiliar?: number;
    vulnerabilidadeIndex?: number;
    cadUnicoStatus?: string;
  };
}

/**
 * Contexto específico para erros do domínio BENEFICIO
 */
export interface BeneficioErrorContext extends ErrorContext {
  data?: {
    beneficioId?: string;
    tipo?: string;
    cidadaoId?: string;
    valor?: number;
    dataInicio?: Date;
    dataFim?: Date;
    status?: string;
    motivoSuspensao?: string;
    motivoCancelamento?: string;
    pagamentoId?: string;
    documentosComprobatorios?: string[];
    elegibilidadeScore?: number;
  };
}

/**
 * Contexto específico para erros do domínio DOCUMENTO
 */
export interface DocumentoErrorContext extends ErrorContext {
  data?: {
    documentoId?: string;
    nomeArquivo?: string;
    tipoDocumento?: string;
    tamanhoArquivo?: number;
    mimeType?: string;
    checksum?: string;
    azureBlobUrl?: string;
    uploadedBy?: string;
    versao?: number;
    status?: string;
    motivoRejeicao?: string;
  };
}

/**
 * Contexto específico para erros do domínio AUDITORIA
 */
export interface AuditoriaErrorContext extends ErrorContext {
  data?: {
    logId?: string;
    entidade?: string;
    entidadeId?: string;
    acao?: string;
    usuarioId?: string;
    timestamp?: Date;
    dadosAnteriores?: any;
    dadosNovos?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    conformidadeLGPD?: boolean;
  };
}

/**
 * Contexto específico para erros do domínio NOTIFICACAO
 */
export interface NotificacaoErrorContext extends ErrorContext {
  data?: {
    notificacaoId?: string;
    tipo?: string;
    canal?: string;
    destinatario?: string;
    remetente?: string;
    assunto?: string;
    templateId?: string;
    variaveis?: Record<string, any>;
    agendamento?: Date;
    tentativas?: number;
    status?: string;
    motivoFalha?: string;
    provedorExterno?: string;
  };
}

/**
 * Contexto específico para erros do domínio RELATORIO
 */
export interface RelatorioErrorContext extends ErrorContext {
  data?: {
    relatorioId?: string;
    tipo?: string;
    formato?: string;
    parametros?: Record<string, any>;
    dataInicio?: Date;
    dataFim?: Date;
    filtros?: Record<string, any>;
    usuarioSolicitante?: string;
    tamanhoEstimado?: number;
    tempoExecucao?: number;
    status?: string;
    caminhoArquivo?: string;
  };
}

/**
 * Contexto específico para erros do domínio INTEGRADOR
 */
export interface IntegradorErrorContext extends ErrorContext {
  data?: {
    integracao?: string;
    endpoint?: string;
    metodo?: string;
    statusCode?: number;
    responseTime?: number;
    tentativa?: number;
    maxTentativas?: number;
    proximaTentativa?: Date;
    circuitBreakerStatus?: string;
    credenciaisValidas?: boolean;
    certificadoValido?: boolean;
    versaoAPI?: string;
    dadosEnviados?: any;
    respostaRecebida?: any;
  };
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

/**
 * União de todos os contextos de domínio
 */
export type DomainErrorContext =
  | UsuarioErrorContext
  | SolicitacaoErrorContext
  | CidadaoErrorContext
  | BeneficioErrorContext
  | DocumentoErrorContext
  | AuditoriaErrorContext
  | NotificacaoErrorContext
  | RelatorioErrorContext
  | IntegradorErrorContext;

/**
 * Nomes dos domínios disponíveis
 */
export type DomainName =
  | 'USUARIO'
  | 'SOLICITACAO'
  | 'CIDADAO'
  | 'BENEFICIO'
  | 'DOCUMENTO'
  | 'AUDITORIA'
  | 'NOTIFICACAO'
  | 'RELATORIO'
  | 'INTEGRADOR';

/**
 * Estrutura de estatísticas de um domínio
 */
export interface DomainStatistics {
  name: DomainName;
  errorCount: number;
  helperFunctionCount: number;
  categories: string[];
  coverage: {
    crud: boolean;
    validation: boolean;
    business: boolean;
    integration: boolean;
    security: boolean;
  };
}

/**
 * Configuração de um domínio
 */
export interface DomainConfig {
  name: DomainName;
  description: string;
  responsibility: string;
  mainCategories: string[];
  commonErrors: string[];
  relatedDomains: DomainName[];
}

/**
 * Mapeamento de códigos de erro para domínios
 */
export interface ErrorCodeMapping {
  code: string;
  domain: DomainName;
  category: string;
  severity: string;
  httpStatus: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Lista de todos os domínios disponíveis
 */
export const AVAILABLE_DOMAINS: DomainName[] = [
  'USUARIO',
  'SOLICITACAO',
  'CIDADAO',
  'BENEFICIO',
  'DOCUMENTO',
  'AUDITORIA',
  'NOTIFICACAO',
  'RELATORIO',
  'INTEGRADOR',
];

/**
 * Configurações dos domínios
 */
export const DOMAIN_CONFIGS: Record<DomainName, DomainConfig> = {
  USUARIO: {
    name: 'USUARIO',
    description: 'Gestão de usuários, autenticação e autorização',
    responsibility: 'Controle de acesso, perfis e sessões de usuário',
    mainCategories: ['Authentication', 'CRUD', 'Validation', 'Permissions'],
    commonErrors: ['LOGIN_INVALID', 'NOT_FOUND', 'INSUFFICIENT_PERMISSIONS'],
    relatedDomains: ['AUDITORIA', 'NOTIFICACAO'],
  },
  SOLICITACAO: {
    name: 'SOLICITACAO',
    description: 'Gestão do ciclo de vida das solicitações de benefícios',
    responsibility: 'Workflow de aprovação, documentação e acompanhamento',
    mainCategories: ['CRUD', 'Workflow', 'Documentation', 'Validation'],
    commonErrors: ['NOT_FOUND', 'INVALID_TRANSITION', 'DOCUMENTS_PENDING'],
    relatedDomains: ['CIDADAO', 'BENEFICIO', 'DOCUMENTO', 'AUDITORIA'],
  },
  CIDADAO: {
    name: 'CIDADAO',
    description: 'Gestão de dados dos cidadãos beneficiários',
    responsibility: 'Cadastro, validação e relacionamentos familiares',
    mainCategories: ['CRUD', 'Validation', 'Family', 'Integration'],
    commonErrors: ['INVALID_CPF', 'NOT_FOUND', 'DATA_INCONSISTENT'],
    relatedDomains: ['SOLICITACAO', 'BENEFICIO', 'INTEGRADOR'],
  },
  BENEFICIO: {
    name: 'BENEFICIO',
    description: 'Gestão dos tipos de benefícios e suas regras',
    responsibility: 'Elegibilidade, valores, pagamentos e vigência',
    mainCategories: ['CRUD', 'Eligibility', 'Payment', 'Business'],
    commonErrors: ['NOT_ELIGIBLE', 'INVALID_VALUE', 'PERIOD_EXPIRED'],
    relatedDomains: ['CIDADAO', 'SOLICITACAO', 'AUDITORIA'],
  },
  DOCUMENTO: {
    name: 'DOCUMENTO',
    description: 'Gestão de documentos e uploads',
    responsibility: 'Upload, validação, armazenamento e versionamento',
    mainCategories: ['CRUD', 'Upload', 'Validation', 'Security'],
    commonErrors: ['UPLOAD_FAILED', 'INVALID_FORMAT', 'ACCESS_DENIED'],
    relatedDomains: ['SOLICITACAO', 'INTEGRADOR', 'AUDITORIA'],
  },
  AUDITORIA: {
    name: 'AUDITORIA',
    description: 'Logs de auditoria e conformidade LGPD',
    responsibility: 'Rastreabilidade, conformidade e relatórios de auditoria',
    mainCategories: ['Logging', 'LGPD', 'Access', 'Integrity'],
    commonErrors: ['LOG_NOT_FOUND', 'ACCESS_DENIED', 'LGPD_VIOLATION'],
    relatedDomains: ['USUARIO', 'SOLICITACAO', 'CIDADAO', 'BENEFICIO'],
  },
  NOTIFICACAO: {
    name: 'NOTIFICACAO',
    description: 'Sistema de notificações (email, SMS, push)',
    responsibility: 'Envio, templates, preferências e integrações',
    mainCategories: ['CRUD', 'Send', 'Templates', 'Integration'],
    commonErrors: ['SEND_FAILED', 'INVALID_TEMPLATE', 'INVALID_RECIPIENT'],
    relatedDomains: ['USUARIO', 'SOLICITACAO', 'INTEGRADOR'],
  },
  RELATORIO: {
    name: 'RELATORIO',
    description: 'Geração e exportação de relatórios',
    responsibility: 'Consultas, geração, exportação e agendamento',
    mainCategories: ['Generation', 'Export', 'Parameters', 'Performance'],
    commonErrors: ['GENERATION_FAILED', 'INVALID_PARAMETERS', 'TIMEOUT'],
    relatedDomains: ['USUARIO', 'AUDITORIA'],
  },
  INTEGRADOR: {
    name: 'INTEGRADOR',
    description: 'Integrações com sistemas externos',
    responsibility: 'Conexões, autenticação, retry e circuit breaker',
    mainCategories: ['Connection', 'Authentication', 'Retry', 'Integration'],
    commonErrors: ['CONNECTION_FAILED', 'INVALID_CREDENTIALS', 'TIMEOUT'],
    relatedDomains: ['CIDADAO', 'DOCUMENTO', 'NOTIFICACAO'],
  },
};
