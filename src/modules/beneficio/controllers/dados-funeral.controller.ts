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
import { DadosFuneralService } from '../services/dados-funeral.service';
import { CreateDadosFuneralDto, UpdateDadosFuneralDto } from '../dto/create-dados-funeral.dto';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';

/**
 * Controlador para gerenciar dados específicos do Auxílio Funeral
 */
@ApiTags('Dados Funeral')
@Controller('dados-funeral')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosFuneralController {
  constructor(
    private readonly dadosFuneralService: DadosFuneralService,
  ) {}

  /**
   * Criar dados de funeral para uma solicitação
   */
  @Post()
  @ApiOperation({
    summary: 'Criar dados de funeral',
    description: 'Cria dados específicos para solicitação de Auxílio Funeral',
  })
  @ApiBody({ type: CreateDadosFuneralDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados de funeral criados com sucesso',
    type: DadosFuneral,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async create(@Body() createDto: CreateDadosFuneralDto): Promise<DadosFuneral> {
    return this.dadosFuneralService.create(createDto);
  }

  /**
   * Buscar dados de funeral por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar dados de funeral por ID',
    description: 'Retorna os dados de funeral específicos pelo ID',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de funeral' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de funeral encontrados',
    type: DadosFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de funeral não encontrados',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DadosFuneral> {
    return this.dadosFuneralService.findOne(id);
  }

  /**
   * Buscar dados de funeral por solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados de funeral por solicitação',
    description: 'Retorna os dados de funeral de uma solicitação específica',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de funeral encontrados',
    type: DadosFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de funeral não encontrados para esta solicitação',
  })
  async findBySolicitacao(@Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string): Promise<DadosFuneral> {
    return this.dadosFuneralService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Atualizar dados de funeral
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados de funeral',
    description: 'Atualiza dados específicos de uma solicitação de Auxílio Funeral',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de funeral' })
  @ApiBody({ type: UpdateDadosFuneralDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de funeral atualizados com sucesso',
    type: DadosFuneral,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de funeral não encontrados',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDadosFuneralDto,
  ): Promise<DadosFuneral> {
    return this.dadosFuneralService.update(id, updateDto);
  }

  /**
   * Remover dados de funeral
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover dados de funeral',
    description: 'Remove dados específicos de funeral (apenas administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de funeral' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados de funeral removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de funeral não encontrados',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dadosFuneralService.remove(id);
  }
}