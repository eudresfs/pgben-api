import { Module } from '@nestjs/common';
import { PdfCommonService } from './services/pdf-common.service';
import { PdfConfigService } from './services/pdf-config.service';
import { PdfUtilsService } from './services/pdf-utils.service';
import { PdfTemplateService } from './services/pdf-template.service';

/**
 * Módulo comum para funcionalidades de PDF
 * Fornece serviços compartilhados para geração e manipulação de PDFs
 */
@Module({
  providers: [
    PdfCommonService,
    PdfConfigService,
    PdfUtilsService,
    PdfTemplateService,
  ],
  exports: [
    PdfCommonService,
    PdfConfigService,
    PdfUtilsService,
    PdfTemplateService,
  ],
})
export class PdfCommonModule {}