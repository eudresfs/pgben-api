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
  HttpCode,
  HttpStatus,
  Req,
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
import { TipoEscopo } from '../../entities/user-permission.entity';
import { AuthorizationService } from '../services/authorization.service';

/**
 * DTO para atribuir permissão a um usuário
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
  scopeType: TipoEscopo;

  /**
   * ID do escopo (opcional)
   */
  scopeId?: string;

  /**
   * Data de validade (opcional)
   */
  validUntil?: Date;
}

/**
 * DTO para revogar permissão de um usuário
 */
class RevogarPermissaoDto {
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
 * Controlador para gerenciamento de permissões de usuários.
 *
 * Este controlador fornece endpoints para gerenciar permissões de usuários,
 * incluindo verificação, atribuição, revogação e listagem de permissões.
 */
@ApiTags('Permissões')
@ApiBearerAuth()
@Controller('permissoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionController {
  private readonly logger = new Logger(PermissionController.name);

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
  @ApiOperation({ summary: 'Listar todas as permissões disponíveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permissões retornada com sucesso',
  })
  async listarTodasPermissoes() {
    return this.permissionService.getAllPermissions();
  }

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
  @ApiOperation({
    summary: 'Verifica se o usuário tem uma permissão específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna o resultado da verificação',
  })
  @RequiresPermission({ permissionName: 'usuario.permissao.visualizar' })
  async verificarPermissao(
    @Query('permissionName') permissionName: string,
    @Query('scopeType') scopeType: TipoEscopo = TipoEscopo.GLOBAL,
    @Req() req: any,
    @Query('scopeId') scopeId?: string,
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
   * Obtém todas as permissões de um usuário específico.
   *
   * @param userId ID do usuário
   * @returns Lista de permissões do usuário
   */
  @Get('usuario/:userId')
  @ApiOperation({ summary: 'Obtém todas as permissões de um usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permissões do usuário retornada com sucesso',
  })
  @RequiresPermission({ permissionName: 'usuario.permissao.visualizar' })
  async obterPermissoesUsuario(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('ID do usuário é obrigatório');
    }

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
  async listarPermissoesRole(@Param('roleId') roleId: string) {
    return this.permissionService.getPermissionsByRole(roleId);
  }

  /**
   * Atribui uma permissão a um usuário.
   *
   * @param dto DTO com os dados da permissão
   * @param createdBy Usuário que está atribuindo a permissão
   * @param req Requisição
   * @returns Resultado da operação
   */
  @Post('atribuir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atribui uma permissão a um usuário' })
  @ApiResponse({ status: 200, description: 'Permissão atribuída com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiresPermission({ permissionName: 'usuario.permissao.atribuir' })
  async atribuirPermissao(
    @Body() dto: AtribuirPermissaoDto,
    @Query('createdBy') createdBy: string,
    @Req() req: any,
  ) {
    if (!dto.userId || !dto.permissionName || !dto.scopeType) {
      throw new BadRequestException('Dados incompletos');
    }

    if (dto.scopeType === TipoEscopo.UNIDADE && !dto.scopeId) {
      throw new BadRequestException(
        'ID do escopo é obrigatório para escopo UNIDADE',
      );
    }

    // Se createdBy não for fornecido, usar o usuário autenticado
    const createdByUser = createdBy || req.user.id;

    const result = await this.permissionService.grantPermission(
      dto.userId,
      dto.permissionName,
      dto.scopeType,
      dto.scopeId || null,
      dto.validUntil || null,
      createdByUser,
    );

    if (!result) {
      throw new BadRequestException('Não foi possível atribuir a permissão');
    }

    this.logger.log(
      `Permissão ${dto.permissionName} atribuída ao usuário ${dto.userId} por ${createdByUser}`,
    );

    return { message: 'Permissão atribuída com sucesso' };
  }

  /**
   * Revoga uma permissão de um usuário.
   *
   * @param dto DTO com os dados da permissão
   * @param revokedBy Usuário que está revogando a permissão
   * @param req Requisição
   * @returns Resultado da operação
   */
  @Post('revogar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga uma permissão de um usuário' })
  @ApiResponse({ status: 200, description: 'Permissão revogada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiresPermission({ permissionName: 'usuario.permissao.revogar' })
  async revogarPermissao(
    @Body() dto: RevogarPermissaoDto,
    @Query('revokedBy') revokedBy: string,
    @Req() req: any,
  ) {
    if (!dto.userId || !dto.permissionName || !dto.scopeType) {
      throw new BadRequestException('Dados incompletos');
    }

    // Se revokedBy não for fornecido, usar o usuário autenticado
    const revokedByUser = revokedBy || req.user.id;

    const result = await this.permissionService.revokePermission(
      dto.userId,
      dto.permissionName,
      dto.scopeType,
      dto.scopeId || null,
      revokedByUser,
    );

    if (!result) {
      throw new BadRequestException('Não foi possível revogar a permissão');
    }

    this.logger.log(
      `Permissão ${dto.permissionName} revogada do usuário ${dto.userId} por ${revokedByUser}`,
    );

    return { message: 'Permissão revogada com sucesso' };
  }

  /**
   * Remove uma permissão específica de um usuário.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @param req Requisição
   * @returns Resultado da operação
   */
  @Delete('usuario/:userId/permissao/:permissionName')
  @ApiOperation({ summary: 'Remove uma permissão específica de um usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiParam({ name: 'permissionName', description: 'Nome da permissão' })
  @ApiResponse({ status: 200, description: 'Permissão removida com sucesso' })
  @RequiresPermission({ permissionName: 'usuario.permissao.remover' })
  async removerPermissao(
    @Param('userId') userId: string,
    @Param('permissionName') permissionName: string,
    @Req() req: any,
  ) {
    if (!userId || !permissionName) {
      throw new BadRequestException('Parâmetros obrigatórios');
    }

    const result = await this.permissionService.revokePermission(
      userId,
      permissionName,
      TipoEscopo.GLOBAL,
      null,
      req.user.id,
    );

    if (!result) {
      throw new NotFoundException('Permissão não encontrada');
    }

    this.logger.log(
      `Permissão ${permissionName} removida do usuário ${userId} por ${req.user.id}`,
    );

    return { message: 'Permissão removida com sucesso' };
  }
}
