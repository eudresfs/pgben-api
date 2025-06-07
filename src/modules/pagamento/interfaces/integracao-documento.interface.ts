import { IContextoUsuario, IResultadoOperacao } from './integracao-solicitacao.interface';

/**
 * Interface para operações com documentos
 * Abstrai as dependências do serviço de pagamento com o módulo de documentos
 */
export interface IIntegracaoDocumentoService {
  /**
   * Busca documentos da solicitação
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Lista de documentos da solicitação
   */
  buscarDocumentosSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento[]>>;

  /**
   * Valida documentos obrigatórios para pagamento
   * @param solicitacaoId ID da solicitação
   * @param tipoBeneficio Tipo de benefício
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação de documentos
   */
  validarDocumentosObrigatorios(
    solicitacaoId: string,
    tipoBeneficio: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoDocumentos>>;

  /**
   * Gera comprovante de pagamento
   * @param pagamentoId ID do pagamento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Comprovante gerado
   */
  gerarComprovantePagamento(
    pagamentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IComprovante>>;

  /**
   * Armazena documento no sistema
   * @param arquivo Dados do arquivo
   * @param metadados Metadados do documento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Documento armazenado
   */
  armazenarDocumento(
    arquivo: IArquivo,
    metadados: IMetadadosDocumento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento>>;

  /**
   * Remove documento do sistema
   * @param documentoId ID do documento
   * @param motivo Motivo da remoção
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  removerDocumento(
    documentoId: string,
    motivo: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Busca documento por ID
   * @param documentoId ID do documento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Documento encontrado
   */
  buscarDocumento(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento>>;

  /**
   * Gera URL temporária para download do documento
   * @param documentoId ID do documento
   * @param contextoUsuario Contexto do usuário logado
   * @returns URL temporária para download
   */
  gerarUrlDownload(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<string>>;
}

/**
 * Interface para documento
 */
export interface IDocumento {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  mimeType: string;
  url?: string;
  hash: string;
  dataCriacao: Date;
  dataModificacao?: Date;
  criadoPor: string;
  solicitacaoId?: string;
  pagamentoId?: string;
  cidadaoId?: string;
  metadados: IMetadadosDocumento;
  status: 'ATIVO' | 'INATIVO' | 'REMOVIDO';
}

/**
 * Interface para validação de documentos
 */
export interface IValidacaoDocumentos {
  valida: boolean;
  documentosObrigatorios: IDocumentoObrigatorio[];
  documentosEncontrados: string[];
  documentosFaltantes: string[];
  documentosInvalidos: IDocumentoInvalido[];
  observacoes: string[];
}

/**
 * Interface para documento obrigatório
 */
export interface IDocumentoObrigatorio {
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  formatos: string[];
  tamanhoMaximo: number;
  observacoes?: string;
}

/**
 * Interface para documento inválido
 */
export interface IDocumentoInvalido {
  documentoId: string;
  tipo: string;
  motivos: string[];
  podeCorrigir: boolean;
}

/**
 * Interface para comprovante
 */
export interface IComprovante {
  id: string;
  tipo: 'PAGAMENTO' | 'RECEBIMENTO' | 'CANCELAMENTO';
  numero: string;
  dataGeracao: Date;
  arquivo: IDocumento;
  dados: {
    pagamentoId: string;
    valor: number;
    beneficiario: string;
    cpfBeneficiario: string;
    tipoBeneficio: string;
    dataProcessamento: Date;
    metodoPagamento: string;
    observacoes?: string;
  };
  assinatura: string;
  valido: boolean;
}

/**
 * Interface para arquivo
 */
export interface IArquivo {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  encoding?: string;
}

/**
 * Interface para metadados do documento
 */
export interface IMetadadosDocumento {
  categoria: string;
  subcategoria?: string;
  descricao?: string;
  palavrasChave: string[];
  confidencial: boolean;
  retencao: {
    prazo: number; // em anos
    motivo: string;
  };
  origem: 'UPLOAD_USUARIO' | 'SISTEMA' | 'INTEGRACAO';
  versao: number;
  relacionamentos: {
    solicitacaoId?: string;
    pagamentoId?: string;
    cidadaoId?: string;
    documentoPaiId?: string;
  };
}

/**
 * Interface para configuração de documento
 */
export interface IConfiguracaoDocumento {
  tipo: string;
  obrigatorio: boolean;
  formatosPermitidos: string[];
  tamanhoMaximo: number;
  validacoes: IValidacaoArquivo[];
  template?: string;
}

/**
 * Interface para validação de arquivo
 */
export interface IValidacaoArquivo {
  tipo: 'FORMATO' | 'TAMANHO' | 'CONTEUDO' | 'VIRUS';
  regra: string;
  mensagem: string;
  bloqueante: boolean;
}