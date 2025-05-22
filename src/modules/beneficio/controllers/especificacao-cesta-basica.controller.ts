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
import { EspecificacaoCestaBasicaService } from '../services/especificacao-cesta-basica.service';
import { CreateEspecificacaoCestaBasicaDto } from '../dto/create-especificacao-cesta-basica.dto';
import { UpdateEspecificacaoCestaBasicaDto } from '../dto/update-especificacao-cesta-basica.dto';
import { EspecificacaoCestaBasica } from '../entities/especificacao-cesta-basica.entity';

/**
 * Controller para gerenciar as especificações da Cesta Básica
 */
@ApiTags('Benefícios')
@Controller('v1/beneficios/especificacoes/cesta-basica')
export class EspecificacaoCestaBasicaController {
  constructor(
    private readonly especificacaoCestaBasicaService: EspecificacaoCestaBasicaService,
  ) {}

  /**
   * Cria uma nova especificação de Cesta Básica
   * 
   * @param createDto DTO com os dados para criação
   * @returns A especificação criada
   */
  @Post()
  @ApiOperation({ summary: 'Criar uma nova especificação de Cesta Básica' })
  @ApiBody({ type: CreateEspecificacaoCestaBasicaDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Especificação criada com sucesso',
    type: EspecificacaoCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Já existe uma especificação para este tipo de benefício',
  })
  async create(@Body() createDto: CreateEspecificacaoCestaBasicaDto): Promise<EspecificacaoCestaBasica> {
    return this.especificacaoCestaBasicaService.create(createDto);
  }

  /**
   * Busca uma especificação pelo ID
   * 
   * @param id ID da especificação
   * @returns A especificação encontrada
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma especificação de Cesta Básica pelo ID' })
  @ApiParam({ name: 'id', description: 'ID da especificação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação encontrada',
    type: EspecificacaoCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<EspecificacaoCestaBasica> {
    return this.especificacaoCestaBasicaService.findOne(id);
  }

  /**
   * Busca uma especificação pelo ID do tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns A especificação encontrada
   */
  @Get('tipo-beneficio/:tipoBeneficioId')
  @ApiOperation({ summary: 'Buscar uma especificação de Cesta Básica pelo ID do tipo de benefício' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação encontrada',
    type: EspecificacaoCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especificação não encontrada',
  })
  async findByTipoBeneficio(@Param('tipoBeneficioId') tipoBeneficioId: string): Promise<EspecificacaoCestaBasica> {
    return this.especificacaoCestaBasicaService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Atualiza uma especificação existente
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param updateDto Dados para atualização
   * @returns A especificação atualizada
   */
  @Put(':tipoBeneficioId')
  @ApiOperation({ summary: 'Atualizar uma especificação de Cesta Básica' })
  @ApiParam({ name: 'tipoBeneficioId', description: 'ID do tipo de benefício' })
  @ApiBody({ type: UpdateEspecificacaoCestaBasicaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especificação atualizada com sucesso',
    type: EspecificacaoCestaBasica,
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
    @Body() updateDto: UpdateEspecificacaoCestaBasicaDto,
  ): Promise<EspecificacaoCestaBasica> {
    return this.especificacaoCestaBasicaService.update(tipoBeneficioId, updateDto);
  }

  /**
   * Remove uma especificação
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Mensagem de confirmação
   */
  @Delete(':tipoBeneficioId')
  @ApiOperation({ summary: 'Remover uma especificação de Cesta Básica' })
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
    return this.especificacaoCestaBasicaService.remove(tipoBeneficioId);
  }
}
