import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditEventEmitter } from '../events/emitters/audit-event.emitter';
import { AuditEventType } from '../events/types/audit-event.types';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { AuditoriaService } from '../services/auditoria.service';
import { AuditProcessor } from '../queues/processors/audit.processor';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { Public } from '@/auth/decorators/public.decorator';

/**
 * Controlador de Auditoria
 *
 * Responsável por expor as funcionalidades de auditoria via API REST.
 * Permite consultar logs de auditoria e gerar relatórios.
 */
@ApiTags('Auditoria')
@Controller('auditoria')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly auditProcessor: AuditProcessor,
  ) {}

  /**
   * Cria um novo log de auditoria manualmente
   * Normalmente os logs são criados automaticamente pelo middleware
   */
  @Post()
  @RequiresPermission({
    permissionName: 'auditoria.log.criar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Cria um novo log de auditoria manualmente' })
  @ApiResponse({
    status: 201,
    description: 'Log de auditoria criado com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  create(@Body() createLogAuditoriaDto: CreateLogAuditoriaDto, @Req() req) {
    // Adiciona informações do usuário logado
    if (!createLogAuditoriaDto.usuario_id && req.user) {
      createLogAuditoriaDto.usuario_id = req.user.id;
    }

    // Adiciona informações da requisição
    if (!createLogAuditoriaDto.ip_origem) {
      createLogAuditoriaDto.ip_origem = req.ip;
    }

    if (!createLogAuditoriaDto.user_agent) {
      createLogAuditoriaDto.user_agent = req.headers['user-agent'];
    }

    // Migração para o novo sistema de eventos de auditoria
    // Determina o tipo de evento baseado no tipo_operacao
    const operacao = createLogAuditoriaDto.tipo_operacao;
    const entidade = createLogAuditoriaDto.entidade_afetada || 'Unknown';
    const entidadeId = createLogAuditoriaDto.entidade_id;
    const userId = createLogAuditoriaDto.usuario_id;
    const dadosAnteriores = createLogAuditoriaDto.dados_anteriores;
    const dadosNovos = createLogAuditoriaDto.dados_novos;
    const descricao = createLogAuditoriaDto.descricao || `${operacao} em ${entidade}`;
    const camposSensiveis = createLogAuditoriaDto.dados_sensiveis_acessados || [];

    // Emite o evento apropriado baseado na operação
    switch (operacao) {
      case TipoOperacao.CREATE:
        this.auditEventEmitter.emitEntityCreated(
          entidade,
          entidadeId,
          dadosNovos,
          userId
        );
        break;
      case TipoOperacao.UPDATE:
        this.auditEventEmitter.emitEntityUpdated(
          entidade,
          entidadeId,
          dadosAnteriores,
          dadosNovos
        );
        break;
      case TipoOperacao.DELETE:
        this.auditEventEmitter.emitEntityDeleted(
          entidade,
          entidadeId,
          dadosAnteriores,
          userId
        );
        break;
      default:
        this.auditEventEmitter.emitSystemEvent(
          AuditEventType.SYSTEM_INFO,
          { 
            entidade, 
            entityId: entidadeId, 
            dados_anteriores: dadosAnteriores, 
            dados_novos: dadosNovos, 
            userId 
          }
        );
        break;
    }

    // Mantém compatibilidade retornando o DTO original
    return Promise.resolve(createLogAuditoriaDto);
  }

  /**
   * Busca logs de auditoria com base nos filtros fornecidos
   */
  @Get()
  @RequiresPermission({
    permissionName: 'auditoria.log.listar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Busca logs de auditoria' })
  @ApiResponse({ status: 200, description: 'Lista de logs de auditoria' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findAll(@Query() queryParams: QueryLogAuditoriaDto) {
    return this.auditoriaService.findAll(queryParams);
  }

  /**
   * Endpoint para testar o worker de auditoria diretamente
   */
  @Get('/test-worker-direct')
  @ApiOperation({ summary: 'Testa o worker de auditoria diretamente' })
  @ApiResponse({
    status: 200,
    description: 'Teste do worker executado com sucesso',
  })
  @RequiresPermission({
    permissionName: 'auditoria.teste.executar',
    scopeType: ScopeType.GLOBAL,
  })
  async testWorkerDirect() {
    try {
      const result = await this.auditProcessor.testDirectProcessing();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca um log de auditoria pelo ID
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'auditoria.log.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Busca um log de auditoria pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do log de auditoria' })
  @ApiResponse({ status: 200, description: 'Log de auditoria encontrado' })
  @ApiResponse({ status: 404, description: 'Log de auditoria não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditoriaService.findOne(id);
  }

  /**
   * Busca logs de auditoria por entidade
   */
  @Get('entidade/:entidade/:id')
  @RequiresPermission({
    permissionName: 'auditoria.log.entidade.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Busca logs de auditoria por entidade' })
  @ApiParam({ name: 'entidade', description: 'Nome da entidade' })
  @ApiParam({ name: 'id', description: 'ID da entidade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria da entidade',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findByEntidade(
    @Param('entidade') entidade: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditoriaService.findByEntidade(entidade, id);
  }

  /**
   * Busca logs de auditoria por usuário
   */
  @Get('usuario/:id')
  @RequiresPermission({
    permissionName: 'auditoria.log.usuario.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Busca logs de auditoria por usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria do usuário',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findByUsuario(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditoriaService.findByUsuario(id);
  }

  /**
   * Gera relatório de acessos a dados sensíveis por período
   */
  @Get('relatorios/dados-sensiveis')
  @RequiresPermission({
    permissionName: 'auditoria.relatorio.dados-sensiveis',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Gera relatório de acessos a dados sensíveis por período',
  })
  @ApiQuery({
    name: 'data_inicial',
    description: 'Data inicial (formato ISO)',
    required: true,
  })
  @ApiQuery({
    name: 'data_final',
    description: 'Data final (formato ISO)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório de acessos a dados sensíveis',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  relatorioAcessosDadosSensiveis(
    @Query('data_inicial') dataInicial: string,
    @Query('data_final') dataFinal: string,
  ) {
    return this.auditoriaService.relatorioAcessosDadosSensiveis(
      new Date(dataInicial),
      new Date(dataFinal),
    );
  }

}
