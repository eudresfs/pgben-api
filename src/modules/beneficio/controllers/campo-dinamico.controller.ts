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
import { CampoDinamicoService } from '../services/campo-dinamico.service';
import { CreateCampoDinamicoDto } from '../dto/create-campo-dinamico.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Controlador de campos dinâmicos de benefícios
 *
 * Responsável por gerenciar as rotas relacionadas a campos dinâmicos
 * específicos para cada tipo de benefício.
 */
@ApiTags('campos-dinamicos-beneficio')
@Controller('v1/beneficio/:tipoBeneficioId/campos-dinamicos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampoDinamicoController {
  constructor(private readonly campoDinamicoService: CampoDinamicoService) {}

  /**
   * Lista todos os campos dinâmicos de um tipo de benefício
   */
  @Get()
  @ApiOperation({ summary: 'Listar campos dinâmicos de um benefício' })
  @ApiResponse({
    status: 200,
    description: 'Lista de campos dinâmicos retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  async findAll(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.campoDinamicoService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Cria um novo campo dinâmico para um tipo de benefício
   */
  @Post()
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Criar novo campo dinâmico' })
  @ApiResponse({
    status: 201,
    description: 'Campo dinâmico criado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome já em uso' })
  async create(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
    @Body() createCampoDinamicoDto: CreateCampoDinamicoDto,
  ) {
    return this.campoDinamicoService.create(
      tipoBeneficioId,
      createCampoDinamicoDto,
    );
  }

  /**
   * Atualiza um campo dinâmico existente
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Atualizar campo dinâmico existente' })
  @ApiResponse({
    status: 200,
    description: 'Campo dinâmico atualizado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Campo dinâmico não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome já em uso' })
  async update(
    @Param('id') id: string,
    @Body() updateCampoDinamicoDto: Partial<CreateCampoDinamicoDto>,
  ) {
    return this.campoDinamicoService.update(id, updateCampoDinamicoDto);
  }

  /**
   * Remove um campo dinâmico
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Remover campo dinâmico' })
  @ApiResponse({
    status: 200,
    description: 'Campo dinâmico removido com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Campo dinâmico não encontrado' })
  async remove(@Param('id') id: string) {
    return this.campoDinamicoService.remove(id);
  }

  /**
   * Obtém o schema ativo de um tipo de benefício
   */
  @Get('schema')
  @ApiOperation({ summary: 'Obter schema ativo de um benefício' })
  @ApiResponse({ status: 200, description: 'Schema retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  async getSchemaAtivo(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.campoDinamicoService.getSchemaAtivo(tipoBeneficioId);
  }

  /**
   * Obtém o histórico de versões do schema de um tipo de benefício
   */
  @Get('schema/historico')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Obter histórico de versões do schema' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  async getHistoricoVersoes(@Param('tipoBeneficioId') tipoBeneficioId: string) {
    return this.campoDinamicoService.getHistoricoVersoes(tipoBeneficioId);
  }
}
