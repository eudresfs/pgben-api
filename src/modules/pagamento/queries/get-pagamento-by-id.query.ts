/**
 * Query para buscar pagamento por ID
 */
export class GetPagamentoByIdQuery {
  constructor(
    public readonly id: string,
    public readonly incluirRelacionamentos: {
      solicitacao?: boolean;
      infoBancaria?: boolean;
      comprovantes?: boolean;
      confirmacaoRecebimento?: boolean;
      auditoria?: boolean;
    } = {
      solicitacao: true,
      infoBancaria: true,
      comprovantes: true,
      confirmacaoRecebimento: true,
    }
  ) {}
}