import { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Interface para dados do beneficiário utilizados no comprovante
 */
export interface IBeneficiarioComprovante {
  nome: string;
  cpf: string;
  rg?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  contatos?: {
    telefone?: string;
    email?: string;
  };
}

/**
 * Interface para dados do pagamento utilizados no comprovante
 */
export interface IPagamentoComprovante {
  id: string;
  solicitacao_id: string;
  valor: number;
  dataLiberacao: Date;
  metodoPagamento: string;
  numeroParcela?: number;
  totalParcelas?: number;
  status: string;
  tipoBeneficio: {
    nome: string;
    descricao?: string;
  };
  solicitacao: {
    protocolo: string;
  };
}

/**
 * Interface para dados da unidade/órgão responsável
 */
export interface IUnidadeComprovante {
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

/**
 * Interface para dados do técnico responsável
 */
export interface ITecnicoComprovante {
  nome: string;
  matricula?: string;
  cargo?: string;
}

/**
 * Interface para dados bancários utilizados no comprovante
 */
export interface IDadosBancariosComprovante {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  chavePix?: string;
}

/**
 * Interface principal para dados do comprovante
 */
export interface IDadosComprovante {
  beneficiario: IBeneficiarioComprovante;
  pagamento: IPagamentoComprovante;
  unidade: IUnidadeComprovante;
  tecnico?: ITecnicoComprovante;
  dadosBancarios?: IDadosBancariosComprovante;
  dataGeracao: Date;
  numeroComprovante?: string;
}

/**
 * Interface para configuração de templates de comprovante
 */
export interface IComprovanteTemplate {
  tipo: 'cesta_basica' | 'aluguel_social';
  titulo: string;
  subtitulo?: string;
  rodape?: string;
  camposAssinatura: {
    beneficiario: boolean;
    tecnico: boolean;
    testemunha?: boolean;
  };
}

/**
 * Interface para o serviço de geração de PDF
 */
export interface IComprovantePdfService {
  /**
   * Gera um comprovante em PDF baseado nos dados fornecidos
   * @param dados Dados para preenchimento do comprovante
   * @param template Configuração do template a ser utilizado
   * @returns Buffer do PDF gerado
   */
  gerarComprovante(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): Promise<Buffer>;

  /**
   * Cria a definição do documento PDF para o pdfmake
   * @param dados Dados para preenchimento
   * @param template Configuração do template
   * @returns Definição do documento para o pdfmake
   */
  criarDefinicaoDocumento(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): TDocumentDefinitions;
}