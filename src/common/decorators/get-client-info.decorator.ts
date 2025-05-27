import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ClientInfo } from '../interfaces/client-info.interface';

export const GetClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();
    
    // Extrai o IP real considerando proxies
    const getClientIp = (req: Request): string => {
      return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        '127.0.0.1'
      );
    };

    return {
      ip: getClientIp(request),
      userAgent: request.headers['user-agent'] || 'Unknown',
      origin: request.headers.origin,
      referer: request.headers.referer,
    };
  },
);