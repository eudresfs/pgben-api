import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { TipoUrnaEnum } from '@/enums';

/**
 * Interface para dados do beneficiário utilizados no documento
 */
export interface IBeneficiarioDocumento {
  nome: string;
  cpf: string;
  rg?: string;
  data_nascimento?: Date;
  endereco?: {
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
 * Interface para dados da solicitação utilizados no documento
 */
export interface ISolicitacaoDocumento {
  id: string;
  protocolo: string;
  dataAbertura: Date;
  status: string;
  observacoes?: string;
  tipoBeneficio: {
    nome: string;
    descricao?: string;
  };
}

/**
 * Interface para dados da unidade/órgão responsável
 */
export interface IUnidadeDocumento {
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
}

/**
 * Interface para dados do técnico responsável
 */
export interface ITecnicoDocumento {
  nome: string;
  unidade?: string;
  matricula?: string;
  cargo?: string;
}

/**
 * Interface para dados do requerente (específico para Benefício Ataúde)
 */
export interface IRequerenteDocumento {
  nome?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  parentesco?: string;
  grau_parentesco?: string;
  endereco?: {
    logradouro: string;
    bairro: string;
    numero?: string;
    complemento?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
}

/**
 * Interface para dados específicos do Benefício Ataúde
 */
export interface IBeneficioAtaudeDocumento {
  tipo_urna: TipoUrnaEnum;
  valor_urna: number;
  grau_parentesco: string;
  valor_autorizado?: number;
  data_autorizacao?: string;
  observacoes?: string;
  funeraria?: {
    nome: string;
    endereco?: string;
    telefone?: string;
  };
  cemiterio?: {
    nome: string;
    endereco?: string;
  };
  data_obito?: string;
  declaracao_obito?: string;
}

/**
 * Interface principal para dados do documento
 */
export interface IDadosDocumento {
  beneficiario: IBeneficiarioDocumento;
  solicitacao: ISolicitacaoDocumento;
  unidade: IUnidadeDocumento;
  tecnico?: ITecnicoDocumento;
  requerente?: IRequerenteDocumento;
  dados_ataude?: IBeneficioAtaudeDocumento; 
  data_geracao?: string;
  numero_documento?: string;
  protocolo?: string;
}

/**
 * Interface para configuração de templates de documento
 */
export interface IDocumentoTemplate {
  tipo: TipoDocumentoEnum;
  titulo: string;
  subtitulo?: string;
  rodape?: string;
  camposAssinatura: {
    beneficiario: boolean;
    requerente: boolean;
    tecnico: boolean;
    testemunha?: boolean;
  };
}

/**
 * Interface para o serviço de geração de PDF
 */
export interface IDocumentoPdfService {
  /**
   * Gera um documento em PDF baseado nos dados fornecidos
   * @param dados Dados para preenchimento do documento
   * @param template Configuração do template a ser utilizado
   * @returns Buffer do PDF gerado
   */
  gerarDocumento(
    dados: IDadosDocumento,
    template: IDocumentoTemplate,
  ): Promise<Buffer>;

  /**
   * Cria a definição do documento PDF para o pdfmake
   * @param dados Dados para preenchimento
   * @param template Configuração do template
   * @returns Definição do documento para o pdfmake
   */
  criarDefinicaoDocumento(
    dados: IDadosDocumento,
    template: IDocumentoTemplate,
  ): TDocumentDefinitions;
}