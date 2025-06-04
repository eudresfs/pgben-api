import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../entities/permission.entity';
import { PermissionGroup } from '../../entities/permission-group.entity';
import { PermissionGroupMapping } from '../../entities/permission-group-mapping.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserPermission } from '../../entities/user-permission.entity';
import { PermissionScope } from '../../entities/permission-scope.entity';
import { PermissionRepository } from '../../auth/repositories/permission.repository';
import { PermissionGroupRepository } from '../../auth/repositories/permission-group.repository';
import { PermissionGroupMappingRepository } from '../../auth/repositories/permission-group-mapping.repository';
import { RolePermissionRepository } from '../../auth/repositories/role-permission.repository';
import { UserPermissionRepository } from '../../auth/repositories/user-permission.repository';
import { PermissionScopeRepository } from '../../auth/repositories/permission-scope.repository';
import { PermissionService } from '../../auth/services/permission.service';
import { PermissionGuard } from '../../auth/guards/permission.guard';

@Global()
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
  ],
  providers: [
    PermissionRepository,
    PermissionGroupRepository,
    PermissionGroupMappingRepository,
    RolePermissionRepository,
    UserPermissionRepository,
    PermissionScopeRepository,
    PermissionService,
    PermissionGuard,
    Reflector,
  ],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionSharedModule {}
