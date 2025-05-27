import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ProcessoJudicialService } from '../services/processo-judicial.service';
import { ProcessoJudicial } from '../entities/processo-judicial.entity';
import {
  CreateProcessoJudicialDto,
  UpdateProcessoJudicialDto,
  UpdateStatusProcessoJudicialDto,
  FindProcessoJudicialFilterDto
} from '../dtos/processo-judicial.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

/**
 * Controller para gerenciamento de processos judiciais
 * 
 * Fornece endpoints para operações CRUD e consultas específicas para processos judiciais.
 */
@ApiTags('processos-judiciais')
@Controller('processos-judiciais')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessoJudicialController {
  constructor(private readonly processoJudicialService: ProcessoJudicialService) {}

  /**
   * Cria um novo processo judicial
   */
  @Post()
  @ApiOperation({ summary: 'Cria um novo processo judicial' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Processo judicial criado com sucesso', type: ProcessoJudicial })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async create(
    @Body() createProcessoJudicialDto: CreateProcessoJudicialDto,
    @Request() req
  ): Promise<ProcessoJudicial> {
    return this.processoJudicialService.create(createProcessoJudicialDto, req.user.id);
  }

  /**
   * Busca todos os processos judiciais com paginação e filtros
   */
  @Get()
  @ApiOperation({ summary: 'Lista processos judiciais com paginação e filtros' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de processos judiciais' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async findAll(@Query() query: FindProcessoJudicialFilterDto): Promise<PaginatedResult<ProcessoJudicial>> {
    return this.processoJudicialService.findAll({
      page: query.page,
      limit: query.limit,
      cidadaoId: query.cidadaoId,
      status: query.status,
      comarca: query.comarca,
      vara: query.vara,
      termo: query.termo
    });
  }

  /**
   * Busca um processo judicial pelo ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Busca um processo judicial pelo ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processo judicial encontrado', type: ProcessoJudicial })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Processo judicial não encontrado' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async findOne(@Param('id') id: string): Promise<ProcessoJudicial> {
    return this.processoJudicialService.findById(id);
  }

  /**
   * Busca processos judiciais por cidadão
   */
  @Get('cidadao/:cidadaoId')
  @ApiOperation({ summary: 'Busca processos judiciais por cidadão' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de processos judiciais do cidadão' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async findByCidadao(@Param('cidadaoId') cidadaoId: string): Promise<ProcessoJudicial[]> {
    return this.processoJudicialService.findByCidadao(cidadaoId);
  }

  /**
   * Atualiza um processo judicial
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um processo judicial' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processo judicial atualizado', type: ProcessoJudicial })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Processo judicial não encontrado' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async update(
    @Param('id') id: string,
    @Body() updateProcessoJudicialDto: UpdateProcessoJudicialDto,
    @Request() req
  ): Promise<ProcessoJudicial> {
    return this.processoJudicialService.update(id, updateProcessoJudicialDto, req.user.id);
  }

  /**
   * Atualiza o status de um processo judicial
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um processo judicial' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status atualizado com sucesso', type: ProcessoJudicial })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Processo judicial não encontrado' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Status inválido' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusProcessoJudicialDto,
    @Request() req
  ): Promise<ProcessoJudicial> {
    return this.processoJudicialService.updateStatus(id, updateStatusDto.status, req.user.id);
  }

  /**
   * Desativa um processo judicial (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa um processo judicial (soft delete)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Processo judicial desativado com sucesso' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Processo judicial não encontrado' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    await this.processoJudicialService.desativar(id, req.user.id);
  }
}
