import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AuditContextInterceptor } from '../../../common/interceptors/audit-context.interceptor';
import { LoggingInterceptor } from '../../../common/interceptors/logging.interceptor';
import { DocumentoPdfService } from '../services/documento-pdf.service';
import {
  GerarDocumentoDto,
  DocumentoGeradoDto,
  ListarDocumentosDto,
} from '../dtos/gerar-documento.dto';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { PermissionGuard } from '@/auth/guards/permission.guard';

/**
 * Controller para geração de documentos PDF
 * Segue os mesmos padrões do módulo de pagamento
 */
@ApiTags('Documentos PDF')
@Controller('documentos/pdf')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditContextInterceptor, LoggingInterceptor)
@ApiBearerAuth()
export class DocumentoPdfController {
  constructor(private readonly documentoPdfService: DocumentoPdfService) {}

  /**
   * Gera um documento PDF baseado nos parâmetros fornecidos
   */
  @Post('gerar')
  @ApiOperation({
    summary: 'Gerar documento PDF',
    description:
      'Gera um documento PDF baseado no tipo especificado e dados da solicitação',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Documento gerado com sucesso',
    type: DocumentoGeradoDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Erro interno do servidor',
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async gerarDocumento(
    @Body(ValidationPipe) gerarDocumentoDto: GerarDocumentoDto,
    @GetUser() usuario: any,
  ): Promise<DocumentoGeradoDto> {
    return this.documentoPdfService.gerarDocumento(
      gerarDocumentoDto,
      usuario.id,
    );
  }

  /**
   * Lista documentos gerados com filtros opcionais
   */
  @Get()
  @ApiOperation({
    summary: 'Listar documentos PDF',
    description: 'Lista documentos PDF gerados com filtros opcionais',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de documentos retornada com sucesso',
    type: [DocumentoGeradoDto],
  })
  @ApiQuery({
    name: 'tipoDocumento',
    required: false,
    enum: TipoDocumentoEnum,
    description: 'Filtrar por tipo de documento',
  })
  @ApiQuery({
    name: 'solicitacaoId',
    required: false,
    type: String,
    description: 'Filtrar por ID da solicitação',
  })
  @ApiQuery({
    name: 'dataInicial',
    required: false,
    type: String,
    description: 'Data inicial para filtro (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dataFinal',
    required: false,
    type: String,
    description: 'Data final para filtro (YYYY-MM-DD)',
  })
  async listarDocumentos(
    @Query(ValidationPipe) filtros: ListarDocumentosDto,
    @GetUser() usuario: any,
  ): Promise<DocumentoGeradoDto[]> {
    return this.documentoPdfService.listarDocumentos(filtros, usuario.id);
  }

  /**
   * Busca um documento específico por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar documento por ID',
    description: 'Retorna os dados de um documento específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documento encontrado',
    type: DocumentoGeradoDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Documento não encontrado',
  })
  async buscarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: any,
  ): Promise<DocumentoGeradoDto> {
    return this.documentoPdfService.buscarDocumentoPorId(id, usuario.id);
  }

  /**
   * Faz download de um documento PDF
   */
  @Get(':id/download')
  @ApiOperation({
    summary: 'Download de documento PDF',
    description: 'Faz download do arquivo PDF do documento',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arquivo PDF retornado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Documento não encontrado',
  })
  @ApiProduces('application/pdf')
  async downloadDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: any,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nomeArquivo } = await this.documentoPdfService.downloadDocumento(
      id,
      usuario.id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Remove um documento do sistema
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover documento',
    description: 'Remove um documento do sistema (apenas admins e técnicos)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Documento removido com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Documento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para remover documento',
  })
  async removerDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: any,
  ): Promise<void> {
    await this.documentoPdfService.removerDocumento(id, usuario.id);
  }

  /**
   * Gera múltiplos documentos em lote
   */
  @Post('gerar-lote')
  @ApiOperation({
    summary: 'Gerar documentos em lote',
    description: 'Gera múltiplos documentos PDF em uma única operação',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Documentos gerados com sucesso',
    type: [DocumentoGeradoDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros inválidos',
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async gerarDocumentosLote(
    @Body(ValidationPipe) documentos: GerarDocumentoDto[],
    @GetUser() usuario: any,
  ): Promise<DocumentoGeradoDto[]> {
    return this.documentoPdfService.gerarDocumentosLote(documentos, usuario.id);
  }

  /**
   * Obtém tipos de documentos disponíveis
   */
  @Get('tipos/disponiveis')
  @ApiOperation({
    summary: 'Listar tipos de documentos',
    description: 'Retorna os tipos de documentos disponíveis para geração',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tipos de documentos',
    schema: {
      type: 'object',
      properties: {
        tipos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              valor: { type: 'string' },
              descricao: { type: 'string' },
              requerAssinatura: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async obterTiposDocumentos(): Promise<{
    tipos: Array<{
      valor: TipoDocumentoEnum;
      descricao: string;
      requerAssinatura: boolean;
    }>;
  }> {
    return {
      tipos: [
        {
          valor: TipoDocumentoEnum.AUTORIZACAO_ATAUDE,
          descricao: 'Autorização para Fornecimento de Ataúde',
          requerAssinatura: true,
        },
        {
          valor: TipoDocumentoEnum.COMPROVANTE_BENEFICIO,
          descricao: 'Comprovante de Benefício Social',
          requerAssinatura: true,
        },
        {
          valor: TipoDocumentoEnum.DECLARACAO_COMPARECIMENTO,
          descricao: 'Declaração de Comparecimento',
          requerAssinatura: true,
        },
      ],
    };
  }

  /**
   * Valida dados antes da geração do documento
   */
  @Post('validar')
  @ApiOperation({
    summary: 'Validar dados para geração',
    description: 'Valida se os dados estão completos para gerar o documento',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validação realizada',
    schema: {
      type: 'object',
      properties: {
        valido: { type: 'boolean' },
        erros: {
          type: 'array',
          items: { type: 'string' },
        },
        avisos: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiConsumes('application/json')
  async validarDados(
    @Body(ValidationPipe) gerarDocumentoDto: GerarDocumentoDto,
    @GetUser() usuario: any,
  ): Promise<{
    valido: boolean;
    erros: string[];
    avisos: string[];
  }> {
    return this.documentoPdfService.validarDadosDocumento(
      gerarDocumentoDto,
      usuario.id,
    );
  }
}