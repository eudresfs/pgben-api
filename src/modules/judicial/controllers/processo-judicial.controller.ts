import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ProcessoJudicialService } from '../services/processo-judicial.service';
import { ProcessoJudicial } from '../../../entities/processo-judicial.entity';
import {
  CreateProcessoJudicialDto,
  UpdateProcessoJudicialDto,
  UpdateStatusProcessoJudicialDto,
  FindProcessoJudicialFilterDto,
} from '../dtos/processo-judicial.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../../shared/request-context/request-context.dto';

/**
 * Controller para gerenciamento de processos judiciais
 *
 * Fornece endpoints para operações CRUD e consultas específicas para processos judiciais.
 */
@ApiTags('Solicitação')
@Controller('judicial/processos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessoJudicialController {
  constructor(
    private readonly processoJudicialService: ProcessoJudicialService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Cria um novo processo judicial
   */
  @Post()
  @ApiOperation({ summary: 'Cria um novo processo judicial' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Processo judicial criado com sucesso',
    type: ProcessoJudicial,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async create(
    @Body() createProcessoJudicialDto: CreateProcessoJudicialDto,
    @Request() req,
    @ReqContext() context: RequestContext,
  ): Promise<ProcessoJudicial> {
    const resultado = await this.processoJudicialService.create(
      createProcessoJudicialDto,
      req.user.id,
    );

    // Auditoria da criação de processo judicial
    await this.auditEventEmitter.emitEntityCreated(
      'ProcessoJudicial',
      resultado.id,
      resultado,
      req.user.id?.toString(),
      {
        synchronous: false,

    });

    return resultado;
  }

  /**
   * Busca todos os processos judiciais com paginação e filtros
   */
  @Get()
  @ApiOperation({
    summary: 'Lista processos judiciais com paginação e filtros',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de processos judiciais',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async findAll(
    @Query() query: FindProcessoJudicialFilterDto,
  ): Promise<PaginatedResult<ProcessoJudicial>> {
    return this.processoJudicialService.findAll({
      page: query.page,
      limit: query.limit,
      cidadaoId: query.cidadaoId,
      status: query.status,
      comarca: query.comarca,
      vara: query.vara,
      termo: query.termo,
    });
  }

  /**
   * Busca um processo judicial pelo ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Busca um processo judicial pelo ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processo judicial encontrado',
    type: ProcessoJudicial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Processo judicial não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProcessoJudicial> {
    return this.processoJudicialService.findById(id);
  }

  /**
   * Busca processos judiciais por cidadão
   */
  @Get('cidadao/:cidadaoId')
  @ApiOperation({ summary: 'Busca processos judiciais por cidadão' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de processos judiciais do cidadão',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async findByCidadao(
    @Param('cidadaoId') cidadaoId: string,
  ): Promise<ProcessoJudicial[]> {
    return this.processoJudicialService.findByCidadao(cidadaoId);
  }

  /**
   * Atualiza um processo judicial
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um processo judicial' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processo judicial atualizado',
    type: ProcessoJudicial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Processo judicial não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProcessoJudicialDto: UpdateProcessoJudicialDto,
    @Request() req,
    @ReqContext() context: RequestContext,
  ): Promise<ProcessoJudicial> {
    // Buscar dados do processo antes da atualização
    const processoAntes = await this.processoJudicialService.findById(id);

    const resultado = await this.processoJudicialService.update(
      id,
      updateProcessoJudicialDto,
      req.user.id,
    );

    // Auditoria da atualização de processo judicial
    await this.auditEventEmitter.emitEntityUpdated(
      'ProcessoJudicial',
      id,
      processoAntes,
      resultado,
      req.user.id?.toString(),
      {
        synchronous: false,

    });

    return resultado;
  }

  /**
   * Atualiza o status de um processo judicial
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um processo judicial' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status atualizado com sucesso',
    type: ProcessoJudicial,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Processo judicial não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Status inválido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateStatusProcessoJudicialDto,
    @Request() req,
    @ReqContext() context: RequestContext,
  ): Promise<ProcessoJudicial> {
    // Buscar dados anteriores para auditoria
    const previousData = await this.processoJudicialService.findById(id);
    
    // Atualizar status do processo judicial
    const result = await this.processoJudicialService.updateStatus(
      id,
      updateStatusDto.status,
      req.user.id,
    );
    
    // Emitir evento de auditoria para atualização de status
    await this.auditEventEmitter.emitEntityUpdated(
      'ProcessoJudicial',
      id,
      previousData,
      result,
      req.user.id?.toString(),
      {
        synchronous: false,

    });
    
    return result;
  }

  /**
   * Desativa um processo judicial (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa um processo judicial (soft delete)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Processo judicial desativado com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Processo judicial não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @ReqContext() context: RequestContext,
  ): Promise<void> {
    // Buscar dados anteriores para auditoria
    const previousData = await this.processoJudicialService.findById(id);
    
    // Desativar processo judicial
    await this.processoJudicialService.desativar(id, req.user.id);
    
    // Emitir evento de auditoria para remoção
    await this.auditEventEmitter.emitEntityDeleted(
      'ProcessoJudicial',
      id,
      previousData,
      req.user.id?.toString(),
      {
        synchronous: false,

    });
  }
}
