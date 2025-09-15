// Módulo principal
export { PdfCommonModule } from './pdf-common.module';

// Serviços
export {
  PdfCommonService,
  PdfTemplateService,
  PdfConfigService,
  PdfUtilsService,
  type IValidationResult,
  type IFormatOptions,
  type ISanitizeOptions,
  type IConfiguracaoCustomizada,
  type IEstiloCustomizado
} from './services';

// Interfaces
export {
  IPdfDados,
  IPdfConteudo,
  IPdfAssinatura,
  IPdfMetadados,
  IPdfConfiguracao,
  IPdfTemplate
} from './interfaces';

// Enums
export {
  PdfTipoConteudo,
  PdfTipoAssinatura,
  PdfOrientacao,
  PdfTamanhoPapel,
  PdfTipoTemplate
} from './enums';

// Constants
export {
  ESTILOS_PADRAO,
  CORES_PADRAO,
  CONFIGURACAO_PADRAO,
  MARGENS_POR_TIPO,
  CONFIGURACAO_PAGINA,
  CONFIGURACAO_FONTES,
  CONFIGURACAO_IMAGEM,
  MENSAGENS_ERRO,
  MENSAGENS_SUCESSO,
  MENSAGENS_VALIDACAO,
  MENSAGENS_LOG
} from './constants';