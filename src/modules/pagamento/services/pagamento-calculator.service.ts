import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { FeriadoService } from '../../../shared/services/feriado.service';
import { BeneficioDataService } from './beneficio-data.service';
import { AluguelSocialStrategy } from '../strategies/aluguel-social.strategy';
import { CestaBasicaStrategy } from '../strategies/cesta-basica.strategy';
import { FuneralStrategy } from '../strategies/funeral.strategy';
import { NatalidadeStrategy } from '../strategies/natalidade.strategy';
import { 
  IPagamentoCalculatorService,
  IBeneficioCalculatorStrategy,
  IBeneficioDataProvider, 
  DadosPagamento, 
  ResultadoCalculoPagamento,
  TipoBeneficio
} from '../interfaces/pagamento-calculator.interface';

/**
 * Serviço responsável por calcular dados de pagamento para diferentes tipos de benefício
 * 
 * Utiliza o padrão Strategy para delegar os cálculos específicos para cada tipo de benefício.
 * Isso garante:
 * - Extensibilidade: novos tipos podem ser adicionados facilmente
 * - Responsabilidade única: cada estratégia cuida apenas do seu tipo
 * - Testabilidade: cada estratégia pode ser testada isoladamente
 */
@Injectable()
export class PagamentoCalculatorService implements IPagamentoCalculatorService {
  private readonly logger = new Logger(PagamentoCalculatorService.name);
  private readonly estrategias = new Map<string, IBeneficioCalculatorStrategy>();

  constructor(
    private readonly feriadoService: FeriadoService,
    private readonly beneficioDataService: BeneficioDataService,
    private readonly aluguelSocialStrategy: AluguelSocialStrategy,
    private readonly cestaBasicaStrategy: CestaBasicaStrategy,
    private readonly funeralStrategy: FuneralStrategy,
    private readonly natalidadeStrategy: NatalidadeStrategy,
  ) {
    this.registrarEstrategias();
  }

  /**
   * Registra todas as estratégias disponíveis
   */
  private registrarEstrategias(): void {
    this.registrarEstrategia(this.aluguelSocialStrategy);
    this.registrarEstrategia(this.cestaBasicaStrategy);
    this.registrarEstrategia(this.funeralStrategy);
    this.registrarEstrategia(this.natalidadeStrategy);
    
    this.logger.log(`${this.estrategias.size} estratégias registradas`);
  }

  /**
   * Registra uma nova estratégia de cálculo
   * 
   * @param strategy - Estratégia a ser registrada
   */
  registrarEstrategia(strategy: IBeneficioCalculatorStrategy): void {
    this.estrategias.set(strategy.tipoBeneficio, strategy);
    this.logger.log(`Estratégia registrada para tipo: ${strategy.tipoBeneficio}`);
  }

  /**
   * Calcula os dados de pagamento para um benefício
   * 
   * @param dados - Dados do benefício
   * @returns Resultado do cálculo
   * @throws BadRequestException se o tipo de benefício não for suportado
   */
  async calcularPagamento(dados: DadosPagamento): Promise<ResultadoCalculoPagamento> {
    this.validarDadosEntrada(dados);
    
    const estrategia = this.estrategias.get(dados.tipoBeneficio);
    
    if (!estrategia) {
      const tiposSuportados = Array.from(this.estrategias.keys()).join(', ');
      throw new BadRequestException(
        `Tipo de benefício '${dados.tipoBeneficio}' não suportado. ` +
        `Tipos suportados: ${tiposSuportados}`
      );
    }

    try {
      this.logger.log(`Calculando pagamento para benefício: ${dados.tipoBeneficio}`);
      
      const resultado = await estrategia.calcular(dados);
      
      this.validarResultado(resultado);
      
      this.logger.log(
        `Cálculo concluído - Parcelas: ${resultado.quantidadeParcelas}, ` +
        `Valor: R$ ${resultado.valorParcela.toFixed(2)}`
      );
      
      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao calcular pagamento para ${dados.tipoBeneficio}:`, 
        error.message
      );
      throw error;
    }
  }

  /**
   * Valida os dados de entrada
   * 
   * @param dados - Dados a serem validados
   * @throws BadRequestException se os dados forem inválidos
   */
  private validarDadosEntrada(dados: DadosPagamento): void {
    if (!dados.tipoBeneficio) {
      throw new BadRequestException('Tipo de benefício é obrigatório');
    }

    if (!dados.valor || dados.valor < 0) {
      throw new BadRequestException('Valor deve ser maior que zero');
    }

    if (!dados.dataInicio) {
      throw new BadRequestException('Data de início é obrigatória');
    }

    if (dados.dataInicio < new Date()) {
      this.logger.warn('Data de início está no passado');
    }
  }

  /**
   * Valida o resultado do cálculo
   * 
   * @param resultado - Resultado a ser validado
   * @throws BadRequestException se o resultado for inválido
   */
  private validarResultado(resultado: ResultadoCalculoPagamento): void {
    if (resultado.quantidadeParcelas <= 0) {
      throw new BadRequestException('Quantidade de parcelas deve ser maior que zero');
    }

    if (resultado.valorParcela <= 0) {
      throw new BadRequestException('Valor da parcela deve ser maior que zero');
    }

    if (resultado.dataLiberacao < new Date()) {
      this.logger.warn('Data de liberação está no passado');
    }

    if (resultado.dataVencimento <= resultado.dataLiberacao) {
      throw new BadRequestException('Data de vencimento deve ser posterior à data de liberação');
    }
  }

  /**
   * Retorna os tipos de benefício suportados
   * 
   * @returns Array com os tipos suportados
   */
  getTiposSuportados(): string[] {
    return Array.from(this.estrategias.keys());
  }

  /**
   * Verifica se um tipo de benefício é suportado
   * 
   * @param tipoBeneficio - Tipo a ser verificado
   * @returns true se suportado, false caso contrário
   */
  isTipoSuportado(tipoBeneficio: string): boolean {
    return this.estrategias.has(tipoBeneficio);
  }

  /**
   * Retorna estatísticas do serviço
   * Útil para monitoramento e debugging
   */
  getEstatisticas(): { 
    estrategiasRegistradas: number, 
    tiposSuportados: string[] 
  } {
    return {
      estrategiasRegistradas: this.estrategias.size,
      tiposSuportados: this.getTiposSuportados()
    };
  }
}