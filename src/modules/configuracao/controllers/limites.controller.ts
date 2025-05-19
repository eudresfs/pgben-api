import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LimitesService } from '../services/limites.service';
import { LimitesUploadDto } from '../dtos/limites/limites-upload.dto';
import { PrazoUpdateDto } from '../dtos/limites/prazo-update.dto';
import { LimitesUploadResponseDto } from '../dtos/limites/limites-upload-response.dto';

/**
 * Controlador responsável pelas operações de limites operacionais do sistema
 */
@ApiTags('Configuração - Limites')
@ApiBearerAuth()
@Controller('configuracao/limites')
export class LimitesController {
  constructor(private readonly limitesService: LimitesService) {}

  /**
   * Busca os limites de upload configurados
   * @returns DTO com os limites de upload
   */
  @Get('upload')
  @ApiOperation({ summary: 'Buscar limites de upload configurados' })
  @ApiResponse({ 
    status: 200, 
    description: 'Limites de upload encontrados',
    type: LimitesUploadResponseDto
  })
  async buscarLimitesUpload(): Promise<LimitesUploadResponseDto> {
    return this.limitesService.buscarLimitesUpload();
  }

  /**
   * Atualiza os limites de upload
   * @param dto DTO com os novos limites
   * @returns DTO com os limites atualizados
   */
  @Put('upload')
  @ApiOperation({ summary: 'Atualizar limites de upload' })
  @ApiResponse({ 
    status: 200, 
    description: 'Limites de upload atualizados com sucesso',
    type: LimitesUploadResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos'
  })
  async atualizarLimitesUpload(
    @Body() dto: LimitesUploadDto
  ): Promise<LimitesUploadResponseDto> {
    return this.limitesService.atualizarLimitesUpload(dto);
  }

  /**
   * Busca o prazo configurado para uma etapa específica
   * @param tipo Tipo do prazo
   * @returns Prazo em dias
   */
  @Get('prazos/:tipo')
  @ApiOperation({ summary: 'Buscar prazo configurado para uma etapa' })
  @ApiParam({ 
    name: 'tipo', 
    description: 'Tipo do prazo (analise, entrevista, recurso, validade)',
    example: 'analise' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prazo encontrado',
    schema: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          description: 'Tipo do prazo',
          example: 'analise'
        },
        dias: {
          type: 'number',
          description: 'Prazo em dias',
          example: 15
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Tipo de prazo inválido'
  })
  async buscarPrazo(
    @Param('tipo') tipo: string
  ): Promise<{ tipo: string; dias: number }> {
    const dias = await this.limitesService.buscarPrazo(tipo);
    return { tipo, dias };
  }

  /**
   * Atualiza o prazo para uma etapa específica
   * @param tipo Tipo do prazo
   * @param dto DTO com o novo prazo
   * @returns Prazo atualizado
   */
  @Put('prazos/:tipo')
  @ApiOperation({ summary: 'Atualizar prazo para uma etapa' })
  @ApiParam({ 
    name: 'tipo', 
    description: 'Tipo do prazo (analise, entrevista, recurso, validade)',
    example: 'analise' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prazo atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          description: 'Tipo do prazo',
          example: 'analise'
        },
        dias: {
          type: 'number',
          description: 'Prazo em dias',
          example: 15
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou tipo de prazo inválido'
  })
  async atualizarPrazo(
    @Param('tipo') tipo: string,
    @Body() dto: PrazoUpdateDto
  ): Promise<{ tipo: string; dias: number }> {
    const dias = await this.limitesService.atualizarPrazo(tipo, dto);
    return { tipo, dias };
  }

  /**
   * Calcula a data limite para uma etapa com base no prazo configurado
   * @param tipo Tipo do prazo
   * @returns Data limite
   */
  @Get('prazos/:tipo/data-limite')
  @ApiOperation({ summary: 'Calcular data limite com base no prazo configurado' })
  @ApiParam({ 
    name: 'tipo', 
    description: 'Tipo do prazo (analise, entrevista, recurso, validade)',
    example: 'analise' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data limite calculada',
    schema: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          description: 'Tipo do prazo',
          example: 'analise'
        },
        dias: {
          type: 'number',
          description: 'Prazo em dias',
          example: 15
        },
        dataLimite: {
          type: 'string',
          description: 'Data limite calculada',
          example: '2025-06-02T20:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Tipo de prazo inválido'
  })
  async calcularDataLimite(
    @Param('tipo') tipo: string
  ): Promise<{ tipo: string; dias: number; dataLimite: Date }> {
    const dias = await this.limitesService.buscarPrazo(tipo);
    const dataLimite = await this.limitesService.calcularDataLimite(tipo);
    return { tipo, dias, dataLimite };
  }
}
