import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';
import { Solicitacao } from '../../../entities/solicitacao.entity';

/**
 * Interface para operações com solicitações
 * Abstrai as dependências do serviço de pagamento com o módulo de solicitações
 */
export interface IIntegracaoSolicitacaoService {
  /**
   * Busca solicitação por ID com validações de acesso
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação com dados da solicitação
   */
  buscarSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<Solicitacao>>;

  /**
   * Valida se solicitação pode receber pagamento
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação de elegibilidade
   */
  validarElegibilidadePagamento(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoElegibilidade>>;

  /**
   * Atualiza status da solicitação após pagamento
   * @param solicitacaoId ID da solicitação
   * @param statusPagamento Status do pagamento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  atualizarStatusAposPagamento(
    solicitacaoId: string,
    statusPagamento: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Busca histórico de pagamentos da solicitação
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de pagamentos
   */
  buscarHistoricoPagamentos(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoPagamento[]>>;

  /**
   * Calcula valor elegível para pagamento
   * @param solicitacaoId ID da solicitação
   * @param tipoBeneficio Tipo de benefício
   * @param contextoUsuario Contexto do usuário logado
   * @returns Cálculo do valor elegível
   */
  calcularValorElegivel(
    solicitacaoId: string,
    tipoBeneficio: TipoBeneficio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICalculoValor>>;
}

/**
 * Interface para contexto do usuário
 */
export interface IContextoUsuario {
  id: string;
  perfil: string;
  unidadeId?: string;
  permissoes: string[];
  isAdmin: boolean;
  isSupervisor: boolean;
}

/**
 * Interface para resultado de operações
 */
export interface IResultadoOperacao<T = any> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  codigo?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface para validação de elegibilidade
 */
export interface IValidacaoElegibilidade {
  elegivel: boolean;
  motivos: string[];
  restricoes: IRestricaoPagamento[];
  valorMaximo?: number;
  documentosObrigatorios: string[];
  prazoLimite?: Date;
}

/**
 * Interface para restrições de pagamento
 */
export interface IRestricaoPagamento {
  tipo: 'TEMPORAL' | 'DOCUMENTAL' | 'FINANCEIRA' | 'ADMINISTRATIVA';
  descricao: string;
  bloqueante: boolean;
  dataResolucao?: Date;
}

/**
 * Interface para histórico de pagamentos
 */
export interface IHistoricoPagamento {
  id: string;
  valor: number;
  status: string;
  dataCriacao: Date;
  dataProcessamento?: Date;
  observacoes?: string;
  responsavel: string;
}

/**
 * Interface para cálculo de valor
 */
export interface ICalculoValor {
  valorBase: number;
  valorCalculado: number;
  descontos: IItemCalculo[];
  acrescimos: IItemCalculo[];
  valorFinal: number;
  fundamentoLegal: string;
  observacoes?: string[];
}

/**
 * Interface para itens de cálculo
 */
export interface IItemCalculo {
  descricao: string;
  valor: number;
  percentual?: number;
  fundamentoLegal?: string;
}