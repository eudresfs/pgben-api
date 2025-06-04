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
import { DadosCestaBasicaService } from '../services/dados-cesta-basica.service';
import {
  CreateDadosCestaBasicaDto,
  UpdateDadosCestaBasicaDto,
} from '../dto/create-dados-cesta-basica.dto';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';

/**
 * Controlador para gerenciar dados específicos da Cesta Básica
 */
@ApiTags('Benefícios')
@Controller('dados-cesta-basica')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosCestaBasicaController {
  constructor(
    private readonly dadosCestaBasicaService: DadosCestaBasicaService,
  ) {}

  /**
   * Criar dados de cesta básica para uma solicitação
   */
  @Post()
  @ApiOperation({
    summary: 'Criar dados de cesta básica',
    description: 'Cria dados específicos para solicitação de Cesta Básica',
  })
  @ApiBody({ type: CreateDadosCestaBasicaDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados de cesta básica criados com sucesso',
    type: DadosCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async create(
    @Body() createDto: CreateDadosCestaBasicaDto,
  ): Promise<DadosCestaBasica> {
    return this.dadosCestaBasicaService.create(createDto);
  }

  /**
   * Buscar dados de cesta básica por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar dados de cesta básica por ID',
    description: 'Retorna os dados de cesta básica específicos pelo ID',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de cesta básica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de cesta básica encontrados',
    type: DadosCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de cesta básica não encontrados',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DadosCestaBasica> {
    return this.dadosCestaBasicaService.findOne(id);
  }

  /**
   * Buscar dados de cesta básica por solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados de cesta básica por solicitação',
    description:
      'Retorna os dados de cesta básica de uma solicitação específica',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de cesta básica encontrados',
    type: DadosCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de cesta básica não encontrados para esta solicitação',
  })
  async findBySolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
  ): Promise<DadosCestaBasica> {
    return this.dadosCestaBasicaService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Atualizar dados de cesta básica
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados de cesta básica',
    description:
      'Atualiza dados específicos de uma solicitação de Cesta Básica',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de cesta básica' })
  @ApiBody({ type: UpdateDadosCestaBasicaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de cesta básica atualizados com sucesso',
    type: DadosCestaBasica,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de cesta básica não encontrados',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDadosCestaBasicaDto,
  ): Promise<DadosCestaBasica> {
    return this.dadosCestaBasicaService.update(id, updateDto);
  }

  /**
   * Remover dados de cesta básica
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover dados de cesta básica',
    description:
      'Remove dados específicos de cesta básica (apenas administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de cesta básica' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados de cesta básica removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de cesta básica não encontrados',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dadosCestaBasicaService.remove(id);
  }
}
