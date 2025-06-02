import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TemplateService } from '../services/template.service';
import { TemplateCreateDto } from '../dtos/template/template-create.dto';
import { TemplateUpdateDto } from '../dtos/template/template-update.dto';
import { TemplateTestDto } from '../dtos/template/template-test.dto';
import { TemplateResponseDto } from '../dtos/template/template-response.dto';
import { TemplateTipoEnum } from '../../../enums/template-tipo.enum';

/**
 * Controlador responsável pelas operações de templates do sistema
 */
@ApiTags('Configuração')
@Controller('configuracao/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Busca todos os templates do sistema
   * @param tipo Tipo opcional para filtrar
   * @returns Lista de templates
   */
  @Get()
  @ApiOperation({ summary: 'Buscar todos os templates do sistema' })
  @ApiQuery({ 
    name: 'tipo', 
    required: false, 
    description: 'Filtrar por tipo de template',
    enum: TemplateTipoEnum
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de templates encontrados',
    type: [TemplateResponseDto]
  })
  async buscarTodos(
    @Query('tipo') tipo?: TemplateTipoEnum
  ): Promise<TemplateResponseDto[]> {
    return this.templateService.buscarTodos(tipo);
  }

  /**
   * Busca um template específico por seu código
   * @param codigo Código do template
   * @returns Template encontrado
   */
  @Get(':codigo')
  @ApiOperation({ summary: 'Buscar template por código' })
  @ApiParam({ 
    name: 'codigo', 
    description: 'Código único do template',
    example: 'email-bem-vindo' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Template encontrado',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template não encontrado'
  })
  async buscarPorCodigo(
    @Param('codigo') codigo: string
  ): Promise<TemplateResponseDto> {
    return this.templateService.buscarPorCodigo(codigo);
  }

  /**
   * Cria um novo template no sistema
   * @param dto Dados do template a ser criado
   * @returns Template criado
   */
  @Post()
  @ApiOperation({ summary: 'Criar novo template' })
  @ApiResponse({ 
    status: 201, 
    description: 'Template criado com sucesso',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou template já existe'
  })
  async criar(
    @Body() dto: TemplateCreateDto
  ): Promise<TemplateResponseDto> {
    return this.templateService.criar(dto);
  }

  /**
   * Atualiza um template existente
   * @param codigo Código do template
   * @param dto Dados para atualização
   * @returns Template atualizado
   */
  @Put(':codigo')
  @ApiOperation({ summary: 'Atualizar template existente' })
  @ApiParam({ 
    name: 'codigo', 
    description: 'Código único do template',
    example: 'email-bem-vindo' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Template atualizado com sucesso',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template não encontrado'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos'
  })
  async atualizar(
    @Param('codigo') codigo: string,
    @Body() dto: TemplateUpdateDto
  ): Promise<TemplateResponseDto> {
    return this.templateService.atualizar(codigo, dto);
  }

  /**
   * Remove um template do sistema
   * @param codigo Código do template
   */
  @Delete(':codigo')
  @ApiOperation({ summary: 'Remover template' })
  @ApiParam({ 
    name: 'codigo', 
    description: 'Código único do template',
    example: 'email-bem-vindo' 
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Template removido com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template não encontrado'
  })
  async remover(
    @Param('codigo') codigo: string
  ): Promise<void> {
    await this.templateService.remover(codigo);
  }

  /**
   * Testa a renderização de um template com dados de exemplo
   * @param dto Dados para teste do template
   * @returns Conteúdo renderizado
   */
  @Post('testar')
  @ApiOperation({ summary: 'Testar renderização de template' })
  @ApiResponse({ 
    status: 200, 
    description: 'Template renderizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        conteudo: {
          type: 'string',
          description: 'Conteúdo renderizado do template'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou erro na renderização'
  })
  async testar(
    @Body() dto: TemplateTestDto
  ): Promise<{ conteudo: string }> {
    return this.templateService.testar(dto);
  }

  /**
   * Ativa ou desativa um template
   * @param codigo Código do template
   * @param ativo Status de ativação
   * @returns Template atualizado
   */
  @Put(':codigo/status')
  @ApiOperation({ summary: 'Ativar ou desativar template' })
  @ApiParam({ 
    name: 'codigo', 
    description: 'Código único do template',
    example: 'email-bem-vindo' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status do template atualizado com sucesso',
    type: TemplateResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Template não encontrado'
  })
  async alterarStatus(
    @Param('codigo') codigo: string,
    @Body() { ativo }: { ativo: boolean }
  ): Promise<TemplateResponseDto> {
    return this.templateService.alterarStatus(codigo, ativo);
  }

  /**
   * Busca templates por tipo
   * @param tipo Tipo dos templates
   * @returns Lista de templates
   */
  @Get('tipo/:tipo')
  @ApiOperation({ summary: 'Buscar templates por tipo' })
  @ApiParam({ 
    name: 'tipo', 
    description: 'Tipo de template',
    enum: TemplateTipoEnum
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de templates encontrados',
    type: [TemplateResponseDto]
  })
  async buscarPorTipo(
    @Param('tipo') tipo: TemplateTipoEnum
  ): Promise<TemplateResponseDto[]> {
    return this.templateService.buscarPorTipo(tipo);
  }
}
