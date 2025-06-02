import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module'
import { 
  ParametroService, 
  TemplateService, 
  WorkflowService,
  IntegracaoService,
  LimitesService
} from './services';
import { 
  ParametroRepository, 
  TemplateRepository, 
  WorkflowBeneficioRepository,
  ConfiguracaoIntegracaoRepository
} from './repositories';
import { Parametro, Template, WorkflowBeneficio, ConfiguracaoIntegracao } from '../../entities';
import {
  ParametroController,
  TemplateController,
  WorkflowController,
  IntegracaoController,
  LimitesController
} from './controllers';

/**
 * Módulo de Configuração do PGBen
 * 
 * Responsável por centralizar a gestão de parâmetros operacionais,
 * templates, workflows e integrações do sistema.
 * 
 * Este módulo permite personalizar o comportamento do sistema sem
 * necessidade de alterações no código-fonte, fornecendo uma camada
 * de abstração para configurações dinâmicas.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parametro,
      Template,
      WorkflowBeneficio,
      ConfiguracaoIntegracao
    ]),
    // Importa o módulo compartilhado de autenticação
    AuthModule
  ],
  controllers: [
    ParametroController,
    TemplateController,
    WorkflowController,
    IntegracaoController,
    LimitesController
  ],
  providers: [
    // Repositórios
    ParametroRepository,
    TemplateRepository,
    WorkflowBeneficioRepository,
    ConfiguracaoIntegracaoRepository,
    
    // Serviços
    ParametroService,
    TemplateService,
    WorkflowService,
    IntegracaoService,
    LimitesService
  ],
  exports: [
    // Exportamos os serviços para uso em outros módulos
    ParametroService,
    TemplateService,
    WorkflowService,
    IntegracaoService,
    LimitesService
  ]
})
export class ConfiguracaoModule {
  /**
   * Documentação do módulo de configuração
   * 
   * Este módulo fornece:
   * 
   * 1. Gerenciamento de parâmetros do sistema com tipagem dinâmica
   * 2. Sistema de templates para emails, notificações e documentos
   * 3. Workflows personalizáveis para tipos de benefícios
   * 4. Configurações de integrações externas
   * 5. Limites operacionais configuráveis
   * 
   * É implementado seguindo os princípios SOLID e Clean Architecture,
   * com serviços especializados para cada domínio e repositórios
   * para abstração da camada de persistência.
   */
}
