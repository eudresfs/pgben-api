import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Entidades
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';
import { Unidade } from '../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../beneficio/entities/tipo-beneficio.entity';

// Componentes do módulo usando os arquivos de índice
import { RelatoriosController } from './controllers';
import { RelatoriosService, TempFilesService } from './services';
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
    TypeOrmModule.forFeature([Solicitacao, Unidade, TipoBeneficio]),
    CacheModule.register({
      ttl: 60 * 60 * 1000, // Cache válido por 1 hora
      max: 100, // Máximo de 100 itens no cache
      isGlobal: false,
    }),
  ],
  controllers: [RelatoriosController],
  providers: [
    RelatoriosService,
    TempFilesService,
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
export class RelatoriosUnificadoModule {}
