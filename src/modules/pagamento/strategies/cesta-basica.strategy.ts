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
 * Estratégia de cálculo para benefício de Cesta Básica
 *
 * Regras específicas:
 * - Parcelas mensais (30 dias)
 * - Quantidade baseada nos dados específicos ou padrão de 3 parcelas
 * - Liberação em 3 dias úteis
 * - Vencimento em 30 dias após liberação
 */
@Injectable()
export class CestaBasicaStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.CESTA_BASICA;

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 3,
    intervaloParcelas: 30,
    diasParaLiberacao: 3,
    diasParaVencimento: 30,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // Determina quantidade de parcelas
    const quantidadeParcelas = this.determinarQuantidadeParcelas(dados);

    // Calcula datas
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

  private determinarQuantidadeParcelas(dados: DadosPagamento): number {
    // Verifica se há dados específicos com quantidade de parcelas
    if (dados.dadosEspecificos?.quantidadeParcelas) {
      return dados.dadosEspecificos.quantidadeParcelas;
    }

    // Verifica se há dados específicos com período em meses
    if (dados.dadosEspecificos?.periodoMeses) {
      return dados.dadosEspecificos.periodoMeses;
    }

    // Usa valor padrão
    return this.configuracao.parcelasPadrao;
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
