import { Injectable } from '@nestjs/common';
import { 
  IBeneficioCalculatorStrategy, 
  DadosPagamento, 
  ResultadoCalculoPagamento,
  TipoBeneficio,
  ConfiguracaoBeneficio
} from '../interfaces/pagamento-calculator.interface';
import { FeriadoService } from '../../../shared/services/feriado.service';

/**
 * Estratégia de cálculo para benefício de Aluguel Social
 * 
 * Regras específicas:
 * - Parcelas mensais (30 dias)
 * - Quantidade baseada nos dados específicos ou padrão de 6 parcelas
 * - Liberação em 5 dias úteis
 * - Vencimento em 30 dias após liberação
 */
@Injectable()
export class AluguelSocialStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.ALUGUEL_SOCIAL;
  
  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 6,
    intervaloParcelas: 30,
    diasParaLiberacao: 5,
    diasParaVencimento: 10
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
      intervaloParcelas: this.configuracao.intervaloParcelas
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
      this.configuracao.diasParaLiberacao
    );
  }

  private async calcularDataVencimento(dataLiberacao: Date): Promise<Date> {
    const dataVencimento = new Date(dataLiberacao);
    dataVencimento.setDate(dataVencimento.getDate() + this.configuracao.diasParaVencimento);
    
    return await this.feriadoService.ajustarParaProximoDiaUtil(dataVencimento);
  }
}