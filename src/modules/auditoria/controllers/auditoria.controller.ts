import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { AuditoriaService } from '../services/auditoria.service';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Controlador de Auditoria
 *
 * Responsável por expor as funcionalidades de auditoria via API REST.
 * Permite consultar logs de auditoria e gerar relatórios.
 */
@ApiTags('Auditoria')
@Controller('v1/auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Cria um novo log de auditoria manualmente
   * Normalmente os logs são criados automaticamente pelo middleware
   */
  @Post()
  @Roles(Role.ADMIN)
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

    return this.auditoriaService.create(createLogAuditoriaDto);
  }

  /**
   * Busca logs de auditoria com base nos filtros fornecidos
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Busca logs de auditoria' })
  @ApiResponse({ status: 200, description: 'Lista de logs de auditoria' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findAll(@Query() queryParams: QueryLogAuditoriaDto) {
    return this.auditoriaService.findAll(queryParams);
  }

  /**
   * Busca um log de auditoria pelo ID
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Busca um log de auditoria pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do log de auditoria' })
  @ApiResponse({ status: 200, description: 'Log de auditoria encontrado' })
  @ApiResponse({ status: 404, description: 'Log de auditoria não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findOne(@Param('id') id: string) {
    return this.auditoriaService.findOne(id);
  }

  /**
   * Busca logs de auditoria por entidade
   */
  @Get('entidade/:entidade/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Busca logs de auditoria por entidade' })
  @ApiParam({ name: 'entidade', description: 'Nome da entidade' })
  @ApiParam({ name: 'id', description: 'ID da entidade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria da entidade',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findByEntidade(@Param('entidade') entidade: string, @Param('id') id: string) {
    return this.auditoriaService.findByEntidade(entidade, id);
  }

  /**
   * Busca logs de auditoria por usuário
   */
  @Get('usuario/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Busca logs de auditoria por usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria do usuário',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findByUsuario(@Param('id') id: string) {
    return this.auditoriaService.findByUsuario(id);
  }

  /**
   * Gera relatório de acessos a dados sensíveis por período
   */
  @Get('relatorios/dados-sensiveis')
  @Roles(Role.ADMIN)
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
