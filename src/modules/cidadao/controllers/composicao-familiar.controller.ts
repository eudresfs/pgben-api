import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { ApiErrorResponse } from '../../../shared/dtos/api-error-response.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { UpdateComposicaoFamiliarDto } from '../dto/update-composicao-familiar.dto';
import {
  ComposicaoFamiliarResponseDto,
  ComposicaoFamiliarPaginatedResponseDto,
} from '../dto/composicao-familiar-response.dto';
import { ComposicaoFamiliarService } from '../services/composicao-familiar.service';

@ApiTags('Cidadão')
@Controller('composicao-familiar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComposicaoFamiliarController {
  constructor(
    private readonly composicaoFamiliarService: ComposicaoFamiliarService,
  ) {}

  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Criar membro da composição familiar' })
  @ApiOkResponse({ type: ComposicaoFamiliarResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async create(
    @Body() createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    @Request() req,
  ): Promise<ComposicaoFamiliarResponseDto> {
    return this.composicaoFamiliarService.create(
      createComposicaoFamiliarDto,
      req?.user?.id,
    );
  }

  @Get('cidadao/:cidadaoId')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Listar membros da composição familiar' })
  @ApiParam({ name: 'cidadaoId', description: 'ID do cidadão' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: ComposicaoFamiliarPaginatedResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async findByCidadao(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ComposicaoFamiliarPaginatedResponseDto> {
    return this.composicaoFamiliarService.findByCidadao(
      cidadaoId,
      { page, limit },
    );
  }

  @Get(':id')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Buscar membro da composição familiar' })
  @ApiParam({ name: 'id', description: 'ID do membro' })
  @ApiOkResponse({ type: ComposicaoFamiliarResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    return this.composicaoFamiliarService.findOne(id);
  }

  @Put(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Atualizar membro da composição familiar' })
  @ApiParam({ name: 'id', description: 'ID do membro' })
  @ApiOkResponse({ type: ComposicaoFamiliarResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiConflictResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateComposicaoFamiliarDto: UpdateComposicaoFamiliarDto,
    @Request() req,
  ): Promise<ComposicaoFamiliarResponseDto> {
    return this.composicaoFamiliarService.update(
      id,
      updateComposicaoFamiliarDto,
      req?.user?.id,
    );
  }

  @Delete(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Remover membro da composição familiar' })
  @ApiParam({ name: 'id', description: 'ID do membro' })
  @ApiOkResponse({ description: 'Membro removido com sucesso' })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.composicaoFamiliarService.remove(id, req?.user?.id);
    return { message: 'Membro da composição familiar removido com sucesso' };
  }

  @Get('buscar/cpf/:cpf')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Buscar membro por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF do membro' })
  @ApiOkResponse({ type: [ComposicaoFamiliarResponseDto] })
  async findByCpf(
    @Param('cpf') cpf: string,
  ): Promise<ComposicaoFamiliarResponseDto[]> {
    return this.composicaoFamiliarService.findByCpf(cpf);
  }
}