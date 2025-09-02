import { Injectable } from '@nestjs/common';
import {
  IBeneficioCalculatorStrategy,
  DadosPagamento,
  ResultadoCalculoPagamento,
  TipoBeneficio,
  ConfiguracaoBeneficio,
} from '../interfaces/pagamento-calculator.interface';
import { FeriadoService } from '../../../shared/services/feriado.service';

/**
 * Estratégia de cálculo para benefício de Funeral
 *
 * Regras específicas:
 * - Pagamento único (1 parcela)
 * - Liberação em 2 dias úteis (urgência)
 * - Vencimento em 15 dias após liberação
 */
@Injectable()
export class FuneralStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.FUNERAL;

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 1,
    intervaloParcelas: 0, // Não se aplica para pagamento único
    diasParaLiberacao: 2,
    diasParaVencimento: 15,
    diaLimite: 25,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // Funeral sempre é pagamento único
    const quantidadeParcelas = 1;

    // Calcula datas com prioridade (urgência)
    const dataLiberacao = await this.calcularDataLiberacao(dados.dataInicio);
    const dataVencimento = await this.calcularDataVencimento(dataLiberacao);

    return {
      quantidadeParcelas,
      valorParcela: dados.valor,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas: this.configuracao.intervaloParcelas,
    };
  }

  private async calcularDataLiberacao(dataInicio: Date): Promise<Date> {
    // Para funeral, prioriza liberação rápida
    return await this.feriadoService.adicionarDiasUteis(
      dataInicio,
      this.configuracao.diasParaLiberacao,
    );
  }

  private async calcularDataVencimento(dataLiberacao: Date): Promise<Date> {
    const dataVencimento = new Date(dataLiberacao);
    dataVencimento.setDate(
      dataVencimento.getDate() + this.configuracao.diasParaVencimento,
    );

    return await this.feriadoService.ajustarParaProximoDiaUtil(dataVencimento);
  }
}
