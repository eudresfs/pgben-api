import { PdfTipoConteudo } from '../enums/pdf-tipo-conteudo.enum';
import { PdfTipoAssinatura } from '../enums/pdf-tipo-assinatura.enum';

/**
 * Interface para configuração de tipos de conteúdo do template
 */
export interface IPdfTipoConteudoConfig {
  tipos: PdfTipoConteudo[];
  permitirCustomizacao?: boolean;
}

/**
 * Interface para configuração de assinaturas do template
 * Máximo de 2 assinaturas por linha
 */
export interface IPdfAssinaturaConfig {
  tipos: PdfTipoAssinatura[];
  maxPorLinha?: number; // Padrão: 2
  obrigatorias?: PdfTipoAssinatura[];
  opcionais?: PdfTipoAssinatura[];
}

/**
 * Interface para configuração completa do template
 */
export interface IPdfTemplateConfig {
  nome: string;
  tipo: string;
  conteudo: IPdfTipoConteudoConfig;
  assinaturas: IPdfAssinaturaConfig;
  headerPadronizado: boolean; // Sempre true para novos templates
  footerPadronizado: boolean; // Sempre true para novos templates
}