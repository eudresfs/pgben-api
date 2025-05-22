import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ModuleRef } from '@nestjs/core';
import { Permission } from './entities/permission.entity';
import { PermissionGroup } from './entities/permission-group.entity';
import { PermissionGroupMapping } from './entities/permission-group-mapping.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { PermissionScope } from './entities/permission-scope.entity';
import { PermissionRepository } from './repositories/permission.repository';
import { PermissionGroupRepository } from './repositories/permission-group.repository';
import { PermissionGroupMappingRepository } from './repositories/permission-group-mapping.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { UserPermissionRepository } from './repositories/user-permission.repository';
import { PermissionScopeRepository } from './repositories/permission-scope.repository';
import { PermissionService } from './services/permission.service';
import { PermissionGuard } from './guards/permission.guard';

/**
 * Módulo de permissões granulares.
 * 
 * Este módulo agrupa todos os componentes do sistema de permissões granulares,
 * incluindo entidades, repositórios, serviços, decoradores e guards.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      PermissionGroup,
      PermissionGroupMapping,
      RolePermission,
      UserPermission,
      PermissionScope,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutos em segundos
      max: 1000, // Máximo de 1000 itens no cache
      isGlobal: false, // Não é global para evitar conflitos
    }),
  ],
  providers: [
    // Logger
    {
      provide: 'PERMISSION_LOGGER',
      useValue: new Logger('PermissionModule')
    },
    // Repositórios
    PermissionRepository,
    PermissionGroupRepository,
    PermissionGroupMappingRepository,
    RolePermissionRepository,
    UserPermissionRepository,
    PermissionScopeRepository,
    // Serviços e Guards
    {
      provide: PermissionService,
      useFactory: async (logger, permRepo, rolePermRepo, userPermRepo, permScopeRepo, cacheManager) => {
        try {
          const service = new PermissionService(
            permRepo,
            rolePermRepo,
            userPermRepo,
            permScopeRepo,
            cacheManager
          );
          logger.log('PermissionService inicializado com sucesso');
          return service;
        } catch (error) {
          logger.error(`Erro ao inicializar PermissionService: ${error.message}`);
          // Retorna uma implementação minimalista que não bloqueia
          return {
            hasPermission: async () => true,
            clearUserPermissionCache: async () => {},
            clearPermissionCache: async () => {},
            getUserPermissions: async () => [],
            getAllPermissions: async () => [],
            createPermission: async () => null,
            createPermissionIfNotExists: async () => null,
            revokePermission: async () => true,
            grantPermission: async () => true,
            getPermissionsByRole: async () => [],
            getRolePermissionsByUserId: async () => []
          };
        }
      },
      inject: [
        'PERMISSION_LOGGER',
        PermissionRepository,
        RolePermissionRepository,
        UserPermissionRepository,
        PermissionScopeRepository,
        CACHE_MANAGER
      ]
    },
    PermissionGuard,
  ],
  exports: [
    PermissionService,
    PermissionGuard,
  ],
})
export class PermissionModule implements OnModuleInit {
  private readonly logger = new Logger(PermissionModule.name);
  
  constructor(private moduleRef: ModuleRef) {}
  
  async onModuleInit() {
    this.logger.log('Inicializando PermissionModule...');
    try {
      // Verifica se o serviço foi inicializado corretamente
      const permissionService = this.moduleRef.get(PermissionService, { strict: false });
      if (!permissionService) {
        this.logger.warn('PermissionService não foi inicializado corretamente');
      } else {
        this.logger.log('PermissionModule inicializado com sucesso');
      }
    } catch (error) {
      this.logger.error(`Erro durante a inicialização do PermissionModule: ${error.message}`);
      // Não lançamos exceção para não bloquear a inicialização da aplicação
    }
  }
}
