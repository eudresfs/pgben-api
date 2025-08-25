import { Request as ExpressRequest } from 'express';

// Definir um tipo específico para Request do Express para evitar conflitos
export type HttpRequest = ExpressRequest;

// Estender a interface Request do Express para incluir propriedades personalizadas
declare global {
  namespace Express {
    interface Request {
      user?: any;
      requestId?: string;
      startTime?: number;
      scopeContext?: {
        scopeType?: string;
        scopeId?: string;
        roles?: any[];
        userId?: string;
        unidadeId?: string;
        [key: string]: any;
      };
    }
  }
}