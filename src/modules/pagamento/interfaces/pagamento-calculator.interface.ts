import { TipoBeneficio } from "@/enums";

/**
 * Interface que define os dados necessários para calcular um pagamento
 */
export interface DadosPagamento {
  /** Tipo do benefício (aluguel-social, cesta-básica, ataude, natalidade) */
  tipoBeneficio: TipoBeneficio;

  /** Valor total do benefício */
  valor: number;

  /** Data de início do benefício */
  dataInicio: Date;

  /** Quantidade de parcelas */
  quantidadeParcelas: number;

  /** Quantidade de cestas básicas */
  quantidadeCestas?: number;

  /** Dados específicos do benefício (opcional) */
  dadosEspecificos?: any;
}

/**
 * Interface que define o resultado do cálculo de pagamento
 */
export interface ResultadoCalculoPagamento {
  /** Quantidade de parcelas */
  quantidadeParcelas: number;

  /** Valor por parcela */
  valorParcela: number;

  /** Data de liberação do primeiro pagamento */
  dataLiberacao: Date;

  /** Data de vencimento do primeiro pagamento */
  dataVencimento: Date;

  /** Intervalo entre parcelas em dias */
  intervaloParcelas: number;
}

/**
 * Interface para estratégias de cálculo de benefício
 */
export interface IBeneficioCalculatorStrategy {
  /** Tipo de benefício que esta estratégia suporta */
  readonly tipoBeneficio: string;

  /**
   * Calcula os dados de pagamento para este tipo de benefício
   *
   * @param dados - Dados do benefício
   * @returns Resultado do cálculo
   */
  calcular(dados: DadosPagamento): Promise<ResultadoCalculoPagamento>;
}

/**
 * Interface para o serviço de cálculo de pagamentos
 */
export interface IPagamentoCalculatorService {
  /**
   * Calcula os dados de pagamento para um benefício
   *
   * @param dados - Dados do benefício
   * @returns Resultado do cálculo
   */
  calcularPagamento(dados: DadosPagamento): Promise<ResultadoCalculoPagamento>;

  /**
   * Registra uma nova estratégia de cálculo
   *
   * @param strategy - Estratégia a ser registrada
   */
  registrarEstrategia(strategy: IBeneficioCalculatorStrategy): void;
}

/**
 * Interface para configurações de benefício
 */
export interface ConfiguracaoBeneficio {
  /** Quantidade padrão de parcelas */
  parcelasPadrao: number;

  /** Intervalo entre parcelas em dias */
  intervaloParcelas: number;

  /** Dias para liberação após aprovação */
  diasParaLiberacao: number;

  /** Dias para vencimento após liberação */
  diasParaVencimento: number;

  /** Dia limite para liberação no mês vigente */
  diaLimite: number;

  /** Valor padrão */
  valorPadrao: number;
}

/**
 * Dados de um benefício para cálculo de pagamentos
 */
export interface DadosBeneficio {
  id: string;
  valor: number;
  periodicidade?: string;
  especificacoes?: Record<string, any>;
}

/**
 * Interface para provedor de dados de benefício
 * Permite acesso aos dados sem dependência circular
 */
export interface IBeneficioDataProvider {
  /**
   * Busca os dados de um benefício por ID da solicitação
   */
  buscarDadosBeneficio(solicitacaoId: string): Promise<DadosBeneficio | null>;

  /**
   * Verifica se um benefício está ativo
   */
  verificarBeneficioAtivo(beneficioId: string): Promise<boolean>;

  /**
   * Busca a configuração específica de um benefício
   */
  buscarConfiguracaoBeneficio(
    beneficioId: string,
  ): Promise<Record<string, any>>;
}
