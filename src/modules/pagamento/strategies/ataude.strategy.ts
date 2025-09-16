import { Injectable, Logger } from '@nestjs/common';
import {
  IBeneficioCalculatorStrategy,
  DadosPagamento,
  ResultadoCalculoPagamento,
  ConfiguracaoBeneficio,
} from '../interfaces/pagamento-calculator.interface';
import { FeriadoService } from '../../../shared/services/feriado.service';
import { TipoBeneficio, TipoUrnaEnum } from '@/enums';

/**
 * Estratégia de cálculo para benefício de Funeral
 *
 * Regras específicas:
 * - Pagamento único (1 parcela)
 * - Liberação em 2 dias úteis (urgência)
 * - Vencimento em 15 dias após liberação
 */
@Injectable()
export class AtaudeStrategy implements IBeneficioCalculatorStrategy {
  readonly tipoBeneficio = TipoBeneficio.ATAUDE;
  private readonly logger = new Logger(AtaudeStrategy.name);

  private readonly configuracao: ConfiguracaoBeneficio = {
    parcelasPadrao: 1,
    intervaloParcelas: 0, // Não se aplica para pagamento único
    diasParaLiberacao: 2,
    diasParaVencimento: 15,
    diaLimite: 25,
    valorPadrao: 2390,
  };

  constructor(private readonly feriadoService: FeriadoService) {}

  async calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    // DEBUG: Log dos dados recebidos
    this.logger.debug('=== FUNERAL STRATEGY DEBUG ===');
    this.logger.debug('Dados completos recebidos:', JSON.stringify(dados, null, 2));
    this.logger.debug('Dados específicos:', JSON.stringify(dados.dadosEspecificos, null, 2));
    this.logger.debug(`Valor da solicitação: R$ ${dados.valor}`);
    
    // Funeral sempre é pagamento único
    const quantidadeParcelas = 1;

    // Usar o valor já calculado e armazenado na solicitação
    const valorParcela = dados.valor;
    
    if (!valorParcela || valorParcela <= 0) {
      this.logger.error('Valor da solicitação não encontrado ou inválido para benefício funeral');
      throw new Error('Valor do benefício funeral não foi calculado corretamente');
    }

    // Calcula datas com prioridade (urgência)
    const dataLiberacao = await this.calcularDataLiberacao(dados);
    const dataVencimento = await this.calcularDataVencimento(dataLiberacao);
    
    this.logger.debug(`Valor da parcela: R$ ${valorParcela}`);
    this.logger.debug(`Data de liberação: ${dataLiberacao}`);
    this.logger.debug(`Data de vencimento: ${dataVencimento}`);

    const resultado = {
      quantidadeParcelas,
      valorParcela,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas: this.configuracao.intervaloParcelas,
    };
    
    this.logger.debug(`Resultado final da estratégia funeral:`, JSON.stringify(resultado, null, 2));
    
    return resultado;
  }



  private async calcularDataLiberacao(dados: DadosPagamento): Promise<Date> {
    const dataBase = dados.dadosEspecificos?.data_autorizacao 
      ? new Date(dados.dadosEspecificos.data_autorizacao) 
      : new Date(dados.dataInicio);
    
    return await this.feriadoService.adicionarDiasUteis(
      dataBase,
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
