import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  Logger,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiSecurity,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  CreateResultadoBeneficioCessadoSwaggerSchema,
  ResultadoBeneficioCessadoResponseSwaggerSchema,
  ListagemResultadosSwaggerSchema,
  ErroValidacaoSUASSwaggerSchema,
  ErroPermissaoSUASSwaggerSchema,
  DocumentoComprobatorioSwaggerSchema,
} from '../docs/swagger-schemas';
import { SwaggerExampleConfigs } from '../docs/swagger-examples';
import { JwtAuthGuard } from '../../../auth//guards/jwt-auth.guard';
import { ResultadoBeneficioCessadoService } from '../services/resultado-beneficio-cessado.service';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';
import { ResultadoBeneficioCessadoResponseDto } from '../dto/resultado-beneficio-cessado-response.dto';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { ResultadoBeneficioValidationInterceptor } from '../interceptors/resultado-beneficio-validation.interceptor';
import { ResultadoBeneficioValidationPipe } from '../pipes/resultado-beneficio-validation.pipe';

/**
 * Controller responsável pelos endpoints de registro de resultado
 * de benefício cessado.
 * 
 * Implementa endpoints exclusivos para técnicos registrarem
 * informações sobre o encerramento de benefícios eventuais,
 * conforme Lei de Benefícios Eventuais do SUAS.
 * 
 * Todos os endpoints requerem autenticação e autorização
 * específica para técnicos do sistema.
 */
@ApiTags('Resultado de Benefício Cessado')
@ApiExtraModels(
  CreateResultadoBeneficioCessadoSwaggerSchema,
  ResultadoBeneficioCessadoResponseSwaggerSchema,
  ListagemResultadosSwaggerSchema,
  ErroValidacaoSUASSwaggerSchema,
  ErroPermissaoSUASSwaggerSchema,
  DocumentoComprobatorioSwaggerSchema,
)
@Controller('concessoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(ResultadoBeneficioValidationInterceptor)
@ApiBearerAuth()
@ApiSecurity('bearer')
export class ResultadoBeneficioCessadoController {
  private readonly logger = new Logger(ResultadoBeneficioCessadoController.name);

  constructor(
    private readonly resultadoService: ResultadoBeneficioCessadoService,
  ) {}

  /**
   * Registra o resultado de um benefício cessado.
   * 
   * Endpoint exclusivo para técnicos registrarem informações detalhadas
   * sobre o motivo do encerramento, status da vulnerabilidade e
   * documentos comprobatórios conforme LOAS.
   */
  @Post(':concessaoId/resultado')
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission({permissionName: 'concessao.resultado.criar'})
  @ApiOperation({
    summary: 'Registrar resultado de benefício cessado',
    description: `
      Registra o resultado de um benefício cessado com informações detalhadas
      sobre o motivo do encerramento e documentação comprobatória.
      
      **Conformidade LOAS/SUAS:**
      - Atende aos requisitos da Lei nº 8.742/1993 (LOAS)
      - Segue regulamentações do CNAS (Resoluções nº 212/2006 e nº 33/2012)
      - Documenta adequadamente o encerramento de benefícios eventuais
      
      **Requisitos:**
      - Usuário deve ter perfil de técnico social, coordenador ou gestor
      - Concessão deve estar com status CESSADO
      - Pelo menos um documento comprobatório é obrigatório
      - Para motivos de superação socioeconômica, comprovante de renda é obrigatório
    `,
  })
  @ApiBody({
    type: CreateResultadoBeneficioCessadoDto,
    description: `Dados para registro do resultado de benefício cessado conforme SUAS.
    
    **Exemplos incluem:**
    - Superação de vulnerabilidade socioeconômica
    - Mudança de território
    - Óbito do beneficiário
    - Descumprimento de condicionalidades
    - Agravamento da situação
    - Alteração na renda familiar`,
    examples: SwaggerExampleConfigs.criarResultado.examples,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resultado registrado com sucesso',
    type: ResultadoBeneficioCessadoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: `Dados inválidos ou regras de negócio violadas conforme SUAS.
    
    **Principais validações:**
    - Combinação inválida entre motivo e status de vulnerabilidade
    - Documentos obrigatórios ausentes conforme motivo
    - Observações insuficientes para o tipo de encerramento
    - Concessão não encontrada ou não cessada
    - Resultado já registrado para a concessão`,
    type: ErroValidacaoSUASSwaggerSchema,
    examples: SwaggerExampleConfigs.errosValidacao.examples,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token de autenticação inválido ou expirado',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token JWT inválido ou expirado',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: `Usuário não possui permissão para registrar resultados.
    
    **Requisitos de acesso:**
    - Perfil: técnico social, coordenador ou gestor
    - Competência territorial: usuário deve ter acesso ao território da concessão
    - Permissão específica: concessao.resultado.criar`,
    type: ErroPermissaoSUASSwaggerSchema,
    examples: SwaggerExampleConfigs.errosPermissao.examples,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Concessão não encontrada',
  })
  async registrarResultado(
    @Body(ValidationPipe, ResultadoBeneficioValidationPipe) createDto: CreateResultadoBeneficioCessadoDto,
    @Request() req: any,
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(
      `Técnico ${req.user.id} registrando resultado para concessão ${createDto.concessaoId}`
    );

    return await this.resultadoService.registrarResultado(
      createDto,
      req.user.id,
    );
  }

  /**
   * Busca um resultado de benefício cessado por ID.
   */
  @Get(':concessaoId/resultado/:id')
  @RequiresPermission({permissionName: 'concessao.resultado.visualizar'})
  @ApiOperation({
    summary: 'Buscar resultado por ID',
    description: 'Retorna os detalhes completos de um resultado de benefício cessado',
  })
  @ApiParam({
    name: 'concessaoId',
    description: 'ID único da concessão', 
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do resultado',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado encontrado',
    type: ResultadoBeneficioCessadoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resultado não encontrado',
  })
  async buscarPorId(
    @Param('concessaoId', ParseUUIDPipe) concessaoId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(`Buscando resultado por ID: ${concessaoId}`);
    
    return await this.resultadoService.buscarPorId(id);
  }

  /**
   * Lista resultados de benefícios cessados com filtros.
   */
  @Get('resultados')
  @RequiresPermission({permissionName: 'concessao.resultado.listar'})
  @ApiOperation({
    summary: 'Listar resultados de benefícios cessados',
    description: `
      Lista resultados de benefícios cessados com opções de filtro e paginação.
      
      **Filtros disponíveis:**
      - Por concessão específica
      - Por técnico responsável
      - Por motivo de encerramento
      - Por status de vulnerabilidade
      - Por período de registro
    `,
  })
  @ApiQuery({
    name: 'concessaoId',
    required: false,
    description: 'Filtrar por ID da concessão',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'tecnicoId',
    required: false,
    description: 'Filtrar por ID do técnico responsável',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'motivoEncerramento',
    required: false,
    description: 'Filtrar por motivo de encerramento',
    enum: MotivoEncerramentoBeneficio,
  })
  @ApiQuery({
    name: 'statusVulnerabilidade',
    required: false,
    description: 'Filtrar por status de vulnerabilidade',
    enum: StatusVulnerabilidade,
  })
  @ApiQuery({
    name: 'dataInicio',
    required: false,
    description: 'Data de início do período (formato: YYYY-MM-DD)',
    type: 'string',
    format: 'date',
  })
  @ApiQuery({
    name: 'dataFim',
    required: false,
    description: 'Data de fim do período (formato: YYYY-MM-DD)',
    type: 'string',
    format: 'date',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página (padrão: 1)',
    type: 'number',
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 10, máximo: 100)',
    type: 'number',
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: `Lista de resultados retornada com sucesso.
    
    **Informações incluídas:**
    - Dados completos do resultado (motivo, status, observações)
    - Informações da concessão relacionada
    - Dados do técnico responsável
    - Documentos comprobatórios anexados
    - Metadados de paginação`,
    type: ListagemResultadosSwaggerSchema,
  })
  async listar(
    @Query('concessaoId') concessaoId?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('motivoEncerramento') motivoEncerramento?: MotivoEncerramentoBeneficio,
    @Query('statusVulnerabilidade') statusVulnerabilidade?: StatusVulnerabilidade,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    resultados: ResultadoBeneficioCessadoResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log('Listando resultados de benefícios cessados');

    // Validar e converter datas
    const dataInicioDate = dataInicio ? new Date(dataInicio) : undefined;
    const dataFimDate = dataFim ? new Date(dataFim) : undefined;

    // Validar limite máximo
    const limiteFinal = Math.min(limit || 10, 100);

    return await this.resultadoService.listar({
      concessaoId,
      tecnicoId,
      motivoEncerramento,
      statusVulnerabilidade,
      dataInicio: dataInicioDate,
      dataFim: dataFimDate,
      page: page || 1,
      limit: limiteFinal,
    });
  }

  /**
   * Busca resultados por concessão específica.
   * 
   * Endpoint de conveniência para buscar o resultado de uma concessão específica.
   */
  @Get(':concessaoId/resultado')
  @RequiresPermission({permissionName: 'concessao.resultado.visualizar'})
  @ApiOperation({
    summary: 'Buscar resultado por concessão',
    description: 'Retorna o resultado de uma concessão específica, se existir',
  })
  @ApiParam({
    name: 'concessaoId',
    description: 'ID da concessão',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado encontrado',
    type: ResultadoBeneficioCessadoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resultado não encontrado para esta concessão',
  })
  async buscarPorConcessao(
    @Param('concessaoId', ParseUUIDPipe) concessaoId: string,
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(`Buscando resultado por concessão: ${concessaoId}`);

    const resultados = await this.resultadoService.listar({
      concessaoId,
      limit: 1,
    });

    if (resultados.total === 0) {
      throw new NotFoundException(
        'Nenhum resultado encontrado para esta concessão'
      );
    }

    return resultados.resultados[0];
  }
}