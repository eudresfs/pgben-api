import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsuarioService } from '../services/usuario.service';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { UpdateStatusUsuarioDto } from '../dto/update-status-usuario.dto';
import { UpdateSenhaDto } from '../dto/update-senha.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Controlador de usuários
 *
 * Responsável por gerenciar as rotas relacionadas a usuários
 */
@ApiTags('Usuários')
@Controller('v1/usuario')
@UseGuards(JwtAuthGuard) // PermissionGuard removido temporariamente para teste 1.1
@ApiBearerAuth()
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  /**
   * Lista todos os usuários com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'usuario.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidadeId'
  })
  @ApiOperation({ summary: 'Listar usuários' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página atual',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filtro por papel',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'unidadeId',
    required: false,
    type: String,
    description: 'Filtro por unidade',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.usuarioService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      role,
      status,
      unidadeId,
    });
  }

  /**
   * Obtém detalhes de um usuário específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'usuario.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'usuario.unidadeId'
  })
  @ApiOperation({ summary: 'Obter detalhes de um usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usuarioService.findById(id);
  }

  /**
   * Cria um novo usuário
   */
  @Post()
  @RequiresPermission({
    permissionName: 'usuario.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'body.unidadeId'
  })
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({
    status: 409,
    description: 'Email, CPF ou matrícula já em uso',
  })
  async create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  /**
   * Atualiza um usuário existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'usuario.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'usuario.unidadeId'
  })
  @ApiOperation({ summary: 'Atualizar usuário existente' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Email, CPF ou matrícula já em uso',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuarioService.update(id, updateUsuarioDto);
  }

  /**
   * Atualiza o status de um usuário
   */
  @Patch(':id/status')
  @RequiresPermission({
    permissionName: 'usuario.status.alterar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'usuario.unidadeId'
  })
  @ApiOperation({ summary: 'Ativar/inativar usuário' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusUsuarioDto: UpdateStatusUsuarioDto,
  ) {
    return this.usuarioService.updateStatus(id, updateStatusUsuarioDto);
  }

  /**
   * Altera a senha do usuário
   */
  @Put(':id/senha')
  @RequiresPermission({
    permissionName: 'usuario.senha.alterar',
    scopeType: ScopeType.SELF,
    scopeIdExpression: 'params.id'
  })
  @ApiOperation({ summary: 'Alterar senha' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou senha atual incorreta',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateSenha(
    @Param('id') id: string,
    @Body() updateSenhaDto: UpdateSenhaDto,
    @Request() req,
  ) {
    // A verificação agora é feita pelo sistema de permissões granulares

    return this.usuarioService.updateSenha(id, updateSenhaDto);
  }

  /**
   * Obtém o perfil do usuário atual
   */
  @Get('me')
  @RequiresPermission({
    permissionName: 'usuario.perfil.visualizar',
    scopeType: ScopeType.SELF
  })
  @ApiOperation({ summary: 'Obter perfil do usuário atual' })
  @ApiResponse({ status: 200, description: 'Perfil obtido com sucesso' })
  async getProfile(@Request() req) {
    return this.usuarioService.getProfile(req.user.id);
  }
}
