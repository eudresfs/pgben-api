import { Controller, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowUpdateDto } from '../dtos/workflow/workflow-update.dto';
import { WorkflowResponseDto } from '../dtos/workflow/workflow-response.dto';

/**
 * Controlador responsável pelas operações de workflows de benefícios
 */
@ApiTags('Configuração')
@Controller('configuracao/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * Busca todos os workflows de benefícios
   * @returns Lista de workflows
   */
  @Get()
  @ApiOperation({ summary: 'Buscar todos os workflows de benefícios' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de workflows encontrados',
    type: [WorkflowResponseDto]
  })
  async buscarTodos(): Promise<WorkflowResponseDto[]> {
    return this.workflowService.buscarTodos();
  }

  /**
   * Busca um workflow específico por tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Workflow encontrado
   */
  @Get(':tipoBeneficioId')
  @ApiOperation({ summary: 'Buscar workflow por tipo de benefício' })
  @ApiParam({ 
    name: 'tipoBeneficioId', 
    description: 'ID do tipo de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow encontrado',
    type: WorkflowResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Workflow não encontrado'
  })
  async buscarPorTipoBeneficio(
    @Param('tipoBeneficioId') tipoBeneficioId: string
  ): Promise<WorkflowResponseDto> {
    return this.workflowService.buscarPorTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Cria ou atualiza um workflow para um tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @param dto Dados para atualização
   * @returns Workflow atualizado
   */
  @Put(':tipoBeneficioId')
  @ApiOperation({ summary: 'Criar ou atualizar workflow para tipo de benefício' })
  @ApiParam({ 
    name: 'tipoBeneficioId', 
    description: 'ID do tipo de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow criado/atualizado com sucesso',
    type: WorkflowResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou workflow inconsistente'
  })
  async atualizarOuCriar(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() dto: WorkflowUpdateDto
  ): Promise<WorkflowResponseDto> {
    return this.workflowService.atualizarOuCriar(tipoBeneficioId, dto);
  }

  /**
   * Remove um workflow
   * @param tipoBeneficioId ID do tipo de benefício
   */
  @Delete(':tipoBeneficioId')
  @ApiOperation({ summary: 'Remover workflow' })
  @ApiParam({ 
    name: 'tipoBeneficioId', 
    description: 'ID do tipo de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Workflow removido com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Workflow não encontrado'
  })
  async remover(
    @Param('tipoBeneficioId') tipoBeneficioId: string
  ): Promise<void> {
    await this.workflowService.remover(tipoBeneficioId);
  }

  /**
   * Ativa ou desativa um workflow
   * @param tipoBeneficioId ID do tipo de benefício
   * @param ativo Status de ativação
   * @returns Workflow atualizado
   */
  @Put(':tipoBeneficioId/status')
  @ApiOperation({ summary: 'Ativar ou desativar workflow' })
  @ApiParam({ 
    name: 'tipoBeneficioId', 
    description: 'ID do tipo de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status do workflow atualizado com sucesso',
    type: WorkflowResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Workflow não encontrado'
  })
  async alterarStatus(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() { ativo }: { ativo: boolean }
  ): Promise<WorkflowResponseDto> {
    return this.workflowService.alterarStatus(tipoBeneficioId, ativo);
  }
}
