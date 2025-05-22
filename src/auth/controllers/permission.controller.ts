import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { RequiresPermission } from '../decorators/requires-permission.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { ScopeType } from '../entities/user-permission.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * DTO para atribuição de permissão a um usuário.
 */
class AtribuirPermissaoDto {
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
  scopeType: ScopeType;

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
 * Controlador para gerenciamento de permissões.
 * 
 * Este controlador fornece endpoints para gerenciar permissões de usuários,
 * incluindo verificação, atribuição e revogação de permissões.
 */
@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('v1/permissoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Verifica se o usuário autenticado tem uma permissão específica.
   * 
   * @param permissionName Nome da permissão
   * @param scopeType Tipo de escopo (opcional)
   * @param scopeId ID do escopo (opcional)
   * @param req Requisição
   * @returns Resultado da verificação
   */
  @Get('verificar')
  @ApiOperation({ summary: 'Verifica se o usuário tem uma permissão específica' })
  @ApiResponse({ status: 200, description: 'Retorna o resultado da verificação' })
  @RequiresPermission({ permissionName: 'usuario.permissao.visualizar' })
  async verificarPermissao(
    @Query('permissionName') permissionName: string,
    @Query('scopeType') scopeType: ScopeType = ScopeType.GLOBAL,
    @Req() req: any,
    @Query('scopeId') scopeId?: string
  ) {
    if (!permissionName) {
      throw new BadRequestException('Nome da permissão é obrigatório');
    }

    const userId = req.user.id;
    const hasPermission = await this.permissionService.hasPermission({
      userId,
      permissionName,
      scopeType,
      scopeId,
    });

    return {
      userId,
      permissionName,
      scopeType,
      scopeId,
      hasPermission,
    };
  }

  /**
   * Obtém todas as permissões de um usuário.
   * 
   * @param userId ID do usuário
   * @returns Lista de permissões do usuário
   */
  @Get('usuario/:userId')
  @ApiOperation({ summary: 'Obtém todas as permissões de um usuário' })
  @ApiResponse({ status: 200, description: 'Retorna a lista de permissões do usuário' })
  @RequiresPermission({ permissionName: 'usuario.permissao.visualizar' })
  async obterPermissoesUsuario(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('ID do usuário é obrigatório');
    }

    const permissions = await this.permissionService.getUserPermissions(userId);
    return permissions;
  }

  /**
   * Atribui uma permissão a um usuário.
   * 
   * @param dto DTO com os dados da permissão
   * @param req Requisição
   * @returns Resultado da operação
   */
  @Post('atribuir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atribui uma permissão a um usuário' })
  @ApiResponse({ status: 200, description: 'Permissão atribuída com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiresPermission({ permissionName: 'usuario.permissao.atribuir' })
  async atribuirPermissao(@Body() dto: AtribuirPermissaoDto, @Req() req: any) {
    if (!dto.userId || !dto.permissionName || !dto.scopeType) {
      throw new BadRequestException('Dados incompletos');
    }

    if (dto.scopeType === ScopeType.UNIT && !dto.scopeId) {
      throw new BadRequestException('ID do escopo é obrigatório para escopo UNIT');
    }

    const createdBy = req.user.id;
    const result = await this.permissionService.grantPermission(
      dto.userId,
      dto.permissionName,
      dto.scopeType,
      dto.scopeId || null,
      dto.validUntil || null,
      createdBy,
    );

    if (!result) {
      throw new BadRequestException('Não foi possível atribuir a permissão');
    }

    return {
      success: true,
      message: 'Permissão atribuída com sucesso',
    };
  }

  /**
   * Revoga uma permissão de um usuário.
   * 
   * @param dto DTO com os dados da permissão
   * @param req Requisição
   * @returns Resultado da operação
   */
  @Delete('revogar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga uma permissão de um usuário' })
  @ApiResponse({ status: 200, description: 'Permissão revogada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiresPermission({ permissionName: 'usuario.permissao.revogar' })
  async revogarPermissao(@Body() dto: AtribuirPermissaoDto, @Req() req: any) {
    if (!dto.userId || !dto.permissionName || !dto.scopeType) {
      throw new BadRequestException('Dados incompletos');
    }

    if (dto.scopeType === ScopeType.UNIT && !dto.scopeId) {
      throw new BadRequestException('ID do escopo é obrigatório para escopo UNIT');
    }

    const createdBy = req.user.id;
    const result = await this.permissionService.revokePermission(
      dto.userId,
      dto.permissionName,
      dto.scopeType,
      dto.scopeId || null,
      createdBy,
    );

    if (!result) {
      throw new NotFoundException('Permissão não encontrada ou já revogada');
    }

    return {
      success: true,
      message: 'Permissão revogada com sucesso',
    };
  }
}
