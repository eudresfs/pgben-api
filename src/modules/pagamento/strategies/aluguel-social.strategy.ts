import { Injectable } from '@nestjs/common';
import {
  IBeneficioCalculatorStrategy,
  DadosPagamento,
  ResultadoCalculoPagamento,
  ConfiguracaoBeneficio,
} from '../interfaces/pagamento-calculator.interface';
import { FeriadoService } from '../../../shared/services/feriado.service';
import { TipoBeneficio } from '@/enums';

/**
 * Estratégia de cálculo para benefício de Aluguel Social
 *
 * Regras específicas:
 * - Parcelas mensais (30 dias)
 * - Quantidade baseada nos dados específicos ou padrão de 6 parcelas
 * - Liberação: se dia >= 25, usar data atual; caso contrário, primeiro dia do mês seguinte
 * - Vencimento em 10 dias úteis após liberação
 */
@Injectable()
export class AluguelSocialStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.ALUGUEL_SOCIAL;

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 12,
    intervaloParcelas: 30,
    diasParaLiberacao: 5,
    diasParaVencimento: 10,
    diaLimite: 25,
    valorPadrao: 600,
  };

  constructor(private readonly feriadoService: FeriadoService) { }

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


    // Verifica se foi informada a quantidade de parcelas
    if (dados.quantidadeParcelas) {
      return dados.quantidadeParcelas;
    }

    // Verifica se há dados específicos com período em meses
    if (dados.dadosEspecificos?.periodoMeses) {
      return dados.dadosEspecificos.periodoMeses;
    }

    // Usa valor padrão
    return this.configuracao.parcelasPadrao;
  }

  private async calcularDataLiberacao(dataInicio: Date): Promise<Date> {
    const diaAtual = dataInicio.getDate();
    let dataLiberacao: Date;

    // Se o dia atual for >= diaLimite (25), usar a data atual
    if (diaAtual >= this.configuracao.diaLimite) {
      dataLiberacao = new Date(dataInicio);
    } else {
      // Caso contrário, usar o primeiro dia do mês seguinte
      const proximoMes = new Date(dataInicio);
      proximoMes.setMonth(proximoMes.getMonth() + 1);
      proximoMes.setDate(1);
      dataLiberacao = proximoMes;
    }

    // Ajustar para o próximo dia útil
    return await this.feriadoService.ajustarParaProximoDiaUtil(dataLiberacao);
  }

  private async calcularDataVencimento(dataLiberacao: Date): Promise<Date> {
    const dataVencimento = new Date(dataLiberacao);

    // Adicionar dias úteis à data de liberação
    const dataComDiasUteis = await this.feriadoService.adicionarDiasUteis(
      dataVencimento,
      this.configuracao.diasParaVencimento,
    );

    return await this.feriadoService.ajustarParaProximoDiaUtil(dataComDiasUteis);
  }
}
