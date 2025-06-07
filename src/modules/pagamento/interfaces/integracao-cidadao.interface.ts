import { Cidadao } from '../../../entities/cidadao.entity';
import { IContextoUsuario, IResultadoOperacao, IHistoricoPagamento } from './integracao-solicitacao.interface';

/**
 * Interface para operações com dados do cidadão
 * Abstrai as dependências do serviço de pagamento com o módulo de cidadão
 */
export interface IIntegracaoCidadaoService {
  /**
   * Busca dados completos do cidadão
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Dados completos do cidadão
   */
  buscarDadosCidadao(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICidadaoCompleto>>;

  /**
   * Valida dados bancários do cidadão
   * @param cidadaoId ID do cidadão
   * @param dadosBancarios Dados bancários para validação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação bancária
   */
  validarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoBancaria>>;

  /**
   * Busca histórico de pagamentos do cidadão
   * @param cidadaoId ID do cidadão
   * @param filtros Filtros para busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de pagamentos do cidadão
   */
  buscarHistoricoPagamentosCidadao(
    cidadaoId: string,
    filtros: IFiltrosHistorico,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoCidadao>>;

  /**
   * Verifica situação cadastral do cidadão
   * @param cidadaoId ID do cidadão
   * @param contextoUsuario Contexto do usuário logado
   * @returns Situação cadastral do cidadão
   */
  verificarSituacaoCadastral(
    cidadaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ISituacaoCadastral>>;

  /**
   * Atualiza dados bancários do cidadão
   * @param cidadaoId ID do cidadão
   * @param dadosBancarios Novos dados bancários
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  atualizarDadosBancarios(
    cidadaoId: string,
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;
}

/**
 * Interface para dados completos do cidadão
 */
export interface ICidadaoCompleto {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento: Date;
  endereco: IEndereco;
  contato: IContato;
  dadosBancarios?: IDadosBancarios;
  situacaoCadastral: ISituacaoCadastral;
  documentos: IDocumentoCidadao[];
}

/**
 * Interface para endereço
 */
export interface IEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

/**
 * Interface para contato
 */
export interface IContato {
  telefone?: string;
  celular?: string;
  email?: string;
}

/**
 * Interface para dados bancários
 */
export interface IDadosBancarios {
  tipoPagamento: 'PIX' | 'TED' | 'DOC';
  pixTipo?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  pixChave?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;
  titular: string;
  cpfTitular: string;
}

/**
 * Interface para validação bancária
 */
export interface IValidacaoBancaria {
  valida: boolean;
  detalhes: {
    pixValido?: boolean;
    contaValida?: boolean;
    titularValido?: boolean;
  };
  erros: string[];
  avisos: string[];
}

/**
 * Interface para situação cadastral
 */
export interface ISituacaoCadastral {
  ativa: boolean;
  bloqueios: IBloqueio[];
  observacoes?: string;
  dataUltimaAtualizacao: Date;
}

/**
 * Interface para bloqueios
 */
export interface IBloqueio {
  tipo: string;
  motivo: string;
  dataInicio: Date;
  dataFim?: Date;
  ativo: boolean;
}

/**
 * Interface para documentos do cidadão
 */
export interface IDocumentoCidadao {
  id: string;
  tipo: string;
  numero: string;
  dataEmissao?: Date;
  dataValidade?: Date;
  orgaoEmissor?: string;
  arquivo?: string;
}

/**
 * Interface para filtros de histórico
 */
export interface IFiltrosHistorico {
  dataInicio?: Date;
  dataFim?: Date;
  tipoBeneficio?: string;
  status?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
}

/**
 * Interface para histórico do cidadão
 */
export interface IHistoricoCidadao {
  pagamentos: IHistoricoPagamento[];
  resumo: {
    totalPagamentos: number;
    valorTotal: number;
    ultimoPagamento?: Date;
    beneficiosMaisFrequentes: string[];
  };
}

// IHistoricoPagamento importado de integracao-solicitacao.interface