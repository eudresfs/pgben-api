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
 * Estratégia de cálculo para benefício de Natalidade
 *
 * Regras específicas:
 * - Pagamento único (1 parcela)
 * - Liberação em 3 dias úteis
 * - Vencimento em 30 dias após liberação
 */
@Injectable()
export class NatalidadeStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.NATALIDADE;

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 1,
    intervaloParcelas: 0, // Não se aplica para pagamento único
    diasParaLiberacao: 3,
    diasParaVencimento: 30,
    diaLimite: 25,
    valorPadrao: 600,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // Natalidade sempre é pagamento único
    const quantidadeParcelas = 1;

    // Valor total em uma única parcela
    const valorParcela = dados.valor;

    // Calcula datas
    const dataLiberacao = await this.calcularDataLiberacao(dados.dadosEspecificos.data_provavel_parto);
    const dataVencimento = await this.calcularDataVencimento(dados.dadosEspecificos.data_provavel_parto);

    return {
      quantidadeParcelas,
      valorParcela,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas: this.configuracao.intervaloParcelas,
    };
  }

  private async calcularDataLiberacao(dataInicio: Date): Promise<Date> {
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
