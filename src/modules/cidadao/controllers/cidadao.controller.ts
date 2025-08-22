import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { CidadaoService } from '../services/cidadao.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';
import { DadosPortalTransparenciaDto } from '../dto/portal-transparencia-response.dto';
import { AutoAudit, SensitiveDataAccess } from '../../auditoria';
import { TransferirUnidadeDto } from '../dto/transferir-unidade.dto';

@ApiTags('Cidadão')
@Controller('cidadao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@AutoAudit({
  enabled: true,
  includeRequest: true,
  includeResponse: false,
  async: true,
})
export class CidadaoController {
  constructor(private readonly cidadaoService: CidadaoService) {}

  @Get()
  @RequiresPermission({
    permissionName: 'cidadao.listar',
    scopeType: ScopeType.UNIT,
  })
  @ApiOperation({
    summary: 'Listar cidadãos com paginação e filtros',
    description:
      'Retorna uma lista paginada de cidadãos com opções de busca por nome, CPF, NIS e filtro por bairro. Suporta inclusão de dados relacionados como contatos, endereços e composição familiar.',
  })
  @ApiResponse({
    status: 200,
    type: CidadaoPaginatedResponseDto,
    description: 'Lista paginada de cidadãos retornada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de consulta inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para listar cidadãos',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de registros por página (padrão: 10, máximo: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Busca por nome, CPF ou NIS do cidadão',
    example: 'Maria Silva',
  })
  @ApiQuery({
    name: 'bairro',
    required: false,
    type: String,
    description: 'Filtrar cidadãos por bairro de residência',
    example: 'Centro',
  })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    type: String,
    description: 'Filtrar cidadãos por unidade específica (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description:
      'Incluir dados relacionados (contatos, endereços, composição familiar)',
    example: false,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('unidade_id') unidade_id?: string,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
    @Query('includeRelations', new DefaultValuePipe(false))
    includeRelations?: boolean,
  ): Promise<CidadaoPaginatedResponseDto> {
    return this.cidadaoService.findAll({
      page,
      limit,
      search,
      bairro,
      unidade_id,
      includeRelations,
    });
  }

  @Get(':id')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
  })
  @SensitiveDataAccess(['cpf', 'nis', 'nome', 'data_nascimento'], {
    requiresConsent: false,
    maskInLogs: true,
  })
  @ApiOperation({
    summary: 'Obter cidadão por ID',
    description:
      'Retorna os dados completos de um cidadão específico. Opcionalmente inclui dados relacionados como contatos, endereços, composição familiar, dados sociais, situação de moradia e informações bancárias.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do cidadão (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description:
      'Incluir todos os dados relacionados (contatos, endereços, composição familiar, dados sociais, situação de moradia, informações bancárias)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    type: CidadaoResponseDto,
    description: 'Dados do cidadão retornados com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido (deve ser um UUID v4)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para visualizar este cidadão',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('includeRelations', new DefaultValuePipe(false))
    includeRelations: boolean,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findById(id, includeRelations, req.user.id);
  }

  @Post()
  @RequiresPermission({ permissionName: 'cidadao.criar' })
  @SensitiveDataAccess(['cpf', 'nis', 'nome', 'data_nascimento'], {
    requiresConsent: false,
    maskInLogs: true,
  })
  @ApiOperation({
    summary: 'Criar ou atualizar cidadão com dados relacionados (Upsert)',
    description:
      'Cria um novo cidadão ou atualiza um existente baseado no CPF. Se o CPF já estiver cadastrado, os dados do cidadão existente serão atualizados. Suporta operação completa incluindo dados relacionados como contatos, endereços, composição familiar, dados sociais, situação de moradia e informações bancárias em uma única transação. Utiliza padrão Aggregate Root para garantir consistência dos dados.',
  })
  @ApiResponse({
    status: 201,
    type: CidadaoResponseDto,
    description:
      'Cidadão criado ou atualizado com sucesso, incluindo todos os dados relacionados processados',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos - validação de CPF, NIS, campos obrigatórios ou estrutura de dados relacionados',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para criar cidadãos',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - NIS já cadastrado para outro cidadão (CPF é usado para upsert)',
  })
  @ApiResponse({
    status: 422,
    description:
      'Erro de validação de dados relacionados (contatos, endereços, etc.)',
  })
  async create(
    @Body() createCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.create(
      createCidadaoDto,
      req.user.unidade_id,
      req.user.id,
    );
  }

  @Put(':id')
  @RequiresPermission({
    permissionName: 'cidadao.atualizar',
    scopeType: ScopeType.UNIT,
  })
  @SensitiveDataAccess(['cpf', 'nis', 'nome', 'data_nascimento'], {
    requiresConsent: false,
    maskInLogs: true,
  })
  @ApiOperation({
    summary: 'Atualizar cidadão e dados relacionados',
    description:
      'Atualiza os dados de um cidadão existente. Suporta atualização completa incluindo dados relacionados como contatos, endereços, composição familiar, dados sociais, situação de moradia e informações bancárias. Utiliza operações upsert para dados relacionados, garantindo integridade referencial.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do cidadão a ser atualizado (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    type: CidadaoResponseDto,
    description:
      'Cidadão atualizado com sucesso, incluindo todos os dados relacionados processados',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos - ID malformado ou validação de campos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão para atualizar este cidadão',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - CPF ou NIS já existe para outro cidadão',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação de dados relacionados durante atualização',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.update(id, updateCidadaoDto, req.user.id);
  }

  @Get('cpf/:cpf')
  @RequiresPermission({ permissionName: 'cidadao.buscar.cpf' })
  @SensitiveDataAccess(['cpf'], {
    requiresConsent: true,
    maskInLogs: true,
  })
  @ApiOperation({
    summary: 'Buscar cidadão por CPF',
    description:
      'Busca um cidadão específico pelo número do CPF. Este endpoint requer consentimento para acesso a dados sensíveis e é auditado. Retorna dados completos incluindo relacionamentos.',
  })
  @ApiParam({
    name: 'cpf',
    description: 'CPF do cidadão (com ou sem formatação)',
    example: '123.456.789-00',
  })
  @ApiResponse({
    status: 200,
    type: CidadaoResponseDto,
    description: 'Cidadão encontrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'CPF inválido ou malformado',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuário não possui permissão para buscar por CPF ou consentimento não fornecido',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado com o CPF informado',
  })
  async findByCpf(
    @Param('cpf') cpf: string,
    @Request() req,
  ): Promise<CidadaoResponseDto | DadosPortalTransparenciaDto> {
    return this.cidadaoService.findByCpf(cpf, true, req.user.id);
  }

  @Get('nis/:nis')
  @RequiresPermission({ permissionName: 'cidadao.buscar.nis' })
  @SensitiveDataAccess(['nis'], {
    requiresConsent: true,
    maskInLogs: true,
  })
  @ApiOperation({
    summary: 'Buscar cidadão por NIS',
    description:
      'Busca um cidadão específico pelo Número de Identificação Social (NIS). Este endpoint requer consentimento para acesso a dados sensíveis e é auditado. Retorna dados completos incluindo relacionamentos.',
  })
  @ApiParam({
    name: 'nis',
    description: 'NIS (Número de Identificação Social) do cidadão',
    example: '12345678901',
  })
  @ApiResponse({
    status: 200,
    type: CidadaoResponseDto,
    description: 'Cidadão encontrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'NIS inválido ou malformado',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuário não possui permissão para buscar por NIS ou consentimento não fornecido',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado com o NIS informado',
  })
  async findByNis(
    @Param('nis') nis: string,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findByNis(nis, true, req.user.id);
  }

  @Put(':id/transferir-unidade')
  @RequiresPermission({
    permissionName: 'cidadao.transferir.unidade',
  })
  @SensitiveDataAccess(['unidade_id'], {
    requiresConsent: false,
    maskInLogs: false,
  })
  @ApiOperation({
    summary: 'Transferir cidadão para outra unidade',
    description:
      'Transfere um cidadão para uma nova unidade e opcionalmente registra um novo endereço. A operação é auditada e registra o histórico de transferências.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do cidadão a ser transferido (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    type: CidadaoResponseDto,
    description: 'Cidadão transferido com sucesso para a nova unidade',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos - ID malformado, unidade igual à atual ou dados de endereço inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuário não possui permissão para transferir cidadãos entre unidades',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado ou unidade de destino não existe',
  })
  @ApiResponse({
    status: 422,
    description:
      'Erro de validação - unidade de destino inválida ou dados de endereço inconsistentes',
  })
  async transferirUnidade(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() transferirUnidadeDto: TransferirUnidadeDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.transferirUnidade(
      id,
      transferirUnidadeDto,
      req.user.id,
    );
  }
}
