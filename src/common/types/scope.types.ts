/**
 * Tipos e interfaces para o sistema de controle de escopo
 * 
 * Este arquivo define todos os tipos TypeScript necessários para implementar
 * o sistema de controle de escopo, garantindo type safety em toda a aplicação.
 * 
 * @author Arquiteto de Software
 * @date 2025-01-27
 */

/**
 * Enum que define os tipos de escopo disponíveis no sistema
 */
export enum ScopeType {
  /** Acesso limitado à unidade do usuário */
  UNIDADE = 'UNIDADE',
  
  /** Acesso limitado aos próprios dados do usuário */
  PROPRIO = 'PROPRIO',
  
  /** Acesso irrestrito a todos os dados */
  GLOBAL = 'GLOBAL'
}

/**
 * Interface legada que define o contexto de escopo para um usuário
 * 
 * @deprecated Use IScopeContext de interfaces/scope-context.interface.ts
 * Esta interface é mantida para compatibilidade temporária.
 */
export interface IScopeContextLegacy {
  /** ID do usuário */
  userId: string;
  
  /** Tipo de escopo do usuário */
  scopeType: ScopeType;
  
  /** ID da unidade (obrigatório para escopo UNIDADE) */
  unidadeId?: string;
  
  /** Nome da role do usuário (para logging e auditoria) */
  roleName?: string;
  
  /** Timestamp de quando o contexto foi criado */
  createdAt: Date;
}

/**
 * Interface para configuração de escopo em entidades
 * 
 * Define como uma entidade deve ser filtrada baseada no escopo
 */
export interface IScopeEntityConfig {
  /** Nome da entidade */
  entityName: string;
  
  /** Campo que referencia o usuário (para escopo PROPRIO) */
  userField?: string;
  
  /** Campo que referencia a unidade (para escopo UNIDADE) */
  unidadeField?: string;
  
  /** Campos adicionais para filtros customizados */
  customFields?: Record<string, string>;
}

/**
 * Tipo para definir filtros de escopo em queries
 */
export type ScopeFilter = {
  /** Campo a ser filtrado */
  field: string;
  
  /** Valor do filtro */
  value: string | string[];
  
  /** Operador de comparação */
  operator?: 'eq' | 'in' | 'like';
};

/**
 * Interface para resultado de aplicação de escopo
 */
export interface IScopeResult {
  /** Indica se o escopo foi aplicado com sucesso */
  success: boolean;
  
  /** Filtros aplicados */
  filters: ScopeFilter[];
  
  /** Mensagem de erro (se houver) */
  error?: string;
  
  /** Metadados adicionais */
  metadata?: Record<string, any>;
}

/**
 * Exceção customizada para violações de escopo
 */
export class ScopeViolationException extends Error {
  constructor(
    message: string,
    public readonly userId: string,
    public readonly attemptedAction: string,
    public readonly scopeType: ScopeType,
    public readonly resourceId?: string
  ) {
    super(message);
    this.name = 'ScopeViolationException';
  }
}

/**
 * Exceção para contexto de escopo inválido
 */
export class InvalidScopeContextException extends Error {
  constructor(
    message: string,
    public readonly context: Partial<IScopeContextLegacy>
  ) {
    super(message);
    this.name = 'InvalidScopeContextException';
  }
}

/**
 * Tipo para mapeamento de roles e seus escopos
 */
export type RoleScopeMapping = {
  [roleName: string]: ScopeType;
};

/**
 * Constantes para o sistema de escopo
 */
export const SCOPE_CONSTANTS = {
  /** Chave para armazenar o contexto de escopo no request */
  REQUEST_SCOPE_KEY: 'scopeContext',
  
  /** Chave para metadados de escopo */
  SCOPE_METADATA_KEY: 'scope:config',
  
  /** TTL padrão para cache de contexto (15 minutos) */
  DEFAULT_CACHE_TTL: 15 * 60 * 1000,
  
  /** Prefixo para logs de escopo */
  LOG_PREFIX: '[SCOPE]',
  
  /** Mapeamento padrão de roles para escopos */
  DEFAULT_ROLE_SCOPE_MAPPING: {
    'CIDADAO': ScopeType.PROPRIO,
    'TECNICO': ScopeType.UNIDADE,
    'ASSISTENTE_SOCIAL': ScopeType.UNIDADE,
    'COORDENADOR': ScopeType.UNIDADE,
    'GESTOR': ScopeType.UNIDADE,
    'ADMIN': ScopeType.GLOBAL,
    'SUPER_ADMIN': ScopeType.GLOBAL,
    'AUDITOR': ScopeType.GLOBAL
  } as RoleScopeMapping
} as const;

/**
 * Tipo para configuração de entidades com escopo
 */
export interface IScopedEntityMetadata {
  /** Tipo de escopo aplicável à entidade */
  scopeType: ScopeType[];
  
  /** Configuração de campos para filtros */
  config: IScopeEntityConfig;
  
  /** Indica se o escopo é obrigatório */
  required: boolean;
}

/**
 * Tipo para opções de aplicação de escopo
 */
export interface IScopeOptions {
  /** Pular validação de escopo */
  skipValidation?: boolean;
  
  /** Aplicar escopo apenas em leitura */
  readOnly?: boolean;
  
  /** Campos adicionais para incluir no filtro */
  additionalFields?: Record<string, any>;
  
  /** Callback customizado para aplicação de escopo */
  customFilter?: (context: IScopeContextLegacy) => ScopeFilter[];
}