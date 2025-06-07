import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { Usuario, Pagamento } from '../../../entities';
import { IContextoUsuario } from './integracao-solicitacao.interface';

export interface IPagamentoMappingService {
  /**
   * Mapeia DTO de criação para entidade
   */
  mapCreateDtoToEntity(
    dto: PagamentoCreateDto,
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<Partial<Pagamento>>;

  /**
   * Mapeia entidade para DTO de resposta
   */
  mapEntityToResponseDto(
    pagamento: Pagamento,
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto>;

  /**
   * Mapeia lista de entidades para DTOs de resposta
   */
  mapEntitiesToResponseDtos(
    pagamentos: Pagamento[],
    contextoUsuario: IContextoUsuario
  ): Promise<PagamentoResponseDto[]>;

  /**
   * Constrói resposta paginada
   */
  buildPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): IPaginatedResponse<T>;

  /**
   * Mapeia filtros de query para critérios de busca
   */
  mapFiltersToCriteria(
    filtros: any,
    contextoUsuario: IContextoUsuario
  ): ICriteriosBusca;
}

// IContextoUsuario importado de integracao-solicitacao.interface

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ICriteriosBusca {
  where: any;
  relations: string[];
  order: any;
  skip: number;
  take: number;
}