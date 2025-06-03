import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { UserRole } from '../../../enums';
import { DadosBeneficioFactoryService } from '../services/dados-beneficio-factory.service';
import {
  TipoDadosBeneficio,
  IDadosBeneficio,
  ICreateDadosBeneficioDto,
  IUpdateDadosBeneficioDto
} from '../interfaces/dados-beneficio.interface';

/**
 * Controlador centralizado para gerenciar dados de todos os tipos de benefícios
 * 
 * Este controlador unifica o acesso a dados específicos de benefícios,
 * eliminando a necessidade de múltiplos controladores separados.
 */
@ApiTags('Benefícios')
@Controller('dados-beneficio')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosBeneficioController {
  constructor(
    private readonly dadosBeneficioFactoryService: DadosBeneficioFactoryService,
  ) {}

  /**
   * Listar tipos de benefícios suportados
   */
  @Get('tipos')
  @ApiOperation({
    summary: 'Listar tipos de benefícios suportados',
    description: 'Retorna todos os tipos de benefícios que possuem dados específicos',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tipos de benefícios suportados',
    schema: {
      type: 'object',
      properties: {
        tipos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              codigo: { type: 'string', example: 'aluguel-social' },
              nome: { type: 'string', example: 'Aluguel Social' },
              descricao: { type: 'string', example: 'Dados específicos para solicitação de Aluguel Social' }
            }
          }
        }
      }
    }
  })
  async getTiposSuportados() {
    const tipos = this.dadosBeneficioFactoryService.getSupportedTypes();
    return {
      tipos: tipos.map(tipo => ({
        codigo: tipo,
        ...this.dadosBeneficioFactoryService.getTypeMetadata(tipo)
      }))
    };
  }

  /**
   * Criar dados específicos para um tipo de benefício
   */
  @Post(':tipo')
  @ApiOperation({
    summary: 'Criar dados específicos de benefício',
    description: 'Cria dados específicos para uma solicitação de benefício baseado no tipo',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiBody({
    description: 'Dados específicos do benefício (estrutura varia conforme o tipo)',
    schema: {
      type: 'object',
      properties: {
        solicitacao_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID da solicitação'
        }
      },
      required: ['solicitacao_id'],
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados específicos criados com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        solicitacao_id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Tipo de benefício inválido ou dados inválidos',
  })
  async create(
    @Param('tipo') tipo: string,
    @Body() createDto: ICreateDadosBeneficioDto
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.create(tipo, createDto);
  }

  /**
   * Buscar dados específicos por ID
   */
  @Get(':tipo/:id')
  @ApiOperation({
    summary: 'Buscar dados específicos por ID',
    description: 'Retorna os dados específicos de um benefício pelo ID',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiParam({ name: 'id', description: 'ID dos dados específicos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados específicos encontrados',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        solicitacao_id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados',
  })
  async findOne(
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.findOne(tipo, id);
  }

  /**
   * Buscar dados específicos por solicitação
   */
  @Get(':tipo/solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados específicos por solicitação',
    description: 'Retorna os dados específicos de uma solicitação de benefício',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados específicos encontrados',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        solicitacao_id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados para esta solicitação',
  })
  async findBySolicitacao(
    @Param('tipo') tipo: string,
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.findBySolicitacao(tipo, solicitacaoId);
  }

  /**
   * Atualizar dados específicos
   */
  @Patch(':tipo/:id')
  @ApiOperation({
    summary: 'Atualizar dados específicos',
    description: 'Atualiza dados específicos de um benefício',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiParam({ name: 'id', description: 'ID dos dados específicos' })
  @ApiBody({
    description: 'Dados para atualização (estrutura varia conforme o tipo)',
    schema: {
      type: 'object',
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados específicos atualizados com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        solicitacao_id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados',
  })
  async update(
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: IUpdateDadosBeneficioDto
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.update(tipo, id, updateDto);
  }

  /**
   * Remover dados específicos
   */
  @Delete(':tipo/:id')
  @ApiOperation({
    summary: 'Remover dados específicos',
    description: 'Remove dados específicos de um benefício',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiParam({ name: 'id', description: 'ID dos dados específicos' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados específicos removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados',
  })
  async remove(
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.dadosBeneficioFactoryService.remove(tipo, id);
  }

  /**
   * Verificar se existem dados para uma solicitação
   */
  @Get(':tipo/solicitacao/:solicitacaoId/exists')
  @ApiOperation({
    summary: 'Verificar existência de dados por solicitação',
    description: 'Verifica se existem dados específicos para uma solicitação',
  })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo do benefício',
    enum: TipoDadosBeneficio,
    example: TipoDadosBeneficio.ALUGUEL_SOCIAL
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da verificação',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        tipo: { type: 'string' },
        solicitacao_id: { type: 'string', format: 'uuid' }
      }
    }
  })
  async checkExists(
    @Param('tipo') tipo: string,
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string
  ) {
    const exists = await this.dadosBeneficioFactoryService.existsBySolicitacao(tipo, solicitacaoId);
    return {
      exists,
      tipo,
      solicitacao_id: solicitacaoId
    };
  }
}