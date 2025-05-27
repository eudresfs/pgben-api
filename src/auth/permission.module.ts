import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Permission } from './entities/permission.entity';
import { PermissionGroup } from './entities/permission-group.entity';
import { PermissionGroupMapping } from './entities/permission-group-mapping.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { PermissionScope } from './entities/permission-scope.entity';

// Repositories
import { PermissionRepository } from './repositories/permission.repository';
import { PermissionGroupRepository } from './repositories/permission-group.repository';
import { PermissionGroupMappingRepository } from './repositories/permission-group-mapping.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { UserPermissionRepository } from './repositories/user-permission.repository';
import { PermissionScopeRepository } from './repositories/permission-scope.repository';

// Services
import { PermissionService } from './services/permission.service';

// Guards
import { PermissionGuard } from './guards/permission.guard';

// Constants
const PERMISSION_CACHE_CONFIG = {
  TTL_SECONDS: 300, // 5 minutos
  MAX_ITEMS: 1000,
  STORE: 'memory' as const,
};

/**
 * Módulo de Permissões Granulares
 * 
 * Responsável por:
 * - Gerenciamento de permissões granulares por usuário e role
 * - Sistema de cache para otimização de performance
 * - Guards para controle de acesso baseado em permissões
 * - Repositórios especializados para queries de permissões
 * - Integração com sistema de escopos (unidade, regional, etc.)
 * 
 * @example
 * ```typescript
 * // Uso do guard em controllers
 * @UseGuards(PermissionGuard)
 * @RequiresPermission({
 *   permissionName: 'user.create',
 *   scopeType: TipoEscopo.UNIDADE,
 *   scopeIdExpression: 'params.unidadeId'
 * })
 * async createUser() { ... }
 * ```
 */
@Module({
  imports: [
    // Configuração das entidades
    TypeOrmModule.forFeature([
      Permission,
      PermissionGroup,
      PermissionGroupMapping,
      RolePermission,
      UserPermission,
      PermissionScope,
    ]),

    // Cache configurável para permissões
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>(
          'PERMISSION_CACHE_TTL', 
          PERMISSION_CACHE_CONFIG.TTL_SECONDS * 1000
        ),
        max: configService.get<number>(
          'PERMISSION_CACHE_MAX_ITEMS', 
          PERMISSION_CACHE_CONFIG.MAX_ITEMS
        ),
        store: PERMISSION_CACHE_CONFIG.STORE,
        isGlobal: false, // Scoped para evitar conflitos
      }),
    }),

    ConfigModule,
  ],

  providers: [
    // Repositórios customizados
    PermissionRepository,
    PermissionGroupRepository,
    PermissionGroupMappingRepository,
    RolePermissionRepository,
    UserPermissionRepository,
    PermissionScopeRepository,

    // Serviço principal
    PermissionService,

    // Guards
    PermissionGuard,
  ],

  exports: [
    // Serviço para uso em outros módulos
    PermissionService,
    
    // Guard para controle de acesso
    PermissionGuard,
    
    // Repositórios para uso avançado
    PermissionRepository,
    RolePermissionRepository,
    UserPermissionRepository,
    PermissionScopeRepository,
  ],
})
export class PermissionModule implements OnModuleInit {
  private readonly logger = new Logger(PermissionModule.name);

  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Inicialização do módulo com validações de integridade
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🔐 Inicializando PermissionModule...');

    try {
      await this.validateModuleIntegrity();
      await this.performStartupTasks();
      
      this.logger.log('✅ PermissionModule inicializado com sucesso');
    } catch (error) {
      this.logger.error(
        `❌ Erro crítico durante inicialização do PermissionModule: ${error.message}`,
        error.stack
      );
      
      // Em caso de erro crítico, não permitir que a aplicação continue
      // pois permissões são fundamentais para segurança
      throw new Error(
        `PermissionModule falhou na inicialização: ${error.message}`
      );
    }
  }

  /**
   * Valida a integridade do módulo e suas dependências
   * @private
   */
  private async validateModuleIntegrity(): Promise<void> {
    this.logger.debug('Validando integridade do módulo...');

    // Verifica se o PermissionService foi injetado corretamente
    if (!this.permissionService) {
      throw new Error(
        'PermissionService não foi injetado corretamente. Verifique as dependências.'
      );
    }

    // Testa conectividade básica com o banco de dados
    try {
      // Chama getAllPermissions sem argumentos (conforme assinatura correta)
      await this.permissionService.getAllPermissions();
      this.logger.debug('✓ Conectividade com PermissionService validada');
    } catch (error) {
      this.logger.warn(
        `Aviso na validação de conectividade: ${error.message}. Continuando inicialização...`
      );
      // Não falha a inicialização por problemas de validação básica
      // A validação mais rigorosa será feita quando o serviço for efetivamente usado
    }
  }

  /**
   * Executa tarefas de inicialização necessárias
   * @private
   */
  private async performStartupTasks(): Promise<void> {
    this.logger.debug('Executando tarefas de inicialização...');

    try {
      // Como clearPermissionCache requer um permissionName específico,
      // não executamos limpeza geral de cache na inicialização para evitar
      // problemas. O cache será gerenciado naturalmente pelo TTL configurado.
      this.logger.debug('✓ Cache será gerenciado pelo TTL configurado');

      // Pode incluir outras tarefas como:
      // - Sincronização de permissões padrão
      // - Verificação de integridade de dados
      // - Validação de permissões críticas do sistema
      
    } catch (error) {
      this.logger.warn(
        `Aviso durante tarefas de inicialização: ${error.message}`
      );
      // Tarefas de inicialização podem falhar sem comprometer o módulo
    }
  }
}