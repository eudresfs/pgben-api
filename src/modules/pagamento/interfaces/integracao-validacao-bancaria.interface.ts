import { IContextoUsuario, IResultadoOperacao } from './integracao-solicitacao.interface';
import { IDadosBancarios } from './integracao-cidadao.interface';
import { TipoChavePix } from '@/enums';
export { TipoChavePix } from '@/enums';

/**
 * Interface para operações de validação bancária
 * Abstrai as dependências do serviço de pagamento com validações bancárias
 */
export interface IIntegracaoValidacaoBancariaService {
  /**
   * Valida dados bancários completos
   * @param dadosBancarios Dados bancários para validação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação
   */
  validarDadosBancarios(
    dadosBancarios: IDadosBancarios,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoBancariaCompleta>>;

  /**
   * Valida chave PIX
   * @param chave Chave PIX para validação
   * @param tipo Tipo da chave PIX
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação PIX
   */
  validarChavePix(
    chave: string,
    tipo: TipoChavePix,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoPix>>;

  /**
   * Valida conta bancária
   * @param dadosConta Dados da conta bancária
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação da conta
   */
  validarContaBancaria(
    dadosConta: IDadosContaBancaria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoContaBancaria>>;

  /**
   * Consulta dados do banco
   * @param codigoBanco Código do banco
   * @param contextoUsuario Contexto do usuário logado
   * @returns Dados do banco
   */
  consultarDadosBanco(
    codigoBanco: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDadosBanco>>;

  /**
   * Valida titular da conta
   * @param dadosTitular Dados do titular
   * @param dadosConta Dados da conta
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação do titular
   */
  validarTitularConta(
    dadosTitular: IDadosTitular,
    dadosConta: IDadosContaBancaria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoTitular>>;

  /**
   * Simula transferência bancária
   * @param dadosTransferencia Dados da transferência
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da simulação
   */
  simularTransferencia(
    dadosTransferencia: IDadosTransferencia,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ISimulacaoTransferencia>>;

  /**
   * Consulta histórico de validações
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de validações
   */
  consultarHistoricoValidacoes(
    filtros: IFiltrosHistoricoValidacao,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IPaginatedValidacoes>>;

  /**
   * Atualiza cache de dados bancários
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da atualização
   */
  atualizarCacheBancario(
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IAtualizacaoCache>>;

  /**
   * Verifica status dos serviços bancários
   * @param contextoUsuario Contexto do usuário logado
   * @returns Status dos serviços
   */
  verificarStatusServicos(
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IStatusServicos>>;
}
/**
 * Interface para validação bancária completa
 */
export interface IValidacaoBancariaCompleta {
  valida: boolean;
  score: number; // 0-100
  detalhes: {
    pixValido?: boolean;
    contaValida?: boolean;
    titularValido?: boolean;
    bancoValido?: boolean;
    agenciaValida?: boolean;
  };
  erros: IErroBancario[];
  avisos: IAviso[];
  recomendacoes: string[];
  tempoResposta: number;
  dataValidacao: Date;
  fonteValidacao: string[];
  confiabilidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  proximaRevalidacao?: Date;
}

/**
 * Interface para validação PIX
 */
export interface IValidacaoPix {
  valida: boolean;
  chave: string;
  tipo: TipoChavePix;
  titular?: {
    nome: string;
    documento: string;
    tipoDocumento: 'CPF' | 'CNPJ';
  };
  banco?: {
    codigo: string;
    nome: string;
  };
  status: 'ATIVA' | 'INATIVA' | 'BLOQUEADA' | 'INEXISTENTE';
  dataConsulta: Date;
  erros: IErroBancario[];
  avisos: IAviso[];
  limitesTransacao?: {
    diario: number;
    mensal: number;
    porTransacao: number;
  };
}

/**
 * Interface para dados da conta bancária
 */
export interface IDadosContaBancaria {
  banco: string;
  agencia: string;
  conta: string;
  digito: string;
  tipoConta: 'CORRENTE' | 'POUPANCA' | 'SALARIO';
}

/**
 * Interface para validação da conta bancária
 */
export interface IValidacaoContaBancaria {
  valida: boolean;
  banco: IDadosBanco;
  agencia: {
    codigo: string;
    nome?: string;
    endereco?: string;
    ativa: boolean;
  };
  conta: {
    numero: string;
    digito: string;
    digitoValido: boolean;
    ativa: boolean;
    tipo: string;
  };
  erros: IErroBancario[];
  avisos: IAviso[];
  dataConsulta: Date;
}

/**
 * Interface para dados do banco
 */
export interface IDadosBanco {
  codigo: string;
  nome: string;
  nomeCompleto: string;
  cnpj?: string;
  ativo: boolean;
  participaSPB: boolean;
  participaPix: boolean;
  tipoInstituicao: string;
  segmento: string;
  website?: string;
  telefone?: string;
  endereco?: {
    logradouro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  servicos: {
    ted: boolean;
    doc: boolean;
    pix: boolean;
    boleto: boolean;
  };
  limitesOperacionais?: {
    valorMaximoTed: number;
    valorMaximoPix: number;
    horarioFuncionamento: {
      inicio: string;
      fim: string;
    };
  };
}

/**
 * Interface para dados do titular
 */
export interface IDadosTitular {
  nome: string;
  documento: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  dataNascimento?: Date;
  nomeMae?: string;
}

/**
 * Interface para validação do titular
 */
export interface IValidacaoTitular {
  valida: boolean;
  compatibilidade: number; // 0-100
  detalhes: {
    nomeCompativel: boolean;
    documentoValido: boolean;
    titularidadeConfirmada: boolean;
  };
  dadosEncontrados?: {
    nome: string;
    documento: string;
    status: string;
  };
  erros: IErroBancario[];
  avisos: IAviso[];
  fonteConsulta: string[];
  dataConsulta: Date;
}

/**
 * Interface para dados de transferência
 */
export interface IDadosTransferencia {
  valor: number;
  origem: IDadosContaBancaria;
  destino: IDadosBancarios;
  finalidade: string;
  urgente: boolean;
}

/**
 * Interface para simulação de transferência
 */
export interface ISimulacaoTransferencia {
  viavel: boolean;
  custos: {
    tarifa: number;
    impostos: number;
    total: number;
  };
  prazos: {
    processamento: string;
    compensacao: string;
    disponibilizacao: string;
  };
  restricoes: IRestricaoTransferencia[];
  recomendacoes: string[];
  alternativas?: {
    metodo: string;
    custo: number;
    prazo: string;
    vantagens: string[];
  }[];
}

/**
 * Interface para restrição de transferência
 */
export interface IRestricaoTransferencia {
  tipo: 'VALOR' | 'HORARIO' | 'CONTA' | 'TITULAR' | 'REGULATORIA';
  descricao: string;
  bloqueante: boolean;
  solucao?: string;
}

/**
 * Interface para erro bancário
 */
export interface IErroBancario {
  codigo: string;
  tipo: 'VALIDACAO' | 'COMUNICACAO' | 'NEGOCIO' | 'SISTEMA';
  campo?: string;
  mensagem: string;
  detalhes?: string;
  solucao?: string;
  temporario: boolean;
}

/**
 * Interface para aviso
 */
export interface IAviso {
  tipo: 'INFO' | 'ATENCAO' | 'ALERTA';
  mensagem: string;
  detalhes?: string;
  acao?: string;
}

/**
 * Interface para filtros de histórico de validação
 */
export interface IFiltrosHistoricoValidacao {
  dataInicio?: Date;
  dataFim?: Date;
  tipoValidacao?: string[];
  resultado?: 'VALIDA' | 'INVALIDA' | 'ERRO';
  banco?: string[];
  usuarioId?: string;
  page?: number;
  limit?: number;
}

/**
 * Interface para validações paginadas
 */
export interface IPaginatedValidacoes {
  validacoes: IHistoricoValidacao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interface para histórico de validação
 */
export interface IHistoricoValidacao {
  id: string;
  tipo: 'PIX' | 'CONTA' | 'TITULAR' | 'COMPLETA';
  dadosValidados: Record<string, any>;
  resultado: 'VALIDA' | 'INVALIDA' | 'ERRO';
  score?: number;
  erros: IErroBancario[];
  tempoResposta: number;
  dataValidacao: Date;
  usuarioId: string;
  ip?: string;
  metadados?: Record<string, any>;
}

/**
 * Interface para atualização de cache
 */
export interface IAtualizacaoCache {
  sucesso: boolean;
  itensAtualizados: number;
  tempoProcessamento: number;
  ultimaAtualizacao: Date;
  proximaAtualizacao: Date;
  erros?: string[];
}

/**
 * Interface para status dos serviços
 */
export interface IStatusServicos {
  geral: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL';
  servicos: {
    pix: IStatusServico;
    ted: IStatusServico;
    validacaoConta: IStatusServico;
    consultaBanco: IStatusServico;
  };
  ultimaVerificacao: Date;
  proximaVerificacao: Date;
}

/**
 * Interface para status de serviço
 */
export interface IStatusServico {
  status: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL';
  tempoResposta?: number;
  disponibilidade: number; // 0-100
  ultimoErro?: {
    data: Date;
    mensagem: string;
  };
  manutencaoProgramada?: {
    inicio: Date;
    fim: Date;
    descricao: string;
  };
}