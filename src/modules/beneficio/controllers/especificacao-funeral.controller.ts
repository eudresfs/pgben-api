import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EspecificacaoFuneralService } from '../services/especificacao-funeral.service';
import { CreateEspecificacaoFuneralDto } from '../dto/create-especificacao-funeral.dto';
import { UpdateEspecificacaoFuneralDto } from '../dto/update-especificacao-funeral.dto';
import { EspecificacaoFuneral } from '../entities/especificacao-funeral.entity';

/**
 * Controller para gerenciar as especificações do Auxílio Funeral
 */
@ApiTags('Benefícios')
@Controller('v1/beneficios/especificacoes/funeral')
export class EspecificacaoFuneralController {
  constructor(
    private readonly especificacaoFuneralService: EspecificacaoFuneralService,
  ) {}

  /**
   * Cria uma nova especificação de Auxílio Funeral
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  @Post()
  @ApiOperation({ summary: 'Criar uma nova especificação de Auxílio Funeral' })
  @ApiBody({ type: CreateEspecificacaoFuneralDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Especificação criada com sucesso',
    type: EspecificacaoFuneral,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Já existe uma especificação para este tipo de benefício',
  })
  async create(@Body() createDto: CreateEspecificacaoFuneralDto): Promise<EspecificacaoFuneral> {
    return this.especificacaoFuneralService.create(createDto);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma especificação de Auxílio Funeral pelo ID' })
  @ApiParam({ name: 'id', description: 'ID da especificação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação encontrada',
    type: EspecificacaoFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<EspecificacaoFuneral> {
    return this.especificacaoFuneralService.findOne(id);
  }

  /**
   * Busca uma especificação pelo ID do tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns A especificação encontrada
   */
  @Get('tipo-beneficio/:tipoBeneficioId')
  @ApiOperation({ summary: 'Buscar uma especificação de Auxílio Funeral pelo ID do tipo de benefício' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação encontrada',
    type: EspecificacaoFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  async findByTipoBeneficio(@Param('tipoBeneficioId') tipoBeneficioId: string): Promise<EspecificacaoFuneral> {
    return this.especificacaoFuneralService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Atualiza uma especificação existente
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param updateDto Dados para atualização
   * @returns A especificação atualizada
   */
  @Put(':tipoBeneficioId')
  @ApiOperation({ summary: 'Atualizar uma especificação de Auxílio Funeral' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiBody({ type: UpdateEspecificacaoFuneralDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação atualizada com sucesso',
    type: EspecificacaoFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  async update(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() updateDto: UpdateEspecificacaoFuneralDto,
  ): Promise<EspecificacaoFuneral> {
    return this.especificacaoFuneralService.update(tipoBeneficioId, updateDto);
  }

  /**
   * Remove uma especificação
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Mensagem de confirmação
   */
  @Delete(':tipoBeneficioId')
  @ApiOperation({ summary: 'Remover uma especificação de Auxílio Funeral' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação removida com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  async remove(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.especificacaoFuneralService.remove(tipoBeneficioId);
  }
}
