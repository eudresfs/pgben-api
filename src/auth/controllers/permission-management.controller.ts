import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequiresPermission } from '../decorators/requires-permission.decorator';
import { PermissionService } from '../services/permission.service';
import { TipoEscopo } from '../entities/user-permission.entity';
import { AuthorizationService } from '../services/authorization.service';

/**
 * DTO para atribuir permissão a um usuário
 */
class GrantPermissionDto {
  /**
   * ID do usuário
   */
  userId: string;

  /**
   * Nome da permissão
   */
  permissionName: string;

  /**
   * Tipo de escopo
   */
  scopeType: TipoEscopo;

  /**
   * ID do escopo (opcional)
   */
  scopeId?: string;

  /**
   * Data de validade da permissão (opcional)
   */
  validUntil?: Date;
}

/**
 * DTO para revogar permissão de um usuário
 */
class RevokePermissionDto {
  /**
   * ID do usuário
   */
  userId: string;

  /**
   * Nome da permissão
   */
  permissionName: string;

  /**
   * Tipo de escopo
   */
  scopeType: TipoEscopo;

  /**
   * ID do escopo (opcional)
   */
  scopeId?: string;
}

/**
 * DTO para testar permissão de um usuário
 */
class TestPermissionDto {
  /**
   * ID do usuário
   */
  userId: string;

  /**
   * Nome da permissão
   */
  permissionName: string;

  /**
   * Tipo de escopo
   */
  scopeType: TipoEscopo;

  /**
   * ID do escopo (opcional)
   */
  scopeId?: string;
}

/**
 * Controlador para gerenciamento de permissões
 */
@ApiTags('Usuários')
@Controller('v1/permissoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PermissionManagementController {
  private readonly logger = new Logger(PermissionManagementController.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Lista todas as permissões disponíveis no sistema
   */
  @Get()
  @RequiresPermission({
    permissionName: 'usuario.permissao.listar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({ summary: 'Listar todas as permissões' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permissões retornada com sucesso',
  })
  async listAllPermissions() {
    return this.permissionService.getAllPermissions();
  }

  /**
   * Lista as permissões de um usuário específico
   */
  @Get('user/:userId')
  @RequiresPermission({
    permissionName: 'usuario.permissao.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({ summary: 'Listar permissões de um usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permissões do usuário retornada com sucesso',
  })
  async listUserPermissions(@Param('userId') userId: string) {
    return this.permissionService.getUserPermissions(userId);
  }

  /**
   * Lista as permissões de uma role específica
   */
  @Get('role/:roleId')
  @RequiresPermission({
    permissionName: 'usuario.permissao.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({ summary: 'Listar permissões de uma role' })
  @ApiParam({ name: 'roleId', description: 'ID da role' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permissões da role retornada com sucesso',
  })
  async listRolePermissions(@Param('roleId') roleId: string) {
    return this.permissionService.getPermissionsByRole(roleId);
  }

  /**
   * Atribui uma permissão a um usuário
   */
  @Post('atribuir')
  @RequiresPermission({
    permissionName: 'usuario.permissao.atribuir',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Atribuir permissão a um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Permissão atribuída com sucesso',
  })
  async grantPermission(@Body() grantDto: GrantPermissionDto, @Query('createdBy') createdBy: string) {
    if (!createdBy) {
      throw new BadRequestException('O parâmetro createdBy é obrigatório');
    }

    const result = await this.permissionService.grantPermission(
      grantDto.userId,
      grantDto.permissionName,
      grantDto.scopeType,
      grantDto.scopeId || null,
      grantDto.validUntil || null,
      createdBy,
    );

    if (!result) {
      throw new BadRequestException('Não foi possível atribuir a permissão');
    }

    return { message: 'Permissão atribuída com sucesso' };
  }

  /**
   * Revoga uma permissão de um usuário
   */
  @Post('revogar')
  @RequiresPermission({
    permissionName: 'usuario.permissao.revogar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Revogar permissão de um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Permissão revogada com sucesso',
  })
  async revokePermission(@Body() revokeDto: RevokePermissionDto, @Query('revokedBy') revokedBy: string) {
    if (!revokedBy) {
      throw new BadRequestException('O parâmetro revokedBy é obrigatório');
    }

    const result = await this.permissionService.revokePermission(
      revokeDto.userId,
      revokeDto.permissionName,
      revokeDto.scopeType,
      revokeDto.scopeId || null,
      revokedBy,
    );

    if (!result) {
      throw new BadRequestException('Não foi possível revogar a permissão');
    }

    return { message: 'Permissão revogada com sucesso' };
  }

  /**
   * Testa se um usuário possui uma permissão específica
   */
  @Post('testar')
  @RequiresPermission({
    permissionName: 'usuario.permissao.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({ summary: 'Testar se um usuário possui uma permissão' })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste de permissão',
  })
  async testPermission(@Body() testDto: TestPermissionDto) {
    const result = await this.permissionService.hasPermission({
      userId: testDto.userId,
      permissionName: testDto.permissionName,
      scopeType: testDto.scopeType,
      scopeId: testDto.scopeId,
    });

    return { hasPermission: result };
  }

  /**
   * Retorna as permissões do usuário atual
   */
  @Get('me')
  @ApiOperation({ summary: 'Obter permissões do usuário atual' })
  @ApiResponse({
    status: 200,
    description: 'Permissões do usuário atual retornadas com sucesso',
  })
  async getCurrentUserPermissions(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('O parâmetro userId é obrigatório');
    }

    return this.permissionService.getUserPermissions(userId);
  }

  /**
   * Endpoint de debug para verificar permissões (apenas em ambiente não-produção)
   */
  @Get('debug')
  @ApiOperation({ summary: 'Debug de permissões (apenas em ambiente não-produção)' })
  @ApiResponse({
    status: 200,
    description: 'Informações de debug retornadas com sucesso',
  })
  async debugPermissions(@Query('userId') userId: string) {
    // Verificar se estamos em ambiente de produção
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new UnauthorizedException('Este endpoint não está disponível em ambiente de produção');
    }

    if (!userId) {
      throw new BadRequestException('O parâmetro userId é obrigatório');
    }

    const userPermissions = await this.permissionService.getUserPermissions(userId);
    const rolePermissions = await this.permissionService.getRolePermissionsByUserId(userId);

    return {
      userPermissions,
      rolePermissions,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
