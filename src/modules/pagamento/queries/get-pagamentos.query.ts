import { StatusPagamentoEnum } from '../../../enums';
import { MetodoPagamentoEnum } from '../../../enums';

/**
 * Query para buscar pagamentos com filtros
 */
export class GetPagamentosQuery {
  constructor(
    public readonly filtros: {
      status?: StatusPagamentoEnum[];
      MetodoPagamentoEnum?: MetodoPagamentoEnum[];
      solicitacaoId?: string;
      cidadaoId?: string;
      dataInicio?: Date;
      dataFim?: Date;
      valorMinimo?: number;
      valorMaximo?: number;
      responsavelLiberacao?: string;
    } = {},
    public readonly paginacao: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
    public readonly incluirRelacionamentos: {
      solicitacao?: boolean;
      infoBancaria?: boolean;
      comprovantes?: boolean;
      confirmacaoRecebimento?: boolean;
    } = {},
  ) {}
}
