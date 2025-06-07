import { Injectable } from '@nestjs/common';
import { IPaginatedResponse } from '../interfaces/mapping.interface';

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: any;
}

@Injectable()
export class PagamentoResponseService {
  /**
   * Constrói resposta de sucesso
   */
  success<T>(data: T, message?: string, meta?: any): IApiResponse<T> {
    return {
      success: true,
      data,
      message,
      meta
    };
  }

  /**
   * Constrói resposta de erro
   */
  error(message: string, errors?: string[]): IApiResponse<null> {
    return {
      success: false,
      message,
      errors
    };
  }

  /**
   * Constrói resposta paginada
   */
  paginated<T>(
    paginatedData: IPaginatedResponse<T>,
    message?: string
  ): IApiResponse<T[]> {
    return {
      success: true,
      data: paginatedData.items,
      message,
      meta: {
        pagination: {
          total: paginatedData.total,
          page: paginatedData.page,
          limit: paginatedData.limit,
          totalPages: paginatedData.totalPages,
          hasNext: paginatedData.hasNext,
          hasPrevious: paginatedData.hasPrevious
        }
      }
    };
  }

  /**
   * Constrói resposta de criação
   */
  created<T>(data: T, message: string = 'Recurso criado com sucesso'): IApiResponse<T> {
    return this.success(data, message);
  }

  /**
   * Constrói resposta de atualização
   */
  updated<T>(data: T, message: string = 'Recurso atualizado com sucesso'): IApiResponse<T> {
    return this.success(data, message);
  }

  /**
   * Constrói resposta de exclusão
   */
  deleted(message: string = 'Recurso excluído com sucesso'): IApiResponse<null> {
    return {
      success: true,
      message
    };
  }
}