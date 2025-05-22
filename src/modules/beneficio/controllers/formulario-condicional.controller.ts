import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FormularioCondicionalService, FormularioProcessado } from '../services/formulario-condicional.service';

/**
 * Controller responsável por gerenciar as operações relacionadas aos formulários condicionais
 * de benefícios, aplicando regras específicas para cada tipo de benefício.
 */
@ApiTags('Benefícios')
@Controller('v1/beneficios/formularios')
export class FormularioCondicionalController {
  constructor(
    private readonly formularioCondicionalService: FormularioCondicionalService,
  ) {}

  /**
   * Obtém o formulário completo para um tipo de benefício específico,
   * com todas as regras condicionais aplicadas.
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param preview Se verdadeiro, retorna apenas a estrutura do formulário sem validações
   * @returns Formulário processado com todos os campos e regras
   */
  @Get(':tipoBeneficioId')
  @ApiOperation({ summary: 'Obter formulário condicional para um tipo de benefício' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiQuery({ 
    name: 'preview', 
    required: false, 
    description: 'Se verdadeiro, retorna apenas a estrutura do formulário sem validações',
    type: Boolean 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Formulário condicional obtido com sucesso',
    type: Object
  })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  async obterFormulario(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Query('preview') preview?: boolean,
  ): Promise<FormularioProcessado> {
    return this.formularioCondicionalService.gerarFormulario(tipoBeneficioId);
  }

  /**
   * Lista todos os tipos de benefícios disponíveis com seus respectivos
   * formulários condicionais.
   * 
   * @returns Lista de tipos de benefícios com seus formulários
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos os formulários condicionais disponíveis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de formulários condicionais obtida com sucesso',
    type: [Object]
  })
  async listarFormularios(): Promise<{ id: string; nome: string; descricao: string }[]> {
    // Este método seria implementado para listar todos os tipos de benefícios
    // com seus respectivos formulários, mas por simplicidade, vamos apenas
    // retornar uma lista vazia por enquanto.
    return [];
  }
}
