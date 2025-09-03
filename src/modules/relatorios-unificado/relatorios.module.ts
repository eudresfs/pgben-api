import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../../auth/auth.module';

// Entidades
import { Solicitacao, Unidade, TipoBeneficio } from '../../entities';

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
      ttl: 300, // 5 minutos de cache
      max: 100, // máximo de 100 itens em cache
    }),
    // Importa o módulo compartilhado de autenticação
    AuthModule,
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
