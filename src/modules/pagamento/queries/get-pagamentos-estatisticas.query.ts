/**
 * Query para obter estatísticas de pagamentos
 */
export class GetPagamentosEstatisticasQuery {
  constructor(
    public readonly periodo: {
      data_inicio: Date;
      data_fim: Date;
    },
    public readonly agrupamento: {
      porStatus?: boolean;
      pormetodo_pagamento?: boolean;
      porPeriodo?: 'dia' | 'semana' | 'mes' | 'ano';
      porResponsavel?: boolean;
    } = {
      porStatus: true,
      pormetodo_pagamento: true,
      porPeriodo: 'mes',
    },
  ) {}
}
