import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Logger,
  Request,
  NotFoundException,
  UploadedFiles,
  Res,
  StreamableFile,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
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
import { CreateResultadoBeneficioCessadoWithFilesDto, ResultadoUploadedFiles } from '../dto/create-resultado-beneficio-cessado-with-files.dto';
import { ResultadoBeneficioCessadoResponseDto } from '../dto/resultado-beneficio-cessado-response.dto';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { ResultadoBeneficioValidationInterceptor } from '../interceptors/resultado-beneficio-validation.interceptor';
import { ResultadoBeneficioValidationPipe } from '../pipes/resultado-beneficio-validation.pipe';
import { ResultadoFilesValidationPipe } from '../pipes/resultado-files-validation.pipe';
import { ResultadoFileValidationInterceptor } from '../interceptors/resultado-file-validation.interceptor';

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
@Controller('resultado-beneficio-cessado')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@ApiSecurity('bearer')
export class ResultadoBeneficioCessadoController {
  private readonly logger = new Logger(ResultadoBeneficioCessadoController.name);

  constructor(
    private readonly resultadoService: ResultadoBeneficioCessadoService,
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Registra o resultado de um benefício cessado.
   * 
   * Endpoint exclusivo para técnicos registrarem informações detalhadas
   * sobre o motivo do encerramento, status da vulnerabilidade e
   * documentos comprobatórios conforme LOAS.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission({permissionName: 'concessao.resultado.criar'})
  @UseInterceptors(
      FileFieldsInterceptor([
        { name: 'provaSocial', maxCount: 5 },
        { name: 'documentacaoTecnica', maxCount: 10 },
      ], {
        fileFilter: (req, file, cb) => {
          // Validação básica de tipos de arquivo
          const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'video/mp4',
            'video/avi',
          ];

          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
          }
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB por arquivo
          files: 15, // Máximo 15 arquivos total
        },
      }),
      ResultadoFileValidationInterceptor,
      ResultadoBeneficioValidationInterceptor,
    )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar resultado de benefício cessado',
    description: `
      Registra o resultado de um benefício cessado com informações detalhadas
      sobre o motivo do encerramento e documentação comprobatória.
      
      **Conformidade LOAS/SUAS:**
      - Atende aos requisitos da Lei nº 8.742/1993 (LOAS)
      - Segue regulamentações do CNAS (Resoluções nº 212/2006 e nº 33/2012)
      - Documenta adequadamente o encerramento de benefícios eventuais
      
      **Upload de Arquivos:**
      - **Prova Social** (máx. 5 arquivos): Fotos da situação atual, testemunhos de vizinhos
        - Tipos permitidos: JPEG, PNG, WEBP, PDF, MP4, AVI
        - Foco em evidências visuais e testemunhos
      - **Documentação Técnica** (máx. 10 arquivos): Laudos médicos, relatórios técnicos, atas de entrevistas
        - Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, TXT, JPEG, PNG
        - Foco em documentos técnicos e especializados
      
      **Validação de Documentos:**
      - Pelo menos um arquivo total é obrigatório
      - Máximo de 15 arquivos no total
      - Tamanho máximo: 10MB por arquivo
      - Validação específica por categoria de arquivo
      
      **Requisitos:**
      - Usuário deve ter perfil de técnico social, coordenador ou gestor
      - Concessão deve estar com status CESSADO
      - Pelo menos um arquivo de cada categoria é obrigatório
      - Para motivos de superação socioeconômica, comprovante de renda é obrigatório
    `,
  })
  @ApiBody({
    description: `Dados para registro do resultado de benefício cessado conforme SUAS.
    
    **Campos obrigatórios:**
    - Dados do resultado (JSON): motivo, descrição, status vulnerabilidade, etc.
    - Prova Social (arquivos): fotos e testemunhos do cidadão
    - Documentação Técnica (arquivos): laudos, entrevistas e relatórios
    
    **Exemplos de motivos:**
    - Superação de vulnerabilidade socioeconômica
    - Mudança de território
    - Óbito do beneficiário
    - Descumprimento de condicionalidades
    - Agravamento da situação
    - Alteração na renda familiar`,
    schema: {
      type: 'object',
      properties: {
        // Campos do DTO
        concessaoId: {
          type: 'string',
          format: 'uuid',
          description: 'ID da concessão que foi cessada',
        },
        motivoEncerramento: {
          type: 'string',
          enum: ['SUPERACAO_VULNERABILIDADE', 'MUDANCA_TERRITORIO', 'OBITO', 'DESCUMPRIMENTO', 'AGRAVAMENTO', 'ALTERACAO_RENDA'],
          description: 'Motivo principal do encerramento',
        },
        descricaoMotivo: {
          type: 'string',
          maxLength: 1000,
          description: 'Descrição detalhada do motivo',
        },
        statusVulnerabilidade: {
          type: 'string',
          enum: ['SUPERADA', 'MANTIDA', 'AGRAVADA'],
          description: 'Status atual da vulnerabilidade',
        },
        avaliacaoVulnerabilidade: {
          type: 'string',
          maxLength: 1000,
          description: 'Avaliação detalhada da vulnerabilidade',
        },
        observacoes: {
          type: 'string',
          maxLength: 500,
          description: 'Observações adicionais (opcional)',
        },
        acompanhamentoPosterior: {
          type: 'boolean',
          description: 'Indica necessidade de acompanhamento',
        },
        detalhesAcompanhamento: {
          type: 'string',
          maxLength: 500,
          description: 'Detalhes do acompanhamento (opcional)',
        },
        recomendacoes: {
          type: 'string',
          maxLength: 500,
          description: 'Recomendações para a família (opcional)',
        },
        // Campos de upload
        provaSocial: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Arquivos de prova social (fotos e testemunhos) - máx. 5 arquivos',
        },
        documentacaoTecnica: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Arquivos de documentação técnica (laudos, relatórios) - máx. 10 arquivos',
        },
      },
      required: ['concessaoId', 'motivoEncerramento', 'descricaoMotivo', 'statusVulnerabilidade', 'avaliacaoVulnerabilidade', 'acompanhamentoPosterior', 'provaSocial', 'documentacaoTecnica'],
    },
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
        @Body(ResultadoBeneficioValidationPipe) createDto: CreateResultadoBeneficioCessadoWithFilesDto,
        @Request() req: any,
        @UploadedFiles(ResultadoFilesValidationPipe) files?: ResultadoUploadedFiles,
      ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(
      `Técnico ${req.user.id} registrando resultado para concessão ${createDto.concessaoId}`
    );

    return await this.resultadoService.registrarResultado(
        createDto,
        req.user.id,
        files?.provaSocial,
        files?.documentacaoTecnica,
      );
  }

  /**
   * Lista resultados de benefícios cessados com filtros.
   */
  @Get()
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
   * Busca um resultado específico por ID.
   * 
   * Retorna os detalhes completos de um resultado de benefício cessado,
   * incluindo documentos comprobatórios e informações da concessão.
   */
  @Get(':id')
  @RequiresPermission({permissionName: 'concessao.resultado.visualizar'})
  @ApiOperation({
    summary: 'Buscar resultado por ID',
    description: 'Retorna os detalhes completos de um resultado de benefício cessado',
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(`Buscando resultado por ID: ${id}`);
    return await this.resultadoService.buscarPorId(id);
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

  /**
   * Faz download de um arquivo específico associado ao resultado.
   * 
   * Permite download seguro de documentos comprobatórios anexados
   * ao resultado de benefício cessado.
   */
  @Get(':id/arquivos/:arquivoId/download')
  @RequiresPermission({permissionName: 'concessao.resultado.visualizar'})
  @ApiOperation({
    summary: 'Download de arquivo do resultado',
    description: 'Faz download de um arquivo específico associado ao resultado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do resultado',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'arquivoId',
    description: 'ID do arquivo para download',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arquivo encontrado e enviado para download',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resultado ou arquivo não encontrado',
  })
  async downloadArquivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('arquivoId', ParseUUIDPipe) arquivoId: string,
    @Res() res: any,
  ): Promise<void> {
    this.logger.log(`Download de arquivo ${arquivoId} do resultado ${id}`);
    
    try {
      const { stream, filename, mimeType } = await this.resultadoService.downloadArquivo(id, arquivoId, 'user-id');
      
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Erro no download do arquivo ${arquivoId}:`, error);
      res.status(500).json({
        statusCode: 500,
        message: 'Erro interno do servidor',
        error: 'Internal Server Error',
      });
    }
  }

  /**
   * Remove um arquivo específico associado ao resultado.
   * 
   * Permite exclusão segura de documentos comprobatórios,
   * mantendo log de auditoria da operação.
   */
  @Delete(':id/arquivos/:arquivoId')
  @RequiresPermission({permissionName: 'concessao.resultado.editar'})
  @ApiOperation({
    summary: 'Excluir arquivo do resultado',
    description: 'Remove um arquivo específico associado ao resultado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do resultado',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'arquivoId',
    description: 'ID do arquivo para exclusão',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arquivo excluído com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        arquivoId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Resultado ou arquivo não encontrado',
  })
  async excluirArquivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('arquivoId', ParseUUIDPipe) arquivoId: string,
    @Request() req: any,
  ): Promise<{ message: string; arquivoId: string }> {
    this.logger.log(`Exclusão de arquivo ${arquivoId} do resultado ${id}`);
    
    await this.resultadoService.excluirArquivo(id, arquivoId, req.user.id);
    
    return {
      message: 'Arquivo excluído com sucesso',
      arquivoId,
    };
  }

  /**
   * Adiciona novos arquivos a um resultado existente.
   * 
   * Permite anexar documentos adicionais a um resultado já registrado,
   * mantendo as mesmas validações de tipo e tamanho.
   */
  @Post(':id/arquivos')
  @RequiresPermission({permissionName: 'concessao.resultado.editar'})
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'provaSocial', maxCount: 5 },
      { name: 'documentacaoTecnica', maxCount: 10 },
    ], {
      fileFilter: (req, file, cb) => {
        // Validação básica de tipos de arquivo
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'video/mp4',
          'video/avi',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
        files: 15, // Máximo 15 arquivos total
      },
    }),
    ResultadoFileValidationInterceptor,
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Adicionar arquivos ao resultado',
    description: `
      Adiciona novos arquivos a um resultado existente.
      
      **Tipos de arquivos aceitos:**
      - **Prova Social**: JPEG, PNG, WEBP, PDF, MP4, AVI
      - **Documentação Técnica**: PDF, DOC, DOCX, XLS, XLSX, TXT, JPEG, PNG
      
      **Limites:**
      - Máximo 10MB por arquivo
      - Máximo 15 arquivos por upload
      - Pelo menos um arquivo é obrigatório
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID do resultado',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: 'Arquivos para adicionar ao resultado',
    schema: {
      type: 'object',
      properties: {
        provaSocial: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Arquivos de prova social (máx. 5 arquivos)',
        },
        documentacaoTecnica: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Arquivos de documentação técnica (máx. 10 arquivos)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Arquivos adicionados com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        arquivosAdicionados: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nomeOriginal: { type: 'string' },
              categoria: { type: 'string' },
              tamanho: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Arquivos inválidos ou resultado não encontrado',
  })
  async adicionarArquivos(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @UploadedFiles(ResultadoFilesValidationPipe) files?: ResultadoUploadedFiles,
  ): Promise<{
    message: string;
    arquivosAdicionados: Array<{
      id: string;
      nomeOriginal: string;
      categoria: string;
      tamanho: number;
    }>;
  }> {
    this.logger.log(`Adição de arquivos ao resultado ${id}`);
    
    if (!files || (!files.provaSocial?.length && !files.documentacaoTecnica?.length)) {
      throw new Error('Nenhum arquivo foi fornecido');
    }

    // Usar a assinatura correta do service com parâmetros separados
    const resultado = await this.resultadoService.adicionarArquivos(
      id,
      req.user.id,
      files.provaSocial || [],
      files.documentacaoTecnica || [],
    );
    
    // Mapear os documentos do resultado para o formato esperado
    const arquivosAdicionados = resultado.documentosComprobatorios?.map(documento => ({
      id: documento.id,
      nomeOriginal: documento.nomeArquivo,
      categoria: documento.tipo,
      tamanho: documento.tamanhoArquivo,
    })) || [];

    return {
      message: 'Arquivos adicionados com sucesso',
      arquivosAdicionados,
    };
  }
}