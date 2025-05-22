import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * DTO para criação de cidadão (exemplo simplificado).
 */
class CreateCidadaoDto {
  nome: string;
  cpf: string;
  nis?: string;
  dataNascimento: Date;
  unidadeId: string;
}

/**
 * DTO para atualização de cidadão (exemplo simplificado).
 */
class UpdateCidadaoDto {
  nome?: string;
  dataNascimento?: Date;
  unidadeId?: string;
}

/**
 * Controlador para gerenciamento de cidadãos.
 * 
 * Este controlador demonstra como aplicar o sistema de permissões granulares
 * em um controlador existente, utilizando o decorador RequiresPermission e
 * o guard PermissionGuard.
 */
@ApiTags('Cidadãos')
@ApiBearerAuth()
@Controller('cidadaos')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CidadaoController {
  /**
   * Obtém uma lista paginada de cidadãos.
   * 
   * @param pagina Página
   * @param limite Limite de itens por página
   * @param unidadeId ID da unidade (opcional)
   * @returns Lista paginada de cidadãos
   */
  @Get()
  @ApiOperation({ summary: 'Obtém uma lista paginada de cidadãos' })
  @ApiResponse({ status: 200, description: 'Retorna a lista de cidadãos' })
  @RequiresPermission({
    permissionName: 'cidadao.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidadeId',
  })
  async listar(
    @Query('pagina') pagina = 1,
    @Query('limite') limite = 10,
    @Query('unidadeId') unidadeId?: string,
  ) {
    // Implementação do serviço para listar cidadãos
    return {
      dados: [],
      pagina,
      limite,
      total: 0,
      unidadeId,
    };
  }

  /**
   * Obtém um cidadão pelo ID.
   * 
   * @param id ID do cidadão
   * @returns Dados do cidadão
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtém um cidadão pelo ID' })
  @ApiResponse({ status: 200, description: 'Retorna os dados do cidadão' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId', // Expressão que será avaliada após buscar o cidadão
  })
  async obterPorId(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('ID do cidadão é obrigatório');
    }

    // Simulação de busca de cidadão
    const cidadao = {
      id,
      nome: 'Cidadão Exemplo',
      cpf: '123.456.789-00',
      dataNascimento: new Date('1990-01-01'),
      unidadeId: '550e8400-e29b-41d4-a716-446655440000',
    };

    return cidadao;
  }

  /**
   * Busca um cidadão pelo CPF.
   * 
   * @param cpf CPF do cidadão
   * @returns Dados do cidadão
   */
  @Get('busca/cpf/:cpf')
  @ApiOperation({ summary: 'Busca um cidadão pelo CPF' })
  @ApiResponse({ status: 200, description: 'Retorna os dados do cidadão' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({ permissionName: 'cidadao.buscar.cpf' })
  async buscarPorCpf(@Param('cpf') cpf: string) {
    if (!cpf) {
      throw new BadRequestException('CPF é obrigatório');
    }

    // Simulação de busca de cidadão por CPF
    const cidadao = {
      id: '123',
      nome: 'Cidadão Exemplo',
      cpf,
      dataNascimento: new Date('1990-01-01'),
      unidadeId: '550e8400-e29b-41d4-a716-446655440000',
    };

    return cidadao;
  }

  /**
   * Cria um novo cidadão.
   * 
   * @param createCidadaoDto DTO com os dados do cidadão
   * @returns Cidadão criado
   */
  @Post()
  @ApiOperation({ summary: 'Cria um novo cidadão' })
  @ApiResponse({ status: 201, description: 'Cidadão criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiresPermission({
    permissionName: 'cidadao.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'body.unidadeId',
  })
  async criar(@Body() createCidadaoDto: CreateCidadaoDto) {
    // Implementação do serviço para criar cidadão
    return {
      id: '123',
      ...createCidadaoDto,
    };
  }

  /**
   * Atualiza um cidadão existente.
   * 
   * @param id ID do cidadão
   * @param updateCidadaoDto DTO com os dados do cidadão
   * @returns Cidadão atualizado
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um cidadão existente' })
  @ApiResponse({ status: 200, description: 'Cidadão atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId', // Expressão que será avaliada após buscar o cidadão
  })
  async atualizar(@Param('id') id: string, @Body() updateCidadaoDto: UpdateCidadaoDto) {
    if (!id) {
      throw new BadRequestException('ID do cidadão é obrigatório');
    }

    // Simulação de busca de cidadão
    const cidadao = {
      id,
      nome: 'Cidadão Exemplo',
      cpf: '123.456.789-00',
      dataNascimento: new Date('1990-01-01'),
      unidadeId: '550e8400-e29b-41d4-a716-446655440000',
    };

    // Implementação do serviço para atualizar cidadão
    return {
      ...cidadao,
      ...updateCidadaoDto,
    };
  }

  /**
   * Remove um cidadão.
   * 
   * @param id ID do cidadão
   * @returns Resultado da operação
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove um cidadão' })
  @ApiResponse({ status: 200, description: 'Cidadão removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({
    permissionName: 'cidadao.excluir',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId', // Expressão que será avaliada após buscar o cidadão
  })
  async remover(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('ID do cidadão é obrigatório');
    }

    // Simulação de busca de cidadão
    const cidadao = {
      id,
      nome: 'Cidadão Exemplo',
      cpf: '123.456.789-00',
      dataNascimento: new Date('1990-01-01'),
      unidadeId: '550e8400-e29b-41d4-a716-446655440000',
    };

    // Implementação do serviço para remover cidadão
    return {
      success: true,
      message: 'Cidadão removido com sucesso',
    };
  }

  /**
   * Exporta dados de cidadãos.
   * 
   * @param unidadeId ID da unidade (opcional)
   * @param formato Formato de exportação (csv, xlsx)
   * @returns URL para download do arquivo
   */
  @Get('exportar')
  @ApiOperation({ summary: 'Exporta dados de cidadãos' })
  @ApiResponse({ status: 200, description: 'Retorna URL para download do arquivo' })
  @RequiresPermission({
    permissionName: 'cidadao.exportar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidadeId',
  })
  async exportar(
    @Query('unidadeId') unidadeId?: string,
    @Query('formato') formato: 'csv' | 'xlsx' = 'csv',
  ) {
    // Implementação do serviço para exportar cidadãos
    return {
      url: `https://exemplo.com/downloads/cidadaos-${formato}.${formato}`,
      formato,
      unidadeId,
    };
  }
}
