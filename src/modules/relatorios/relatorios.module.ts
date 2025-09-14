import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../../auth/auth.module';
import { PdfCommonModule } from '../../common/pdf/pdf-common.module';

// Entidades
import { Solicitacao, Unidade, TipoBeneficio } from '../../entities';
import { Pagamento } from '../../entities/pagamento.entity';

// Componentes do módulo usando os arquivos de índice
import { RelatoriosController } from './controllers';
import { RelatoriosService, TempFilesService, PdfTemplatesService, PdfAdapterService } from './services';
import { RelatorioPagamentosTemplate } from '../../common/pdf/templates/relatorios/relatorio-pagamentos.template';
import { PdfVazioTemplate } from '../../common/pdf/templates/relatorios/pdf-vazio.template';
import { PdfStrategy, ExcelStrategy, CsvStrategy } from './strategies';
import { RelatoriosAuditInterceptor } from './interceptors';

/**
 * Módulo de Relatórios Unificado
 *
 * Este módulo é responsável pela geração de relatórios em diversos formatos (PDF, Excel, CSV)
 * no Sistema de Gestão de Benefícios Eventuais. Consolida as funcionalidades dos antigos
 * módulos 'relatorio' e 'relatorios'.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitacao, Unidade, TipoBeneficio, Pagamento]),
    CacheModule.register({
      ttl: 300, // 5 minutos de cache
      max: 100, // máximo de 100 itens em cache
    }),
    // Importa o módulo compartilhado de autenticação
    AuthModule,
    // Importa o módulo comum de PDF
    PdfCommonModule,
  ],
  controllers: [RelatoriosController],
  providers: [
    RelatoriosService,
    TempFilesService,
    PdfTemplatesService,
    PdfAdapterService,
    RelatorioPagamentosTemplate,
    PdfVazioTemplate,
    PdfStrategy,
    ExcelStrategy,
    CsvStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: RelatoriosAuditInterceptor,
    },
  ],
  exports: [RelatoriosService, TempFilesService],
})
export class RelatoriosModule {}
