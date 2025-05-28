import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EspecificacaoAluguelSocialService } from '../services/especificacao-aluguel-social.service';
import { CreateEspecificacaoAluguelSocialDto } from '../dto/create-especificacao-aluguel-social.dto';
import { UpdateEspecificacaoAluguelSocialDto } from '../dto/update-especificacao-aluguel-social.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';
import { ROLES } from '../../../shared/constants/roles.constants';

/**
 * Controlador para gerenciamento de especificações do Aluguel Social
 * 
 * Fornece endpoints para acesso e manipulação das configurações específicas
 * do benefício de Aluguel Social.
 */
@ApiTags('Benefícios')
@Controller('v1/beneficio/tipos/:tipoBeneficioId/aluguel-social')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EspecificacaoAluguelSocialController {
  constructor(
    private readonly especificacaoService: EspecificacaoAluguelSocialService,
  ) {}

  /**
   * Obtém a especificação de aluguel social para um tipo de benefício
   */
  @Get()
  @ApiOperation({
    summary: 'Obter especificação de Aluguel Social',
    description: 'Retorna as configurações específicas do Aluguel Social para o tipo de benefício informado',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Aluguel Social encontrada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício ou especificação não encontrada',
  })
  async findOne(@Param('tipoBeneficioId', ParseUUIDPipe) tipoBeneficioId: string) {
    return this.especificacaoService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Cria uma nova especificação de aluguel social
   */
  @Post()
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Criar especificação de Aluguel Social',
    description: 'Cria uma nova configuração específica para o benefício de Aluguel Social',
  })
  @ApiResponse({
    status: 201,
    description: 'Especificação de Aluguel Social criada com sucesso',
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
    @Param('tipoBeneficioId', ParseUUIDPipe) tipoBeneficioId: string,
    @Body() createDto: CreateEspecificacaoAluguelSocialDto,
  ) {
    // Garantir que o tipoBeneficioId do path seja o mesmo do dto
    createDto.tipo_beneficio_id = tipoBeneficioId;
    return this.especificacaoService.create(createDto);
  }

  /**
   * Atualiza uma especificação de aluguel social existente
   */
  @Put()
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Atualizar especificação de Aluguel Social',
    description: 'Atualiza as configurações específicas existentes do Aluguel Social',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Aluguel Social atualizada com sucesso',
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
    @Param('tipoBeneficioId', ParseUUIDPipe) tipoBeneficioId: string,
    @Body() updateDto: UpdateEspecificacaoAluguelSocialDto,
  ) {
    return this.especificacaoService.update(tipoBeneficioId, updateDto);
  }

  /**
   * Remove uma especificação de aluguel social
   */
  @Delete()
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Remover especificação de Aluguel Social',
    description: 'Remove as configurações específicas do Aluguel Social',
  })
  @ApiResponse({
    status: 200,
    description: 'Especificação de Aluguel Social removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício ou especificação não encontrada',
  })
  async remove(@Param('tipoBeneficioId', ParseUUIDPipe) tipoBeneficioId: string) {
    return this.especificacaoService.remove(tipoBeneficioId);
  }
}
