import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { PendenciaService } from '../services/pendencia.service';
import {
  CreatePendenciaDto,
  ResolverPendenciaDto,
  CancelarPendenciaDto,
  FiltrosPendenciaDto,
  PendenciaResponseDto,
} from '../dto/pendencia';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { ErrorResponseDto } from '../../../shared/dtos/error-response.dto';
import { SuccessResponseDto } from '../../../shared/dtos/success-response.dto';
import { TipoEscopo } from '@/entities/user-permission.entity';
import { Usuario } from '@/entities/usuario.entity';

/**
 * Controller centralizado para gestão de pendências
 *
 * Responsável por todos os endpoints relacionados a pendências de solicitações
 */
@ApiTags('Solicitação')
@Controller('pendencias')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PendenciaController {
  constructor(private readonly pendenciaService: PendenciaService) {}

  /**
   * Cria uma nova pendência
   */
  @Post()
  @RequiresPermission({
    permissionName: 'pendencia.criar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Criar nova pendência',
    description: 'Registra uma nova pendência para uma solicitação',
  })
  @ApiBody({ type: CreatePendenciaDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pendência criada com sucesso',
    type: PendenciaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para criar pendência',
    type: ErrorResponseDto,
  })
  async criarPendencia(
    @Body() createPendenciaDto: CreatePendenciaDto,
    @GetUser() usuario: Usuario,
    @Req() req: Request,
  ): Promise<PendenciaResponseDto> {
    return this.pendenciaService.criarPendencia(
      createPendenciaDto,
      usuario.id,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Busca uma pendência por ID
   */
  @Get(':pendenciaId')
  @RequiresPermission({
    permissionName: 'pendencia.ler',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Buscar pendência por ID',
    description: 'Retorna os detalhes de uma pendência específica',
  })
  @ApiParam({
    name: 'pendenciaId',
    description: 'ID da pendência',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pendência encontrada',
    type: PendenciaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pendência não encontrada',
    type: ErrorResponseDto,
  })
  async buscarPorId(
    @Param('pendenciaId', ParseUUIDPipe) pendenciaId: string,
    @GetUser() usuario: Usuario,
    @Req() req: Request,
  ): Promise<PendenciaResponseDto> {
    return this.pendenciaService.buscarPorId(pendenciaId, usuario.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Lista pendências com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'pendencia.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Listar pendências',
    description: 'Lista pendências com filtros e paginação',
  })
  @ApiQuery({ type: FiltrosPendenciaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pendências retornada com sucesso',
    type: PaginatedResponseDto<PendenciaResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros de filtro inválidos',
    type: ErrorResponseDto,
  })
  async listarPendencias(
    @Query() filtros: FiltrosPendenciaDto,
  ): Promise<PaginatedResponseDto<PendenciaResponseDto>> {
    return this.pendenciaService.listarPendencias(filtros);
  }

  /**
   * Resolve uma pendência
   */
  @Put(':pendenciaId/resolver')
  @RequiresPermission({
    permissionName: 'pendencia.resolver',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Resolver pendência',
    description: 'Marca uma pendência como resolvida',
  })
  @ApiParam({
    name: 'pendenciaId',
    description: 'ID da pendência',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: ResolverPendenciaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pendência resolvida com sucesso',
    type: PendenciaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou pendência não pode ser resolvida',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pendência não encontrada',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para resolver pendência',
    type: ErrorResponseDto,
  })
  async resolverPendencia(
    @Param('pendenciaId', ParseUUIDPipe) pendenciaId: string,
    @Body() resolverPendenciaDto: ResolverPendenciaDto,
    @GetUser() usuario: Usuario,
    @Req() req: Request,
  ): Promise<PendenciaResponseDto> {
    return this.pendenciaService.resolverPendencia(
      pendenciaId,
      resolverPendenciaDto,
      usuario.id,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Cancela uma pendência
   */
  @Put(':pendenciaId/cancelar')
  @RequiresPermission({
    permissionName: 'pendencia.atualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Cancelar pendência',
    description: 'Marca uma pendência como cancelada',
  })
  @ApiParam({
    name: 'pendenciaId',
    description: 'ID da pendência',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: CancelarPendenciaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pendência cancelada com sucesso',
    type: PendenciaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou pendência não pode ser cancelada',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pendência não encontrada',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para cancelar pendência',
    type: ErrorResponseDto,
  })
  async cancelarPendencia(
    @Param('pendenciaId', ParseUUIDPipe) pendenciaId: string,
    @Body() cancelarPendenciaDto: CancelarPendenciaDto,
    @GetUser() usuario: Usuario,
    @Req() req: Request,
  ): Promise<PendenciaResponseDto> {
    return this.pendenciaService.cancelarPendencia(
      pendenciaId,
      cancelarPendenciaDto,
      usuario.id,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Lista pendências de uma solicitação específica
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({
    permissionName: 'pendencia.ler',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Listar pendências de uma solicitação',
    description: 'Retorna todas as pendências de uma solicitação específica',
  })
  @ApiParam({
    name: 'solicitacaoId',
    description: 'ID da solicitação',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pendências da solicitação',
    type: [PendenciaResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para visualizar pendências da solicitação',
    type: ErrorResponseDto,
  })
  async listarPendenciasPorSolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @GetUser() usuario: Usuario,
  ): Promise<PendenciaResponseDto[]> {
    return this.pendenciaService.listarPendenciasPorSolicitacao(
      solicitacaoId,
      usuario.id,
    );
  }

  /**
   * Lista pendências vencidas
   */
  @Get('relatorios/vencidas')
  @RequiresPermission({
    permissionName: 'pendencia.ler',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({
    summary: 'Listar pendências vencidas',
    description:
      'Retorna todas as pendências que passaram do prazo de resolução',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pendências vencidas',
    type: [PendenciaResponseDto],
  })
  async buscarPendenciasVencidas(): Promise<PendenciaResponseDto[]> {
    return this.pendenciaService.buscarPendenciasVencidas();
  }
}
