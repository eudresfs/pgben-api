import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginationMetaDto, PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';

/**
 * Helper para conversão e manipulação de parâmetros de paginação
 * 
 * @description
 * Centraliza a lógica de conversão entre diferentes formatos de paginação
 * e criação de metadados de resposta paginada.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export class PaginationHelper {
  /**
   * Converte PaginationParamsDto para parâmetros de repository
   * 
   * @param params Parâmetros de paginação do DTO
   * @returns Objeto com page e limit normalizados
   */
  static convertToRepositoryParams(params: PaginationParamsDto): {
    page: number;
    limit: number;
    offset: number;
  } {
    let page = 1;
    let offset = 0;
    
    // Se page foi informado, usa ele e calcula o offset
    if (params.page !== undefined && params.page > 0) {
      page = params.page;
      offset = (page - 1) * params.limit;
    } else if (params.offset !== undefined && params.offset >= 0) {
      // Se apenas offset foi informado, calcula a página
      offset = params.offset;
      page = Math.floor(offset / params.limit) + 1;
    }
    
    return {
      page,
      limit: params.limit,
      offset,
    };
  }
  
  /**
   * Cria metadados de paginação
   * 
   * @param page Página atual
   * @param limit Limite de itens por página
   * @param total Total de itens
   * @returns Metadados de paginação
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMetaDto {
    const pages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };
  }
  
  /**
   * Cria uma resposta paginada
   * 
   * @param items Lista de itens
   * @param page Página atual
   * @param limit Limite de itens por página
   * @param total Total de itens
   * @returns Resposta paginada
   */
  static createPaginatedResponse<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponseDto<T> {
    const meta = this.createPaginationMeta(page, limit, total);
    return new PaginatedResponseDto(items, meta);
  }
  
  /**
   * Valida parâmetros de paginação
   * 
   * @param params Parâmetros de paginação
   * @throws Error se os parâmetros forem inválidos
   */
  static validatePaginationParams(params: PaginationParamsDto): void {
    if (params.limit <= 0) {
      throw new Error('Limit deve ser maior que 0');
    }
    
    if (params.limit > 1000) {
      throw new Error('Limit não pode ser maior que 1000');
    }
    
    if (params.page !== undefined && params.page < 1) {
      throw new Error('Page deve ser maior ou igual a 1');
    }
    
    if (params.offset !== undefined && params.offset < 0) {
      throw new Error('Offset deve ser maior ou igual a 0');
    }
  }
  
  /**
   * Aplica valores padrão aos parâmetros de paginação
   * 
   * @param params Parâmetros de paginação
   * @returns Parâmetros com valores padrão aplicados
   */
  static applyDefaults(params: Partial<PaginationParamsDto>): PaginationParamsDto {
    return {
      limit: params.limit ?? 10,
      page: params.page ?? 1,
      offset: params.offset ?? 0,
    };
  }
}