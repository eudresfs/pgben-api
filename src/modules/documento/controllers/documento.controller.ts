import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Query,
  StreamableFile,
  Res,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentoService } from '../services/documento.service';
import { MalwareScanService } from '../services/malware-scan.service';
import { ThumbnailService } from '../services/thumbnail.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { Request } from 'express';
import { Multer } from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

/**
 * Controlador de Documentos
 *
 * Responsável por gerenciar as rotas relacionadas aos documentos
 * anexados às solicitações de benefícios
 */
@ApiTags('Documentos')
@Controller('v1/documento')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoController {
  constructor(
    private readonly documentoService: DocumentoService,
    private readonly malwareScanService: MalwareScanService,
    private readonly thumbnailService: ThumbnailService,
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Lista todos os documentos de uma solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({
    permissionName: 'documento.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar documentos de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({
    name: 'solicitacaoId',
    description: 'ID da solicitação',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Filtrar por tipo de documento',
    required: false,
    enum: [
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'RG',
      'CPF',
      'CARTAO_NIS',
    ],
  })
  async findBySolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Req() req: Request,
    @Query('tipo') tipo?: string,
  ) {
    // Garantir que req tenha um usuário válido
    if (!req.user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    
    return this.documentoService.findBySolicitacao(
      solicitacaoId,
      req.user,
      tipo,
    );
  }

  /**
   * Obtém detalhes de um documento específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'documento.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Obter detalhes de um documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    
    return this.documentoService.findById(id, req.user);
  }

  /**
   * Faz download de um documento
   */
  @Get(':id/download')
  @RequiresPermission({
    permissionName: 'documento.download',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Fazer download de um documento' })
  @ApiResponse({ status: 200, description: 'Documento baixado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: any,
  ) {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    
    const resultado = await this.documentoService.download(id, req.user);

    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length,
    });

    return new StreamableFile(resultado.buffer);
  }

  /**
   * Obtém uma miniatura de um documento de imagem
   */
  @Get(':id/thumbnail')
  @RequiresPermission({
    permissionName: 'documento.thumbnail',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Obter miniatura de um documento de imagem' })
  @ApiResponse({ status: 200, description: 'Miniatura gerada com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 400, description: 'Documento não é uma imagem' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'size',
    description: 'Tamanho da miniatura',
    required: false,
    enum: ['pequena', 'media', 'grande'],
    default: 'media',
  })
  async getThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('size') size: 'pequena' | 'media' | 'grande' = 'media',
    @Req() req: Request,
    @Res({ passthrough: true }) res: any,
  ) {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    
    const resultado = await this.documentoService.getThumbnail(
      id,
      size,
      req.user,
    );

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="thumbnail-${id}.jpg"`,
      'Content-Length': resultado.buffer.length,
      'Cache-Control': 'max-age=3600',
    });

    return new StreamableFile(resultado.buffer);
  }

  /**
   * Faz upload de um novo documento para uma solicitação
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo do documento e metadados',
    type: UploadDocumentoDto,
  })
  @ApiOperation({ summary: 'Fazer upload de documento' })
  @ApiResponse({ status: 201, description: 'Documento enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 415, description: 'Tipo de arquivo não suportado' })
  @ApiResponse({ status: 422, description: 'Arquivo infectado com malware' })
  async upload(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() uploadDocumentoDto: UploadDocumentoDto,
    @Req() req: Request,
  ) {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    if (!arquivo) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    // Verificar malware antes de processar o upload
    const scanResult = await this.malwareScanService.scanBuffer(
      arquivo.buffer,
      arquivo.originalname,
    );
    if (scanResult.isInfected) {
      throw new BadRequestException(
        `Arquivo infectado com malware: ${scanResult.viruses.join(', ')}`,
      );
    }

    // Adicionar o ID do usuário ao DTO
    uploadDocumentoDto.usuario_id = req.user.id;

    return this.documentoService.upload(arquivo, uploadDocumentoDto, req.user);
  }

  /**
   * Remove um documento de uma solicitação
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'documento.remover',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Remover documento' })
  @ApiResponse({ status: 200, description: 'Documento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.documentoService.remove(id, req.user);
  }

  /**
   * Verifica um documento
   */
  @Post(':id/verificar')
  @RequiresPermission({
    permissionName: 'documento.verificar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Verificar documento' })
  @ApiResponse({ status: 200, description: 'Documento verificado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        observacoes: {
          type: 'string',
          description: 'Observações sobre a verificação do documento',
          example: 'Documento verificado e validado conforme original',
        },
      },
    },
  })
  async verificarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('observacoes') observacoes: string,
    @Req() req: Request,
  ) {
    return this.documentoService.verificarDocumento(id, observacoes, req.user);
  }

  /**
   * Verifica um documento em busca de malware
   */
  @Post(':id/scan-malware')
  @RequiresPermission({
    permissionName: 'documento.scan.malware',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'documento.solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Verificar documento em busca de malware' })
  @ApiResponse({ status: 200, description: 'Documento verificado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  @HttpCode(HttpStatus.OK)
  async scanMalware(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const documento = await this.documentoService.findById(id, req.user);
    const arquivo = await this.documentoService.download(id, req.user);

    const resultado = await this.malwareScanService.scanBuffer(
      arquivo.buffer,
      documento.nome_arquivo,
    );

    // Atualizar metadados do documento com o resultado da verificação
    await this.documentoService.atualizarMetadados(
      id,
      {
        verificacao_malware: {
          verificado_em: new Date().toISOString(),
          resultado: resultado.isInfected ? 'infectado' : 'limpo',
          detalhes: resultado.isInfected
            ? resultado.viruses.join(', ')
            : 'Nenhuma ameaça detectada',
        },
      },
      req.user,
    );

    return {
      id: documento.id,
      nome_arquivo: documento.nome_arquivo,
      verificado_em: new Date().toISOString(),
      resultado: resultado.isInfected ? 'infectado' : 'limpo',
      detalhes: resultado.isInfected ? resultado.viruses : [],
      status: resultado.isInfected ? 'INFECTADO' : 'SEGURO',
    };
  }
}
