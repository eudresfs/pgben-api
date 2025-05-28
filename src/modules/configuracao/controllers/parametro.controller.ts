import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { ParametroService } from '../services/parametro.service';
import { ParametroCreateDto } from '../dtos/parametro/parametro-create.dto';
import { ParametroUpdateDto } from '../dtos/parametro/parametro-update.dto';
import { ParametroResponseDto } from '../dtos/parametro/parametro-response.dto';

/**
 * Controlador responsável pelas operações de parâmetros do sistema
 */
@ApiTags('Configuração')
@ApiBearerAuth()
@Controller('configuracao/parametros')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ParametroController {
  constructor(private readonly parametroService: ParametroService) {}

  /**
   * Busca todos os parâmetros do sistema
   * @param categoria Categoria opcional para filtrar
   * @returns Lista de parâmetros
   */
  @Get()
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.listar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Buscar todos os parâmetros do sistema' })
  @ApiQuery({ 
    name: 'categoria', 
    required: false, 
    description: 'Filtrar por categoria'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de parâmetros encontrados',
    type: [ParametroResponseDto]
  })
  async buscarTodos(
    @Query('categoria') categoria?: string
  ): Promise<ParametroResponseDto[]> {
    return this.parametroService.buscarTodos(categoria);
  }

  /**
   * Busca um parâmetro específico por sua chave
   * @param chave Chave do parâmetro
   * @returns Parâmetro encontrado
   */
  @Get(':chave')
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.visualizar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Buscar parâmetro por chave' })
  @ApiParam({ 
    name: 'chave', 
    description: 'Chave única do parâmetro',
    example: 'sistema.nome' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Parâmetro encontrado',
    type: ParametroResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Parâmetro não encontrado'
  })
  async buscarPorChave(
    @Param('chave') chave: string
  ): Promise<ParametroResponseDto> {
    return this.parametroService.buscarPorChave(chave);
  }

  /**
   * Cria um novo parâmetro no sistema
   * @param dto Dados do parâmetro a ser criado
   * @returns Parâmetro criado
   */
  @Post()
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.criar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Criar novo parâmetro' })
  @ApiResponse({ 
    status: 201, 
    description: 'Parâmetro criado com sucesso',
    type: ParametroResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou parâmetro já existe'
  })
  async criar(
    @Body() dto: ParametroCreateDto
  ): Promise<ParametroResponseDto> {
    return this.parametroService.criar(dto);
  }

  /**
   * Atualiza um parâmetro existente
   * @param chave Chave do parâmetro
   * @param dto Dados para atualização
   * @returns Parâmetro atualizado
   */
  @Put(':chave')
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.editar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Atualizar parâmetro existente' })
  @ApiParam({ 
    name: 'chave', 
    description: 'Chave única do parâmetro',
    example: 'sistema.nome' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Parâmetro atualizado com sucesso',
    type: ParametroResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Parâmetro não encontrado'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou parâmetro não editável'
  })
  async atualizar(
    @Param('chave') chave: string,
    @Body() dto: ParametroUpdateDto
  ): Promise<ParametroResponseDto> {
    return this.parametroService.atualizar(chave, dto);
  }

  /**
   * Remove um parâmetro do sistema
   * @param chave Chave do parâmetro
   */
  @Delete(':chave')
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.remover',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Remover parâmetro' })
  @ApiParam({ 
    name: 'chave', 
    description: 'Chave única do parâmetro',
    example: 'sistema.nome' 
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Parâmetro removido com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Parâmetro não encontrado'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Parâmetro não pode ser removido'
  })
  async remover(
    @Param('chave') chave: string
  ): Promise<void> {
    await this.parametroService.remover(chave);
  }

  /**
   * Limpa o cache de parâmetros
   */
  @Post('cache/limpar')
  @RequiresPermission(
    
    {
      permissionName: 'configuracao.parametro.cache.limpar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Limpar cache de parâmetros' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache limpo com sucesso'
  })
  async limparCache(): Promise<{ mensagem: string }> {
    this.parametroService.limparCache();
    return { mensagem: 'Cache de parâmetros limpo com sucesso' };
  }
}
