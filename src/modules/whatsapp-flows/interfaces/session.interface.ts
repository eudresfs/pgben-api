import { ScreenType } from '../enums/screen-type.enum';
import { ActionType } from '../enums/action-type.enum';

/**
 * Interface para dados de sessão do WhatsApp Flow
 * Define a estrutura completa de uma sessão ativa
 */
export interface IFlowSession {
  /** ID único da sessão */
  id: string;

  /** Token único do flow */
  flowToken: string;

  /** Número de telefone do usuário */
  phoneNumber: string;

  /** Tela atual do flow */
  currentScreen: ScreenType;

  /** Indica se a sessão está ativa */
  isActive: boolean;

  /** Data de criação da sessão */
  createdAt: Date;

  /** Data da última atividade */
  lastActivity: Date;

  /** Data de expiração da sessão */
  expiresAt?: Date;

  /** Metadados da sessão */
  metadata: ISessionMetadata;

  /** Dados temporários da sessão */
  sessionData: Record<string, any>;

  /** Histórico de telas visitadas */
  screenHistory: IScreenHistoryEntry[];

  /** Tentativas de autenticação */
  authAttempts: number;

  /** Máximo de tentativas permitidas */
  maxAuthAttempts: number;

  /** IP do usuário (se disponível) */
  userIp?: string;

  /** User Agent (se disponível) */
  userAgent?: string;

  /** ID do cidadão autenticado (se houver) */
  authenticatedCidadaoId?: string;
}

/**
 * Interface para metadados da sessão
 * Informações adicionais sobre a sessão
 */
export interface ISessionMetadata {
  /** Versão do flow */
  flowVersion: string;

  /** Plataforma de origem (whatsapp) */
  platform: string;

  /** Idioma do usuário */
  language?: string;

  /** Timezone do usuário */
  timezone?: string;

  /** Informações do dispositivo */
  deviceInfo?: {
    type: string;
    os: string;
    browser?: string;
  };

  /** Configurações específicas da sessão */
  settings: {
    /** Timeout da sessão em minutos */
    sessionTimeout: number;

    /** Habilitar logging detalhado */
    enableDetailedLogging: boolean;

    /** Habilitar cache de dados */
    enableCaching: boolean;
  };

  /** Tags para categorização */
  tags?: string[];

  /** Dados de contexto adicional */
  context?: Record<string, any>;
}

/**
 * Interface para entrada do histórico de telas
 * Registra a navegação do usuário pelas telas
 */
export interface IScreenHistoryEntry {
  /** Tela visitada */
  screen: ScreenType;

  /** Ação realizada */
  action: ActionType;

  /** Timestamp da visita */
  timestamp: Date;

  /** Dados enviados na tela */
  inputData?: Record<string, any>;

  /** Resultado da ação */
  result?: {
    success: boolean;
    message?: string;
    errorCode?: string;
  };

  /** Tempo gasto na tela em segundos */
  timeSpent?: number;
}

/**
 * Interface para estatísticas de sessão
 * Métricas e dados analíticos
 */
export interface ISessionStats {
  /** Número total de sessões */
  totalSessions: number;

  /** Número de sessões ativas */
  activeSessions: number;

  /** Número de sessões expiradas */
  expiredSessions: number;

  /** Duração média das sessões em minutos */
  averageSessionDuration: number;

  /** Distribuição por tela */
  sessionsByScreen: Record<ScreenType, number>;

  /** Distribuição por ação */
  sessionsByAction: Record<ActionType, number>;

  /** Taxa de sucesso por tela */
  successRateByScreen: Record<ScreenType, number>;

  /** Estatísticas por período */
  periodStats: {
    /** Sessões na última hora */
    lastHour: number;

    /** Sessões no último dia */
    lastDay: number;

    /** Sessões na última semana */
    lastWeek: number;

    /** Sessões no último mês */
    lastMonth: number;
  };

  /** Top 10 telas mais acessadas */
  topScreens: Array<{
    screen: ScreenType;
    count: number;
    percentage: number;
  }>;

  /** Horários de pico */
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
}

/**
 * Interface para filtros de busca de sessões
 * Critérios para consulta de sessões
 */
export interface ISessionFilters {
  /** Filtrar por número de telefone */
  phoneNumber?: string;

  /** Filtrar por tela atual */
  currentScreen?: ScreenType;

  /** Filtrar por status ativo */
  isActive?: boolean;

  /** Filtrar por período de criação */
  createdAfter?: Date;
  createdBefore?: Date;

  /** Filtrar por período de última atividade */
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;

  /** Filtrar por ID do cidadão autenticado */
  authenticatedCidadaoId?: string;

  /** Filtrar por IP do usuário */
  userIp?: string;

  /** Filtrar por tags */
  tags?: string[];

  /** Limite de resultados */
  limit?: number;

  /** Offset para paginação */
  offset?: number;

  /** Ordenação */
  orderBy?: 'createdAt' | 'lastActivity' | 'phoneNumber';
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Interface para resultado de busca de sessões
 * Estrutura de retorno das consultas
 */
export interface ISessionSearchResult {
  /** Lista de sessões encontradas */
  sessions: IFlowSession[];

  /** Número total de resultados */
  total: number;

  /** Número de resultados retornados */
  count: number;

  /** Informações de paginação */
  pagination: {
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  /** Filtros aplicados */
  appliedFilters: ISessionFilters;

  /** Tempo de execução da consulta em ms */
  queryTime: number;
}

/**
 * Interface para operações de sessão
 * Define o contrato para gerenciamento de sessões
 */
export interface ISessionManager {
  /**
   * Cria uma nova sessão
   * @param phoneNumber Número de telefone do usuário
   * @param initialScreen Tela inicial do flow
   * @param metadata Metadados da sessão
   * @returns Sessão criada
   */
  createSession(
    phoneNumber: string,
    initialScreen: ScreenType,
    metadata: ISessionMetadata,
  ): Promise<IFlowSession>;

  /**
   * Busca uma sessão pelo token
   * @param flowToken Token do flow
   * @returns Sessão encontrada ou null
   */
  findSessionByToken(flowToken: string): Promise<IFlowSession | null>;

  /**
   * Atualiza uma sessão existente
   * @param sessionId ID da sessão
   * @param updates Dados para atualização
   * @returns Sessão atualizada
   */
  updateSession(
    sessionId: string,
    updates: Partial<IFlowSession>,
  ): Promise<IFlowSession>;

  /**
   * Finaliza uma sessão
   * @param sessionId ID da sessão
   * @param reason Motivo da finalização
   * @returns True se finalizada com sucesso
   */
  endSession(sessionId: string, reason?: string): Promise<boolean>;

  /**
   * Busca sessões com filtros
   * @param filters Critérios de busca
   * @returns Resultado da busca
   */
  findSessions(filters: ISessionFilters): Promise<ISessionSearchResult>;

  /**
   * Limpa sessões inativas
   * @param inactiveMinutes Minutos de inatividade
   * @returns Número de sessões limpas
   */
  cleanupInactiveSessions(inactiveMinutes: number): Promise<number>;

  /**
   * Obtém estatísticas das sessões
   * @param filters Filtros para as estatísticas
   * @returns Estatísticas calculadas
   */
  getSessionStats(filters?: ISessionFilters): Promise<ISessionStats>;
}

/**
 * Interface para eventos de sessão
 * Define eventos que podem ser emitidos durante o ciclo de vida da sessão
 */
export interface ISessionEvents {
  /** Sessão criada */
  'session.created': {
    session: IFlowSession;
    timestamp: Date;
  };

  /** Sessão atualizada */
  'session.updated': {
    session: IFlowSession;
    changes: Partial<IFlowSession>;
    timestamp: Date;
  };

  /** Sessão finalizada */
  'session.ended': {
    session: IFlowSession;
    reason?: string;
    timestamp: Date;
  };

  /** Tela alterada */
  'session.screen.changed': {
    session: IFlowSession;
    previousScreen: ScreenType;
    newScreen: ScreenType;
    timestamp: Date;
  };

  /** Tentativa de autenticação */
  'session.auth.attempt': {
    session: IFlowSession;
    success: boolean;
    attempts: number;
    timestamp: Date;
  };

  /** Sessão expirada */
  'session.expired': {
    session: IFlowSession;
    timestamp: Date;
  };
}