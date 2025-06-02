import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { PapelCidadaoService } from '../services/papel-cidadao.service';
import { CreatePapelCidadaoDto } from '../dto/create-papel-cidadao.dto';
import { TipoPapel, PaperType } from '../../../enums/tipo-papel.enum';

/**
 * Controlador responsável por gerenciar os papéis dos cidadãos no sistema.
 * 
 * Os papéis definem as funções que um cidadão pode assumir, como beneficiário,
 * requerente ou representante legal. Cada papel possui regras específicas e
 * metadados associados.
 */
@ApiTags('Cidadão')
@Controller('v1/cidadao/papel')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PapelCidadaoController {
  private readonly logger = new Logger(PapelCidadaoController.name);
  constructor(private readonly papelCidadaoService: PapelCidadaoService) {}

  /**
   * Cria um novo papel para um cidadão
   * 
   * Este endpoint permite atribuir um papel específico a um cidadão, como beneficiário,
   * requerente ou representante legal. Cada papel pode exigir metadados específicos.
   * 
   * @example
   * Exemplo para criar um papel de beneficiário:
   * ```json
   * {
   *   "tipo_papel": "BENEFICIARIO",
   *   "cidadao_id": "3eb81648-8da3-4e3a-97a6-e70c00706f22"
   * }
   * ```
   * 
   * @example
   * Exemplo para criar um papel de representante legal:
   * ```json
   * {
   *   "tipo_papel": "REPRESENTANTE_LEGAL",
   *   "cidadao_id": "3eb81648-8da3-4e3a-97a6-e70c00706f22",
   *   "metadados": {
   *     "documento_representacao": "12345678",
   *     "data_validade_representacao": "2026-01-01"
   *   }
   * }
   * ```
   */
  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.papel.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Criar novo papel para um cidadão' })
  @ApiBody({
    description: 'Dados para criação de papel de cidadão',
    type: CreatePapelCidadaoDto,
    examples: {
      beneficiario: {
        value: {
          tipo_papel: 'BENEFICIARIO',
          cidadao_id: '3eb81648-8da3-4e3a-97a6-e70c00706f22'
        },
        summary: 'Papel de Beneficiário'
      },
      representante: {
        value: {
          tipo_papel: 'REPRESENTANTE_LEGAL',
          cidadao_id: '3eb81648-8da3-4e3a-97a6-e70c00706f22',
          metadados: {
            documento_representacao: '12345678',
            data_validade_representacao: '2026-01-01'
          }
        },
        summary: 'Papel de Representante Legal'
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Papel criado com sucesso',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        cidadao_id: '3eb81648-8da3-4e3a-97a6-e70c00706f22',
        tipo_papel: 'BENEFICIARIO',
        metadados: {},
        ativo: true,
        created_at: '2025-05-30T23:45:38.000Z',
        updated_at: '2025-05-30T23:45:38.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @ApiResponse({ status: 409, description: 'Cidadão já possui este papel' })
  async create(@Body() createPapelCidadaoDto: CreatePapelCidadaoDto) {
    try {
      // Normalizar o tipo de papel para maiúsculas para garantir compatibilidade com o enum do banco
      // Convertemos para string primeiro para garantir que o método toUpperCase() está disponível
      const tipoPapelUpperCase = String(createPapelCidadaoDto.tipo_papel).toUpperCase();
      
      // Verificar se o tipo de papel normalizado é válido
      const validPaperTypes = Object.values(TipoPapel).map(v => String(v).toUpperCase());
      if (!validPaperTypes.includes(tipoPapelUpperCase)) {
        throw new BadRequestException(
          `Tipo de papel inválido: ${createPapelCidadaoDto.tipo_papel}. ` +
          `Valores permitidos: ${Object.keys(TipoPapel).join(', ')}`
        );
      }
      
      // Criar um novo DTO com o tipo de papel normalizado
      // Usamos 'as PaperType' para garantir compatibilidade de tipo
      const normalizedDto: CreatePapelCidadaoDto = {
        ...createPapelCidadaoDto,
        tipo_papel: tipoPapelUpperCase as PaperType
      };
      
      this.logger.debug(`Criando papel ${normalizedDto.tipo_papel} para cidadão ${normalizedDto.cidadao_id}`);
      return await this.papelCidadaoService.create(normalizedDto);
    } catch (error) {
      this.logger.error(`Erro ao criar papel para cidadão: ${error.message}`, error.stack);
      
      // Tratamento específico para erros de trigger do banco
      if (error.message && error.message.includes('Cidadão não pode ser beneficiário, pois já está em uma composição familiar')) {
        throw new ConflictException(
          'Cidadão não pode ser beneficiário pois já faz parte de uma composição familiar. ' +
          'Remova o cidadão da composição familiar antes de atribuir o papel de beneficiário.'
        );
      }
      
      // Tratamento específico para erros de enum
      if (error.message && error.message.includes('valor de entrada é inválido para enum')) {
        throw new BadRequestException(
          `Tipo de papel inválido: ${createPapelCidadaoDto.tipo_papel}. ` +
          `Valores permitidos: BENEFICIARIO, REQUERENTE, REPRESENTANTE_LEGAL`
        );
      }
      
      // Tratamento para erros de violação de restrição de unicidade
      if (error.code === '23505') {
        throw new ConflictException('Já existe um papel ativo deste tipo para o cidadão');
      }
      
      // Tratamento para erros de violação de chave estrangeira
      if (error.code === '23503') {
        throw new BadRequestException('Cidadão não encontrado ou dados inválidos');
      }
      
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar papel para cidadão');
    }
  }

  /**
   * Lista todos os papéis de um cidadão
   * 
   * Este endpoint retorna todos os papéis ativos associados a um cidadão específico.
   * Os papéis podem incluir beneficiário, requerente, representante legal, etc.
   * 
   * @param cidadaoId - ID do cidadão para buscar os papéis
   * @returns Lista de papéis do cidadão
   * 
   * @example
   * Exemplo de resposta:
   * ```json
   * [
   *   {
   *     "id": "550e8400-e29b-41d4-a716-446655440000",
   *     "cidadao_id": "3eb81648-8da3-4e3a-97a6-e70c00706f22",
   *     "tipo_papel": "BENEFICIARIO",
   *     "metadados": {},
   *     "ativo": true,
   *     "created_at": "2025-05-30T23:45:38.000Z",
   *     "updated_at": "2025-05-30T23:45:38.000Z"
   *   }
   * ]
   * ```
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({
    permissionName: 'cidadao.papel.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar papéis de um cidadão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de papéis retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          cidadao_id: '3eb81648-8da3-4e3a-97a6-e70c00706f22',
          tipo_papel: 'BENEFICIARIO',
          metadados: {},
          ativo: true,
          created_at: '2025-05-30T23:45:38.000Z',
          updated_at: '2025-05-30T23:45:38.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByCidadaoId(@Param('cidadaoId') cidadaoId: string) {
    return this.papelCidadaoService.findByCidadaoId(cidadaoId);
  }

  /**
   * Busca cidadãos por tipo de papel
   * 
   * Este endpoint retorna uma lista paginada de cidadãos que possuem um determinado papel.
   * Útil para listar todos os beneficiários, requerentes ou representantes legais.
   * 
   * @param tipoPapel - Tipo de papel para filtrar (BENEFICIARIO, REQUERENTE, REPRESENTANTE_LEGAL)
   * @param page - Número da página para paginação (opcional, padrão: 1)
   * @param limit - Limite de itens por página (opcional, padrão: 10)
   * @returns Lista paginada de cidadãos com o papel especificado
   * 
   * @example
   * Exemplo de resposta:
   * ```json
   * {
   *   "items": [
   *     {
   *       "id": "3eb81648-8da3-4e3a-97a6-e70c00706f22",
   *       "nome": "João da Silva",
   *       "cpf": "123.456.789-00",
   *       "nis": "12345678901",
   *       "telefone": "(84) 99999-9999",
   *       "endereco": "Rua das Flores, 123",
   *       "unidade_id": "550e8400-e29b-41d4-a716-446655440000"
   *     }
   *   ],
   *   "meta": {
   *     "totalItems": 1,
   *     "itemCount": 1,
   *     "itemsPerPage": 10,
   *     "totalPages": 1,
   *     "currentPage": 1
   *   }
   * }
   * ```
   */
  @Get('tipo/:tipoPapel')
  @RequiresPermission({ permissionName: 'cidadao.papel.listar' })
  @ApiOperation({ summary: 'Buscar cidadãos por tipo de papel' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cidadãos retornada com sucesso',
    schema: {
      example: {
        items: [
          {
            id: '3eb81648-8da3-4e3a-97a6-e70c00706f22',
            nome: 'João da Silva',
            cpf: '123.456.789-00',
            nis: '12345678901',
            telefone: '(84) 99999-9999',
            endereco: 'Rua das Flores, 123',
            unidade_id: '550e8400-e29b-41d4-a716-446655440000'
          }
        ],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1
        }
      }
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página para paginação' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite de itens por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Termo de busca para filtrar cidadãos' })
  async findCidadaosByTipoPapel(
    @Param('tipoPapel') tipoPapel: PaperType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Normalizar o tipo de papel para maiúsculas para garantir compatibilidade
    const normalizedTipoPapel = String(tipoPapel).toUpperCase() as PaperType;
    this.logger.debug(`Buscando cidadãos com papel ${normalizedTipoPapel}`);
    
    return this.papelCidadaoService.findCidadaosByTipoPapel(normalizedTipoPapel, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Verifica se um cidadão possui um determinado papel
   * 
   * Este endpoint verifica se um cidadão específico possui um determinado papel ativo.
   * Útil para validar se um cidadão é beneficiário, requerente ou representante legal.
   * 
   * @param cidadaoId - ID do cidadão para verificar
   * @param tipoPapel - Tipo de papel para verificar (BENEFICIARIO, REQUERENTE, REPRESENTANTE_LEGAL)
   * @returns Objeto com a propriedade temPapel (true/false)
   * 
   * @example
   * Exemplo de resposta:
   * ```json
   * {
   *   "temPapel": true
   * }
   * ```
   */
  @Get('verificar/:cidadaoId/:tipoPapel')
  @RequiresPermission({
    permissionName: 'cidadao.papel.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Verificar se um cidadão possui um determinado papel',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação realizada com sucesso',
    schema: {
      example: {
        temPapel: true
      }
    }
  })
  async verificarPapel(
    @Param('cidadaoId') cidadaoId: string,
    @Param('tipoPapel') tipoPapel: PaperType,
  ) {
    // Normalizar o tipo de papel para maiúsculas para garantir compatibilidade
    const normalizedTipoPapel = String(tipoPapel).toUpperCase() as PaperType;
    this.logger.debug(`Verificando se cidadão ${cidadaoId} possui papel ${normalizedTipoPapel}`);
    
    const temPapel = await this.papelCidadaoService.verificarPapel(
      cidadaoId,
      normalizedTipoPapel,
    );
    return { temPapel };
  }

  /**
   * Desativa um papel de um cidadão
   * 
   * Este endpoint desativa (soft delete) um papel específico de um cidadão.
   * O papel não é removido do banco de dados, apenas marcado como inativo.
   * 
   * @param id - ID do papel a ser desativado
   * @returns Objeto com informações do papel desativado
   * 
   * @example
   * Exemplo de resposta:
   * ```json
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "cidadao_id": "3eb81648-8da3-4e3a-97a6-e70c00706f22",
   *   "tipo_papel": "BENEFICIARIO",
   *   "metadados": {},
   *   "ativo": false,
   *   "created_at": "2025-05-30T23:45:38.000Z",
   *   "updated_at": "2025-05-30T23:46:38.000Z",
   *   "removed_at": "2025-05-30T23:46:38.000Z"
   * }
   * ```
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'cidadao.papel.excluir',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'papel.cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Desativar papel de um cidadão' })
  @ApiResponse({ 
    status: 200, 
    description: 'Papel desativado com sucesso',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        cidadao_id: '3eb81648-8da3-4e3a-97a6-e70c00706f22',
        tipo_papel: 'BENEFICIARIO',
        metadados: {},
        ativo: false,
        created_at: '2025-05-30T23:45:38.000Z',
        updated_at: '2025-05-30T23:46:38.000Z',
        removed_at: '2025-05-30T23:46:38.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async desativar(@Param('id') id: string) {
    this.logger.debug(`Desativando papel com ID ${id}`);
    
    return this.papelCidadaoService.desativar(id);
  }
}
