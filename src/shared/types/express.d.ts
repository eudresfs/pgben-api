import { Request } from 'express';

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
