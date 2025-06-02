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
import { DadosAluguelSocialService } from '../services/dados-aluguel-social.service';
import { CreateDadosAluguelSocialDto, UpdateDadosAluguelSocialDto } from '../dto/create-dados-aluguel-social.dto';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';

/**
 * Controlador para gerenciar dados específicos do Aluguel Social
 */
@ApiTags('Dados Aluguel Social')
@Controller('dados-aluguel-social')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosAluguelSocialController {
  constructor(
    private readonly dadosAluguelSocialService: DadosAluguelSocialService,
  ) {}

  /**
   * Criar dados de aluguel social para uma solicitação
   */
  @Post()
  @ApiOperation({
    summary: 'Criar dados de aluguel social',
    description: 'Cria dados específicos para solicitação de Aluguel Social',
  })
  @ApiBody({ type: CreateDadosAluguelSocialDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados de aluguel social criados com sucesso',
    type: DadosAluguelSocial,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async create(@Body() createDto: CreateDadosAluguelSocialDto): Promise<DadosAluguelSocial> {
    return this.dadosAluguelSocialService.create(createDto);
  }

  /**
   * Buscar dados de aluguel social por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar dados de aluguel social por ID',
    description: 'Retorna os dados de aluguel social específicos pelo ID',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de aluguel social' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de aluguel social encontrados',
    type: DadosAluguelSocial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de aluguel social não encontrados',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DadosAluguelSocial> {
    return this.dadosAluguelSocialService.findOne(id);
  }

  /**
   * Buscar dados de aluguel social por solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados de aluguel social por solicitação',
    description: 'Retorna os dados de aluguel social de uma solicitação específica',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de aluguel social encontrados',
    type: DadosAluguelSocial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de aluguel social não encontrados para esta solicitação',
  })
  async findBySolicitacao(@Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string): Promise<DadosAluguelSocial> {
    return this.dadosAluguelSocialService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Atualizar dados de aluguel social
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados de aluguel social',
    description: 'Atualiza dados específicos de uma solicitação de Aluguel Social',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de aluguel social' })
  @ApiBody({ type: UpdateDadosAluguelSocialDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de aluguel social atualizados com sucesso',
    type: DadosAluguelSocial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de aluguel social não encontrados',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDadosAluguelSocialDto,
  ): Promise<DadosAluguelSocial> {
    return this.dadosAluguelSocialService.update(id, updateDto);
  }

  /**
   * Remover dados de aluguel social
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover dados de aluguel social',
    description: 'Remove dados específicos de aluguel social (apenas administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID dos dados de aluguel social' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados de aluguel social removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados de aluguel social não encontrados',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dadosAluguelSocialService.remove(id);
  }
}