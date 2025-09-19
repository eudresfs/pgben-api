import { Module, Logger, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppFlowsController } from './controllers/whatsapp-flows.controller';
import { CryptographyService } from './services/cryptography.service';
import { ScreenHandlerService } from './services/screen-handler.service';
import { WhatsAppFlowsService } from './services/whatsapp-flows.service';
import {
  WhatsAppFlowSession,
  WhatsAppFlowLog,
} from './entities';
import { AuthModule } from '../../auth/auth.module';
import { CidadaoModule } from '../cidadao/cidadao.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CacheModule } from '../../shared/cache';
import { EnhancedCacheService } from '../../shared/cache/enhanced-cache.service';
import { createScopedRepositoryProvider } from '../../common/providers/scoped-repository.provider';

/**
 * Módulo do WhatsApp Flows
 *
 * Responsável por gerenciar a integração com o WhatsApp Business API
 * para implementar fluxos interativos de atendimento ao cidadão.
 *
 * Funcionalidades principais:
 * - Processamento de requisições criptografadas do WhatsApp
 * - Gerenciamento de sessões de flow
 * - Handlers para diferentes telas (login, recuperação de senha, busca)
 * - Criptografia AES-256-GCM para comunicação segura
 * - Auditoria e logging de todas as interações
 * - Cache para otimização de performance
 *
 * Integrações:
 * - AuthModule: Para autenticação de usuários
 * - CidadaoModule: Para busca e validação de cidadãos
 * - AuditoriaModule: Para logging e auditoria
 * - CacheModule: Para cache de sessões e dados
 *
 * Segurança:
 * - Todas as comunicações são criptografadas
 * - Validação HMAC das requisições do WhatsApp
 * - Controle de sessões com timeout automático
 * - Logs detalhados para auditoria
 */
@Module({
  imports: [
    // Configuração das entidades do TypeORM
    TypeOrmModule.forFeature([
      WhatsAppFlowSession,
      WhatsAppFlowLog,
    ]),

    // Módulo de configuração para acessar variáveis de ambiente
    ConfigModule,

    // Módulo de cache para otimização de performance
    CacheModule,

    // Integração com módulo de autenticação
    AuthModule,

    // Integração com módulo de cidadãos para busca e validação - usando forwardRef para evitar dependência circular
    forwardRef(() => CidadaoModule),

    // Integração com módulo de auditoria para logging - usando forwardRef para evitar dependência circular
    forwardRef(() => AuditoriaModule),
  ],

  // Controllers expostos pelo módulo
  controllers: [
    WhatsAppFlowsController,
  ],

  // Providers e serviços do módulo
  providers: [
    // Logger para debugging e monitoramento
    Logger,

    // Serviço principal de orquestração dos flows
    WhatsAppFlowsService,

    // Serviço de criptografia para comunicação segura
    CryptographyService,

    // Serviço de handlers para diferentes telas
    ScreenHandlerService,

    // Repositórios com escopo para as entidades
    createScopedRepositoryProvider(WhatsAppFlowSession),
    createScopedRepositoryProvider(WhatsAppFlowLog),

    // Serviço de cache aprimorado
    EnhancedCacheService,
  ],

  // Serviços exportados para uso em outros módulos
  exports: [
    // Exportar TypeORM para acesso às entidades
    TypeOrmModule,

    // Exportar serviços principais para integração
    WhatsAppFlowsService,
    CryptographyService,
    ScreenHandlerService,

    // Exportar cache para uso compartilhado
    EnhancedCacheService,
  ],
})
export class WhatsAppFlowsModule {
  private readonly logger = new Logger(WhatsAppFlowsModule.name);

  constructor() {
    this.logger.log('WhatsAppFlowsModule inicializado com sucesso');
    this.logger.debug('Configurações do módulo:');
    this.logger.debug('- Entidades: WhatsAppFlowSession, WhatsAppFlowLog');
    this.logger.debug('- Serviços: WhatsAppFlowsService, CryptographyService, ScreenHandlerService');
    this.logger.debug('- Integrações: Auth, Cidadao, Auditoria, Cache');
    this.logger.debug('- Segurança: Criptografia AES-256-GCM, Validação HMAC');
  }
}