import { UploadTokenStatus, UploadSessionStatus } from '../entities';

/**
 * Interface para configuração de upload
 */
export interface IUploadConfig {
  maxFiles: number;
  maxFileSizeMB: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  requireVirusScan: boolean;
  autoDeleteAfterDays: number;
}

/**
 * Interface para metadados de arquivo
 */
export interface IFileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  extension: string;
  checksum: string;
  virusScanResult?: 'clean' | 'infected' | 'pending' | 'error';
  uploadedAt: Date;
  uploadedBy?: string;
}

/**
 * Interface para resultado de upload
 */
export interface IUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  warnings?: string[];
  metadata?: IFileMetadata;
}

/**
 * Interface para progresso de upload
 */
export interface IUploadProgress {
  sessionId: string;
  currentFile: number;
  totalFiles: number;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  filesCompleted: string[];
  filesFailed: string[];
  currentFileName?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Interface para notificação de upload
 */
export interface IUploadNotification {
  type: 'progress' | 'complete' | 'error' | 'warning';
  sessionId: string;
  tokenId: string;
  message: string;
  data?: any;
  timestamp: Date;
}

/**
 * Interface para validação de token
 */
export interface ITokenValidation {
  valid: boolean;
  status: UploadTokenStatus;
  expiresAt?: Date;
  minutesRemaining?: number;
  maxFiles?: number;
  allowedDocuments?: string[];
  restrictions?: {
    ipWhitelist?: string[];
    userAgentPattern?: string;
    maxSessionDuration?: number;
  };
}

/**
 * Interface para estatísticas de sessão
 */
export interface ISessionStats {
  sessionId: string;
  status: UploadSessionStatus;
  filesUploaded: number;
  totalSizeBytes: number;
  durationMinutes: number;
  averageFileSize: number;
  uploadSpeed: number; // bytes per second
  errorCount: number;
  lastActivity: Date;
}

/**
 * Interface para configuração de QR Code
 */
export interface IQRCodeConfig {
  size: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  type: 'png' | 'svg';
  darkColor: string;
  lightColor: string;
}

/**
 * Interface para dados do QR Code
 */
export interface IQRCodeData {
  tokenId: string;
  uploadUrl: string;
  expiresAt: Date;
  maxFiles: number;
  instructions?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para auditoria de upload
 */
export interface IUploadAudit {
  tokenId: string;
  sessionId?: string;
  action:
    | 'token_created'
    | 'token_used'
    | 'session_started'
    | 'file_uploaded'
    | 'session_completed'
    | 'token_expired'
    | 'token_cancelled';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface para filtros de busca
 */
export interface IUploadSearchFilters {
  status?: UploadTokenStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  cidadaoId?: string;
  solicitacaoId?: string;
  ipAddress?: string;
  hasErrors?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'usedAt' | 'filesUploaded';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Interface para relatório de upload
 */
export interface IUploadReport {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    usedTokens: number;
    totalSessions: number;
    completedSessions: number;
    totalFilesUploaded: number;
    totalSizeBytes: number;
    averageSessionDuration: number;
    successRate: number;
  };
  topUsers: {
    userId: string;
    userName: string;
    tokensCreated: number;
    filesUploaded: number;
  }[];
  errorAnalysis: {
    errorType: string;
    count: number;
    percentage: number;
  }[];
  dailyStats: {
    date: Date;
    tokensCreated: number;
    sessionsCompleted: number;
    filesUploaded: number;
    totalSizeBytes: number;
  }[];
}

/**
 * Interface para configuração de notificações
 */
export interface INotificationConfig {
  email: {
    enabled: boolean;
    template: string;
    subject: string;
  };
  sms: {
    enabled: boolean;
    template: string;
  };
  push: {
    enabled: boolean;
    title: string;
    body: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
}

/**
 * Interface para resposta de API padronizada
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * Interface para evento de SSE (Server-Sent Events)
 */
export interface ISSEEvent {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}

/**
 * Interface para cliente SSE
 */
export interface ISSEClient {
  id: string;
  tokenId: string;
  sessionId?: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  connectedAt: Date;
  lastPing?: Date;
}
