import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EspecificacaoNatalidadeService } from '../services/especificacao-natalidade.service';
import { CreateEspecificacaoNatalidadeDto } from '../dto/create-especificacao-natalidade.dto';
import { UpdateEspecificacaoNatalidadeDto } from '../dto/update-especificacao-natalidade.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';
import { ROLES } from '../../../shared/constants/roles.constants';

/**
 * Controlador para gerenciamento de especificações do Auxílio Natalidade
 * 
 * Fornece endpoints para acesso e manipulação das configurações específicas
 * do benefício de Auxílio Natalidade.
 */
@ApiTags('Benefícios - Auxílio Natalidade')
@Controller('v1/beneficio/tipos/:tipoBeneficioId/natalidade')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EspecificacaoNatalidadeController {
  constructor(
    private readonly especificacaoService: EspecificacaoNatalidadeService,
  ) {}

  /**
   * Obtém a especificação de natalidade para um tipo de benefício
   */
  @Get()
  @ApiOperation({
    summary: 'Obter especificação de Auxílio Natalidade',
    description: 'Retorna as configurações específicas do Auxílio Natalidade para o tipo de benefício informado',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Auxílio Natalidade encontrada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício ou especificação não encontrada',
  })
  async findOne(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.especificacaoService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Cria uma nova especificação de natalidade
   */
  @Post()
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Criar especificação de Auxílio Natalidade',
    description: 'Cria uma nova configuração específica para o benefício de Auxílio Natalidade',
  })
  @ApiResponse({
    status: 201,
    description: 'Especificação de Auxílio Natalidade criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe uma especificação para este tipo de benefício',
  })
  async create(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() createDto: CreateEspecificacaoNatalidadeDto,
  ) {
    // Garantir que o tipoBeneficioId do path seja o mesmo do dto
    createDto.tipo_beneficio_id = tipoBeneficioId;
    return this.especificacaoService.create(createDto);
  }

  /**
   * Atualiza uma especificação de natalidade existente
   */
  @Put()
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Atualizar especificação de Auxílio Natalidade',
    description: 'Atualiza as configurações específicas existentes do Auxílio Natalidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Auxílio Natalidade atualizada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício ou especificação não encontrada',
  })
  async update(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() updateDto: UpdateEspecificacaoNatalidadeDto,
  ) {
    return this.especificacaoService.update(tipoBeneficioId, updateDto);
  }

  /**
   * Remove uma especificação de natalidade
   */
  @Delete()
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Remover especificação de Auxílio Natalidade',
    description: 'Remove as configurações específicas do Auxílio Natalidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Auxílio Natalidade removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício ou especificação não encontrada',
  })
  async remove(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.especificacaoService.remove(tipoBeneficioId);
  }
}
