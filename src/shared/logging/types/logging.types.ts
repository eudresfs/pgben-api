/**
 * Tipos e interfaces para o sistema de logging
 */

export interface LogMetadata {
    [key: string]: any;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    correlationId?: string;
    ip?: string;
    userAgent?: string;
  }
  
  export interface DatabaseLogMetadata extends LogMetadata {
    operation: string;
    entity: string;
    duration: number;
    query?: string;
    params?: any[];
  }
  
  export interface AuthLogMetadata extends LogMetadata {
    operation: string;
    userId: string;
    success: boolean;
    reason?: string;
  }
  
  export interface BusinessLogMetadata extends LogMetadata {
    operation: string;
    entity: string;
    entityId: string;
    userId: string;
    details?: Record<string, any>;
  }
  
  export interface HttpLogMetadata extends LogMetadata {
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    contentLength?: number;
  }
  
  export interface PerformanceLogMetadata extends LogMetadata {
    operation: string;
    duration: number;
    performanceFlag?: 'FAST' | 'MODERATE' | 'SLOW' | 'CRITICAL_SLOW';
  }
  
  export interface SecurityLogMetadata extends LogMetadata {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    securityEvent: true;
  }
  
  export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';