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
  private readonly logger = new Logger(CestaBasicaStrategy.name);

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 3,
    intervaloParcelas: 30,
    diasParaLiberacao: 3,
    diasParaVencimento: 30,
    diaLimite: 25,
    valorPadrao: 107,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // DEBUG: Log dos dados recebidos
    this.logger.debug('=== CESTA BÁSICA STRATEGY DEBUG ===');
    this.logger.debug('Dados completos recebidos:', JSON.stringify(dados, null, 2));
    this.logger.debug('Dados específicos:', JSON.stringify(dados.dadosEspecificos, null, 2));
    
    // Determina quantidade de parcelas
    const quantidadeParcelas = this.determinarQuantidadeParcelas(dados);
    this.logger.debug(`Quantidade de parcelas determinada: ${quantidadeParcelas}`);

    // Calcula valor total baseado na quantidade de cestas
    const valorParcela = this.determinarValorParcelas(dados);
    this.logger.debug(`Valor da parcela calculado: R$ ${valorParcela}`);

    // Calcula datas
    const dataLiberacao = await this.calcularDataLiberacao(dados.dataInicio);
    const dataVencimento = await this.calcularDataVencimento(dataLiberacao);

    return {
      quantidadeParcelas,
      valorParcela,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas: this.configuracao.intervaloParcelas,
    };
  }

  private determinarQuantidadeParcelas(dados: DadosPagamento): number {
    // Verifica se há dados específicos com quantidade de parcelas
    if (dados.dadosEspecificos?.quantidade_parcelas) {
      return dados.dadosEspecificos.quantidade_parcelas;
    }

    // Verifica se há dados específicos com período em meses
    if (dados.dadosEspecificos?.periodoMeses) {
      return dados.dadosEspecificos.periodoMeses;
    }

    // Usa valor padrão da configuração
    return this.configuracao.parcelasPadrao;
  }

  private determinarValorParcelas(dados: DadosPagamento): number {
    // Se há valor na solicitação, usar esse valor
    if (dados.valor !== null && dados.valor !== undefined && dados.valor > 0) {
      this.logger.debug(`Usando valor da solicitação: R$ ${dados.valor}`);
      return dados.valor;
    }
    
    // Caso contrário, calcula o valor baseado na quantidade de cestas solicitadas
    const quantidadeCestas = dados.dadosEspecificos?.quantidade_cestas_solicitadas || 1;
    this.logger.debug(`Quantidade de cestas encontrada: ${quantidadeCestas}`);
    
    // Calcula o valor total baseado na quantidade de cestas
    const valorTotal = this.configuracao.valorPadrao * quantidadeCestas;
    this.logger.debug(`Valor total calculado: R$ ${valorTotal} (${this.configuracao.valorPadrao} x ${quantidadeCestas})`);
    
    // Retorna o valor total (será dividido pelas parcelas no serviço principal)
    return valorTotal;
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
