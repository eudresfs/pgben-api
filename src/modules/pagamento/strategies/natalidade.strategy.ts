import { Injectable, Logger } from '@nestjs/common';
import {
  IBeneficioCalculatorStrategy,
  DadosPagamento,
  ResultadoCalculoPagamento,
  ConfiguracaoBeneficio,
} from '../interfaces/pagamento-calculator.interface';
import { FeriadoService } from '../../../shared/services/feriado.service';
import { TipoBeneficio } from '@/enums';

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
  private readonly logger = new Logger(NatalidadeStrategy.name);

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 1,
    intervaloParcelas: 0, // Não se aplica para pagamento único
    diasParaLiberacao: 1,
    diasParaVencimento: 30,
    diaLimite: 25,
    valorPadrao: 600,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // Natalidade sempre é pagamento único
    const quantidadeParcelas = 1;

    // Sempre usa quantidade_bebes_esperados como fator multiplicador
    const quantidadeBebes = dados.dadosEspecificos?.quantidade_bebes_esperados || 1;
    
    let valorBase: number;
    if (dados.valor && dados.valor > 0) {
      // Usa o valor da solicitação como base
      valorBase = dados.valor;
      this.logger.debug(`Usando valor da solicitação como base: R$ ${valorBase}`);
    } else {
      // Usa valor padrão como base
      valorBase = this.configuracao.valorPadrao;
      this.logger.debug(`Usando valor padrão como base: R$ ${valorBase}`);
    }

    // Aplica o fator multiplicador da quantidade de bebês esperados
    const valorParcela = valorBase * quantidadeBebes;
    this.logger.debug(`Valor final calculado: R$ ${valorParcela} (${valorBase} x ${quantidadeBebes} bebês esperados)`);

    // Verifica se há data provável do parto nos dados específicos
    const dataReferencia = dados.dadosEspecificos?.data_provavel_parto 
      ? new Date(dados.dadosEspecificos.data_provavel_parto)
      : dados.dataInicio;

    // Calcula datas
    const dataLiberacao = await this.calcularDataLiberacao(dataReferencia);
    const dataVencimento = await this.calcularDataVencimento(dataReferencia);

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
