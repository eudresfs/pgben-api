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
      solicitacao_id?: string;
      concessao_id?: string;
      cidadao_id?: string;
      data_inicio?: Date;
      data_fim?: Date;
      valor_minimo?: number;
      valor_maximo?: number;
      responsavel_liberacao?: string;
    } = {},
    public readonly paginacao: {
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
    } = {},
    public readonly incluirRelacionamentos: {
      solicitacao?: boolean;
      info_bancaria?: boolean;
      comprovantes?: boolean;
      confirmacao_recebimento?: boolean;
    } = {},
  ) {}
}
