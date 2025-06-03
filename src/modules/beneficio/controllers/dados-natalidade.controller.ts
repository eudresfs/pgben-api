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
import { DadosNatalidadeService } from '../services/dados-natalidade.service';
import { CreateDadosNatalidadeDto, UpdateDadosNatalidadeDto } from '../dto/create-dados-natalidade.dto';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';

/**
 * Controlador para gerenciar dados específicos do Benefício Natalidade
 */
@ApiTags('Benefícios')
@Controller('dados-natalidade')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosNatalidadeController {
  constructor(
    private readonly dadosNatalidadeService: DadosNatalidadeService,
  ) {}

  /**
   * Criar dados de natalidade para uma solicitação
   */
  @Post()
  @ApiOperation({
    summary: 'Criar dados de natalidade',
    description: 'Cria dados específicos para solicitação de Auxílio Natalidade',
  })
  @ApiBody({ type: CreateDadosNatalidadeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados de natalidade criados com sucesso',
    type: DadosNatalidade,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async create(@Body() createDto: CreateDadosNatalidadeDto): Promise<DadosNatalidade> {
    return this.dadosNatalidadeService.create(createDto);
  }

  /**
   * Buscar dados de natalidade por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar dados de natalidade por ID',
    description: 'Retorna os dados de natalidade específicos pelo ID',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de natalidade' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de natalidade encontrados',
    type: DadosNatalidade,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de natalidade não encontrados',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DadosNatalidade> {
    return this.dadosNatalidadeService.findOne(id);
  }

  /**
   * Buscar dados de natalidade por solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados de natalidade por solicitação',
    description: 'Retorna os dados de natalidade de uma solicitação específica',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de natalidade encontrados',
    type: DadosNatalidade,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de natalidade não encontrados para esta solicitação',
  })
  async findBySolicitacao(@Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string): Promise<DadosNatalidade> {
    return this.dadosNatalidadeService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Atualizar dados de natalidade
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados de natalidade',
    description: 'Atualiza dados específicos de uma solicitação de Auxílio Natalidade',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de natalidade' })
  @ApiBody({ type: UpdateDadosNatalidadeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de natalidade atualizados com sucesso',
    type: DadosNatalidade,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de natalidade não encontrados',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDadosNatalidadeDto,
  ): Promise<DadosNatalidade> {
    return this.dadosNatalidadeService.update(id, updateDto);
  }

  /**
   * Remover dados de natalidade
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover dados de natalidade',
    description: 'Remove dados específicos de natalidade (apenas administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de natalidade' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados de natalidade removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de natalidade não encontrados',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dadosNatalidadeService.remove(id);
  }
}