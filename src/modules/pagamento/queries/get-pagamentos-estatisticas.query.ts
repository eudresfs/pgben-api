/**
 * Query para obter estatísticas de pagamentos
 */
export class GetPagamentosEstatisticasQuery {
  constructor(
    public readonly periodo: {
      dataInicio: Date;
      dataFim: Date;
    },
    public readonly agrupamento: {
      porStatus?: boolean;
      porMetodoPagamento?: boolean;
      porPeriodo?: 'dia' | 'semana' | 'mes' | 'ano';
      porResponsavel?: boolean;
    } = {
      porStatus: true,
      porMetodoPagamento: true,
      porPeriodo: 'mes',
    }
  ) {}
}