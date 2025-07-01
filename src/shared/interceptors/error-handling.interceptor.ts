import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        
        // Log detalhado do erro
        this.logger.error(
          `Erro capturado no interceptor: ${error.message}`,
          {
            stack: error.stack,
            url: request.url,
            method: request.method,
            body: request.body,
            params: request.params,
            query: request.query,
            user: request.user?.id || 'anonymous',
          },
        );

        // Se já é uma HttpException, apenas re-throw
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Tratamento específico para erros de banco de dados
        if (error instanceof QueryFailedError) {
          return throwError(() => this.handleDatabaseError(error));
        }

        // Tratamento para erros de validação
        if (error.name === 'ValidationError') {
          return throwError(() => new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Dados de entrada inválidos',
              details: error.message,
              timestamp: new Date().toISOString(),
            },
            HttpStatus.BAD_REQUEST,
          ));
        }

        // Tratamento para erros de timeout
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          return throwError(() => new HttpException(
            {
              statusCode: HttpStatus.REQUEST_TIMEOUT,
              message: 'Operação expirou. Tente novamente.',
              timestamp: new Date().toISOString(),
            },
            HttpStatus.REQUEST_TIMEOUT,
          ));
        }

        // Erro genérico - não expor detalhes internos
        return throwError(() => new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Erro interno do servidor. Contate o suporte se o problema persistir.',
            timestamp: new Date().toISOString(),
            errorId: this.generateErrorId(),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ));
      }),
    );
  }

  private handleDatabaseError(error: QueryFailedError): HttpException {
    const message = error.message;
    const code = (error as any).code;

    // Erro de violação de constraint única
    if (code === '23505' || message.includes('duplicate key')) {
      return new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Registro já existe com esses dados',
          details: 'Violação de restrição de unicidade',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.CONFLICT,
      );
    }

    // Erro de violação de foreign key
    if (code === '23503' || message.includes('foreign key')) {
      return new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referência inválida. Verifique os dados relacionados.',
          details: 'Violação de chave estrangeira',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Erro de violação de check constraint
    if (code === '23514' || message.includes('check constraint')) {
      return new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Dados inválidos. Verifique os valores informados.',
          details: 'Violação de restrição de validação',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Erro de enum inválido
    if (message.includes('invalid input value for enum')) {
      const enumMatch = message.match(/invalid input value for enum (\w+): "([^"]+)"/i);
      if (enumMatch) {
        const enumName = enumMatch[1];
        const invalidValue = enumMatch[2];
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Valor '${invalidValue}' inválido para o campo ${enumName}`,
            details: 'Valor de enumeração inválido',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Erro de conexão com banco
    if (code === 'ECONNREFUSED' || message.includes('connection')) {
      return new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
          details: 'Erro de conexão com banco de dados',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Erro genérico de banco
    return new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do banco de dados. Contate o suporte.',
        timestamp: new Date().toISOString(),
        errorId: this.generateErrorId(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}