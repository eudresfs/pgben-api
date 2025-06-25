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
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { DadosBeneficioFactoryService } from '../services/dados-beneficio-factory.service';
import {
  TipoDadosBeneficio,
  IDadosBeneficio,
  ICreateDadosBeneficioDto,
  IUpdateDadosBeneficioDto,
} from '../interfaces/dados-beneficio.interface';

/**
 * Controlador centralizado para gerenciar dados de todos os tipos de benefícios
 *
 * Este controlador unifica o acesso a dados específicos de benefícios,
 * eliminando a necessidade de múltiplos controladores separados.
 *
 * ## Tipos de Benefícios Suportados:
 *
 * ### Aluguel Social
 * Benefício destinado a famílias em situação de vulnerabilidade habitacional.
 * **Campos específicos:**
 * - `publico_prioritario`: Categoria do público (gestantes, idosos, PcD, etc.)
 * - `especificacoes`: Até 2 especificações adicionais (vítima de violência, LGBTQIA+, etc.)
 * - `situacao_moradia_atual`: Descrição detalhada da situação habitacional
 * - `possui_imovel_interditado`: Indica se possui imóvel interditado
 * - `caso_judicializado_maria_penha`: Casos sob Lei Maria da Penha
 * - `observacoes`: Observações complementares
 *
 * ### Outros Benefícios
 * - Cesta Básica
 * - Auxílio Funeral
 * - Auxílio Natalidade
 *
 * ## Uso dos Endpoints:
 * Todos os endpoints aceitam tanto o código do tipo de benefício (ex: 'aluguel-social')
 * quanto o ID numérico do tipo de benefício no banco de dados.
 */
@ApiTags('Benefícios')
@Controller('dados-beneficio')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DadosBeneficioController {
  constructor(
    private readonly dadosBeneficioFactoryService: DadosBeneficioFactoryService,
  ) {}

  /**
   * Listar tipos de benefícios suportados
   */
  @Get('tipos')
  @ApiOperation({
    summary: 'Listar tipos de benefícios suportados',
    description:
      'Retorna todos os tipos de benefícios que possuem dados específicos',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tipos de benefícios suportados',
    schema: {
      type: 'object',
      properties: {
        tipos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              codigo: { type: 'string', example: 'aluguel-social' },
              nome: { type: 'string', example: 'Aluguel Social' },
              descricao: {
                type: 'string',
                example: 'Dados específicos para solicitação de Aluguel Social',
              },
            },
          },
        },
      },
    },
  })
  async getTiposSuportados() {
    const tipos = this.dadosBeneficioFactoryService.getSupportedTypes();
    return {
      tipos: tipos.map((tipo) => ({
        ...this.dadosBeneficioFactoryService.getTypeMetadata(tipo),
        codigo: tipo,
      })),
    };
  }

  /**
   * Criar dados específicos para um tipo de benefício
   */
  @Post(':codigoOrId')
  @ApiOperation({
    summary: 'Criar dados específicos de benefício',
    description:
      'Cria dados específicos para um tipo de benefício usando código (ex: aluguel-social) ou ID do tipo de benefício',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiBody({
    description:
      'Dados específicos do benefício (estrutura varia conforme o tipo)',
    schema: {
      oneOf: [
        {
          title: 'Dados Aluguel Social',
          type: 'object',
          properties: {
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID da solicitação',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            publico_prioritario: {
              type: 'string',
              enum: [
                'criancas_adolescentes',
                'gestantes_nutrizes',
                'idosos',
                'mulheres_vitimas_violencia',
                'pcd',
                'atingidos_calamidade',
                'situacao_risco',
              ],
              description: 'Público prioritário (apenas 1 opção)',
              example: 'gestantes_nutrizes',
            },
            especificacoes: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'trabalho_infantil',
                  'exploracao_sexual',
                  'vitima_violencia',
                  'lgbtqia',
                  'conflito_lei',
                  'drogadicao',
                  'situacao_rua',
                  'gravidez_adolescencia',
                ],
              },
              maxItems: 2,
              description: 'Especificações adicionais (até 2 opções)',
              example: ['vitima_violencia', 'lgbtqia'],
            },
            situacao_moradia_atual: {
              type: 'string',
              description: 'Descrição detalhada da situação atual da moradia',
              example:
                'Família reside em casa de parentes, sem condições de permanência devido a conflitos familiares.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              description: 'Indica se possui imóvel interditado',
              example: false,
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              description:
                'Indica se é caso judicializado pela Lei Maria da Penha (Art. 23, inciso VI)',
              example: false,
            },
            observacoes: {
              type: 'string',
              description: 'Observações adicionais sobre o caso',
              example:
                'Família em situação de extrema vulnerabilidade, necessita acompanhamento psicossocial.',
            },
          },
          required: [
            'solicitacao_id',
            'publico_prioritario',
            'situacao_moradia_atual',
            'possui_imovel_interditado',
            'caso_judicializado_maria_penha',
          ],
        },
        {
          title: 'Dados Genéricos',
          type: 'object',
          properties: {
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID da solicitação',
            },
          },
          required: ['solicitacao_id'],
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dados específicos criados com sucesso',
    schema: {
      oneOf: [
        {
          title: 'Resposta Aluguel Social',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            publico_prioritario: {
              type: 'string',
              example: 'gestantes_nutrizes',
            },
            especificacoes: {
              type: 'array',
              items: { type: 'string' },
              example: ['vitima_violencia', 'lgbtqia'],
            },
            situacao_moradia_atual: {
              type: 'string',
              example:
                'Família reside em casa de parentes, sem condições de permanência devido a conflitos familiares.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              example: false,
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              example: false,
            },
            observacoes: {
              type: 'string',
              example:
                'Família em situação de extrema vulnerabilidade, necessita acompanhamento psicossocial.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
          },
        },
        {
          title: 'Resposta Genérica',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            solicitacao_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou tipo de benefício não suportado',
  })
  async create(
    @Param('codigoOrId') codigoOrId: string,
    @Body() createDto: ICreateDadosBeneficioDto,
    @GetUser() usuario: Usuario,
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.create(
      codigoOrId, 
      {
        ...createDto,
        usuario_id: usuario.id
      });
  }

  /**
   * Buscar dados específicos por ID
   */
  @Get(':codigoOrId/dados/:id')
  @ApiOperation({
    summary: 'Buscar dados específicos de benefício por ID',
    description:
      'Busca dados específicos de um benefício usando código/ID do tipo e ID dos dados',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiParam({
    name: 'id',
    description: 'ID dos dados do benefício',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados encontrados com sucesso',
    schema: {
      oneOf: [
        {
          title: 'Dados Aluguel Social Encontrados',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            publico_prioritario: {
              type: 'string',
              example: 'gestantes_nutrizes',
              description: 'Público prioritário selecionado',
            },
            especificacoes: {
              type: 'array',
              items: { type: 'string' },
              example: ['vitima_violencia'],
              description: 'Especificações adicionais aplicáveis',
            },
            situacao_moradia_atual: {
              type: 'string',
              example:
                'Família reside em casa de parentes, sem condições de permanência devido a conflitos familiares.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              example: false,
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              example: false,
            },
            observacoes: {
              type: 'string',
              example:
                'Família em situação de extrema vulnerabilidade, necessita acompanhamento psicossocial.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
          },
        },
        {
          title: 'Dados Genéricos Encontrados',
          type: 'object',
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Dados não encontrados',
  })
  async findOne(
    @Param('codigoOrId') codigoOrId: string,
    @Param('id') id: string,
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.findOne(codigoOrId, id);
  }

  /**
   * Buscar dados específicos por solicitação
   */
  @Get(':codigoOrId/solicitacao/:solicitacaoId')
  @ApiOperation({
    summary: 'Buscar dados específicos por solicitação',
    description: 'Retorna os dados específicos de uma solicitação de benefício usando código/ID do tipo',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados específicos encontrados',
    schema: {
      oneOf: [
        {
          title: 'Dados Aluguel Social por Solicitação',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            publico_prioritario: {
              type: 'string',
              example: 'mulheres_vitimas_violencia',
              description: 'Categoria do público prioritário',
            },
            especificacoes: {
              type: 'array',
              items: { type: 'string' },
              example: ['vitima_violencia', 'situacao_rua'],
              description: 'Especificações que se aplicam ao caso',
            },
            situacao_moradia_atual: {
              type: 'string',
              example:
                'Vítima de violência doméstica, saiu de casa com os filhos e está abrigada temporariamente em casa de amigos.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              example: true,
              description: 'Indica se possui imóvel que foi interditado',
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              example: true,
              description: 'Caso está sendo acompanhado pela Lei Maria da Penha',
            },
            observacoes: {
              type: 'string',
              example:
                'Medida protetiva deferida. Necessário acompanhamento do CREAS. Filhos menores precisam de vaga em creche.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T14:45:00.000Z',
            },
          },
        },
        {
          title: 'Dados Genéricos por Solicitação',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            solicitacao_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados para esta solicitação',
  })
  async findBySolicitacao(
    @Param('codigoOrId') codigoOrId: string,
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
  ): Promise<IDadosBeneficio | null> {
    return this.dadosBeneficioFactoryService.findBySolicitacao(
      codigoOrId,
      solicitacaoId,
    );
  }

  /**
   * Atualizar dados específicos
   */
  @Patch(':codigoOrId/:id')
  @ApiOperation({
    summary: 'Atualizar dados específicos de benefício',
    description:
      'Atualiza dados específicos de um benefício usando código/ID do tipo e ID dos dados',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiParam({
    name: 'id',
    description: 'ID dos dados do benefício',
  })
  @ApiBody({
    description: 'Dados para atualização (estrutura varia conforme o tipo)',
    schema: {
      oneOf: [
        {
          title: 'Atualização Aluguel Social',
          type: 'object',
          properties: {
            publico_prioritario: {
              type: 'string',
              enum: [
                'criancas_adolescentes',
                'gestantes_nutrizes',
                'idosos',
                'mulheres_vitimas_violencia',
                'pcd',
                'atingidos_calamidade',
                'situacao_risco',
              ],
              description: 'Novo público prioritário',
              example: 'idosos',
            },
            especificacoes: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'trabalho_infantil',
                  'exploracao_sexual',
                  'vitima_violencia',
                  'lgbtqia',
                  'conflito_lei',
                  'drogadicao',
                  'situacao_rua',
                  'gravidez_adolescencia',
                ],
              },
              maxItems: 2,
              description: 'Novas especificações (até 2 opções)',
              example: ['drogadicao'],
            },
            situacao_moradia_atual: {
              type: 'string',
              description: 'Atualização da situação da moradia',
              example:
                'Situação da moradia foi atualizada após visita técnica. Família conseguiu abrigo temporário em instituição.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              description: 'Atualização sobre imóvel interditado',
              example: true,
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              description: 'Atualização sobre judicialização',
              example: true,
            },
            observacoes: {
              type: 'string',
              description: 'Novas observações sobre o caso',
              example:
                'Após reavaliação, identificada necessidade de acompanhamento psicológico especializado. Encaminhamento para CAPS.',
            },
          },
        },
        {
          title: 'Atualização Genérica',
          type: 'object',
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados específicos atualizados com sucesso',
    schema: {
      oneOf: [
        {
          title: 'Aluguel Social Atualizado',
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            solicitacao_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            publico_prioritario: {
              type: 'string',
              example: 'idosos',
              description: 'Público prioritário atualizado',
            },
            especificacoes: {
              type: 'array',
              items: { type: 'string' },
              example: ['drogadicao'],
              description: 'Especificações atualizadas',
            },
            situacao_moradia_atual: {
              type: 'string',
              example:
                'Situação da moradia foi atualizada após visita técnica. Família conseguiu abrigo temporário em instituição.',
            },
            possui_imovel_interditado: {
              type: 'boolean',
              example: true,
            },
            caso_judicializado_maria_penha: {
              type: 'boolean',
              example: true,
            },
            observacoes: {
              type: 'string',
              example:
                'Após reavaliação, identificada necessidade de acompanhamento psicológico especializado. Encaminhamento para CAPS.',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T16:20:00.000Z',
            },
          },
        },
        {
          title: 'Dados Genéricos Atualizados',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            solicitacao_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados',
  })
  async update(
    @Param('codigoOrId') codigoOrId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: IUpdateDadosBeneficioDto,
  ): Promise<IDadosBeneficio> {
    return this.dadosBeneficioFactoryService.update(codigoOrId, id, updateDto);
  }

  /**
   * Remover dados específicos
   */
  @Delete(':codigoOrId/:id')
  @ApiOperation({
    summary: 'Remover dados específicos de benefício',
    description:
      'Remove dados específicos de um benefício usando código/ID do tipo e ID dos dados',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiParam({
    name: 'id',
    description: 'ID dos dados do benefício',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Dados específicos removidos com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Dados específicos não encontrados',
  })
  async remove(
    @Param('codigoOrId') codigoOrId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.dadosBeneficioFactoryService.remove(codigoOrId, id);
  }

  /**
   * Verificar se existem dados para uma solicitação
   */
  @Get(':codigoOrId/solicitacao/:solicitacaoId/exists')
  @ApiOperation({
    summary: 'Verificar existência de dados por solicitação',
    description: 'Verifica se existem dados específicos para uma solicitação usando código/ID do tipo',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  @ApiParam({ name: 'solicitacaoId', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da verificação',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
      },
    },
  })
  async existsBySolicitacao(
    @Param('codigoOrId') codigoOrId: string,
    @Param('solicitacaoId') solicitacaoId: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.dadosBeneficioFactoryService.existsBySolicitacao(
      codigoOrId,
      solicitacaoId,
    );
    return { exists };
  }

  /**
   * Validar dados de benefício e retornar campos faltantes
   */
  @Post(':codigoOrId/validate')
  @ApiOperation({
    summary: 'Validar dados de benefício e retornar campos faltantes',
    description: 'Valida os dados fornecidos para um tipo de benefício específico e retorna informações sobre campos obrigatórios faltantes e erros de validação.',
  })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'natalidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Validação realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        isValid: {
          type: 'boolean',
          description: 'Indica se os dados são válidos'
        },
        missingFields: {
          type: 'array',
          description: 'Lista de campos obrigatórios faltantes',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string', description: 'Nome do campo' },
              label: { type: 'string', description: 'Rótulo do campo' },
              tipo: { type: 'string', description: 'Tipo do campo' },
              obrigatorio: { type: 'boolean', description: 'Se o campo é obrigatório' },
              descricao: { type: 'string', description: 'Descrição do campo' }
            }
          }
        },
        errors: {
          type: 'array',
          description: 'Lista de erros de validação',
          items: {
            type: 'object',
            properties: {
              campo: { type: 'string', description: 'Nome do campo com erro' },
              mensagem: { type: 'string', description: 'Mensagem de erro' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de benefício não encontrado',
  })
  async validateBenefitData(
    @Param('codigoOrId') codigoOrId: string,
    @Body() createDto: any,
  ) {
    return this.dadosBeneficioFactoryService.validateAndGetMissingFields(
      codigoOrId,
      createDto,
    );
  }

   /**
   * Obtém o schema ativo de um tipo de benefício
   * Aceita tanto o ID quanto o código do benefício
   */
  @Get(':codigoOrId/schema')
  @ApiOperation({ summary: 'Obter schema ativo de um benefício' })
  @ApiResponse({ status: 200, description: 'Schema retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  @ApiParam({
    name: 'codigoOrId',
    description: 'Código ou ID do tipo de benefício',
    example: 'aluguel-social',
  })
  async getSchemaAtivo(
    @Param('codigoOrId') codigoOrId: string,
  ) {
    if (!codigoOrId) {
      throw new BadRequestException('O parâmetro codigoOrId é obrigatório');
    }
    return this.dadosBeneficioFactoryService.getSchemaAtivo(codigoOrId);
  }
}