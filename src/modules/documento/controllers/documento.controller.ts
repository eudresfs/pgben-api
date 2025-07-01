import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  BadRequestException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentoService } from '../services/documento.service';
import { DocumentoAccessService } from '../services/documento-access.service';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { DocumentoResponseDto } from '../dto/documento-response.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../../shared/request-context/request-context.dto';
import { DocumentoAccessGuard } from '../guards/documento-access.guard';
import { Public } from '@/auth';

/**
 * Controlador de Documentos
 *
 * Responsável por gerenciar as rotas relacionadas aos documentos
 * anexados aos cidadãos e solicitações de benefícios
 */
@ApiTags('Documentos')
@Controller('documento')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoController {
  constructor(
    private readonly documentoService: DocumentoService,
    private readonly documentoAccessService: DocumentoAccessService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Lista documentos de um cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Listar documentos de um cidadão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos retornada com sucesso',
  })
  @ApiParam({
    name: 'cidadaoId',
    description: 'ID do cidadão',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Filtrar por tipo de documento',
    required: false,
    enum: [
      'RG',
      'CPF',
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'OUTROS',
    ],
  })
  @ApiQuery({
    name: 'reutilizavel',
    description: 'Filtrar por documentos reutilizáveis',
    required: false,
    type: 'boolean',
  })
  async findByCidadao(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('tipo') tipo?: string,
    @Query('reutilizavel') reutilizavel?: boolean,
  ) {
    return this.documentoService.findByCidadao(cidadaoId, tipo, reutilizavel);
  }

  /**
   * Lista documentos de uma solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Listar documentos de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos retornada com sucesso',
  })
  @ApiParam({
    name: 'solicitacaoId',
    description: 'ID da solicitação',
    type: 'string',
    format: 'uuid',
  })
  async findBySolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
  ) {
    return this.documentoService.findBySolicitacao(solicitacaoId);
  }

  /**
   * Busca documentos reutilizáveis por tipo
   */
  @Get('reutilizaveis')
  @RequiresPermission({ permissionName: 'documento.listar' })
  @ApiOperation({ summary: 'Buscar documentos reutilizáveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos reutilizáveis retornada com sucesso',
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Tipo de documento',
    required: true,
    enum: [
      'RG',
      'CPF',
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'OUTROS',
    ],
  })
  @ApiQuery({
    name: 'cidadaoId',
    description: 'ID do cidadão (opcional)',
    required: false,
    type: 'string',
  })
  async findReutilizaveis(
    @Query('tipo') tipo?: string,
    @Query('cidadaoId') cidadaoId?: string,
  ) {
    return this.documentoService.findReutilizaveis(cidadaoId, tipo);
  }

  /**
   * Obtém detalhes de um documento específico com verificação de acesso
   */
  @Get(':id')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.visualizar' })
  @ApiOperation({ summary: 'Obter detalhes de um documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];
    
    const documento = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );

    // Auditoria do acesso ao documento
    await this.auditEventEmitter.emitEntityAccessed(
      'Documento',
      id,
      usuario.id?.toString(),
      {        synchronous: false,      },
    );

    return documento;
  }

  /**
   * Faz download de um documento com verificação de acesso
   */
  @Get(':id/download')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.download' })
  @ApiOperation({ summary: 'Fazer download de um documento' })
  @ApiResponse({ status: 200, description: 'Documento baixado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];
    
    const resultado = await this.documentoService.download(
      id,
      usuario.id,
      userRoles,
    );

    // Auditoria do download de documento com informações detalhadas
    await this.auditEventEmitter.emitEntityAccessed(
      'Documento',
      id,
      usuario.id?.toString(),
      {        synchronous: false,      },
    );

    // Headers de segurança para download
    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(resultado.buffer);
  }

  @Post(':id/gerar-url-segura')
  @ApiOperation({ summary: 'Gerar URL segura para acesso ao documento' })
  @ApiParam({ name: 'id', description: 'ID do documento' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        expiresInMinutes: {
          type: 'number',
          description: 'Tempo de expiração em minutos (padrão: 60)',
          default: 60,
        },
        maxUses: {
          type: 'number',
          description: 'Número máximo de usos (padrão: 1)',
          default: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'URL segura gerada com sucesso',
    schema: {
      type: 'object',
      properties: {
        secureUrl: { type: 'string' },
        token: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        maxUses: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @RequiresPermission({ permissionName: 'documento.download' })
  @ApiBearerAuth()
  async generateSecureUrl(
    @Param('id', ParseUUIDPipe) documentoId: string,
    @GetUser() usuario: Usuario,
    @Body() body: { expiresInMinutes?: number; maxUses?: number },
    @ReqContext() context: RequestContext,
  ) {
    const { expiresInMinutes = 60, maxUses = 1 } = body;
    
    const result = await this.documentoAccessService.generateSecureUrl(
      documentoId,
      usuario.id,
      {
        expiresIn: `${expiresInMinutes}m`,
        maxUses,
      },
    );
    
    // Emitir evento de auditoria
    await this.auditEventEmitter.emitEntityAccessed(
      'Documento',
      documentoId,
      usuario.id?.toString(),
      { synchronous: false },
    );
    
    return result;
  }

  @Get('acesso/:token')
  @Public()
  @ApiOperation({ summary: 'Acesso seguro ao documento via token' })
  @ApiParam({ name: 'token', description: 'Token de acesso seguro' })
  @ApiResponse({ status: 200, description: 'Arquivo do documento' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async secureDownload(
    @Param('token') token: string,
    @Res() res: Response,
    @ReqContext() context: RequestContext,
  ): Promise<void> {
    try {
      const { documentoId, usuarioId } = await this.documentoAccessService.validateAndUseToken(token);
      
      const resultado = await this.documentoService.download(documentoId, usuarioId, []);
      
      // Emitir evento de auditoria
      await this.auditEventEmitter.emitEntityAccessed(
        'Documento',
        documentoId,
        usuarioId?.toString(),
        { synchronous: false },
      );
      
      // Headers de segurança para download
      res.set({
        'Content-Type': resultado.mimetype,
        'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
        'Content-Length': resultado.buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      });

      res.send(resultado.buffer);
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Delete('acesso/:token')
  @ApiOperation({ summary: 'Revogar token de acesso seguro' })
  @ApiParam({ name: 'token', description: 'Token de acesso seguro' })
  @ApiResponse({ status: 200, description: 'Token revogado com sucesso' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  @RequiresPermission({ permissionName: 'documento.gerenciar' })
  @ApiBearerAuth()
  async revokeSecureToken(
    @Param('token') token: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    await this.documentoAccessService.revokeToken(token);
    
    // Emitir evento de auditoria
    await this.auditEventEmitter.emitEntityAccessed(
      'DocumentoToken',
      token,
      usuario.id?.toString(),
      { synchronous: false },
    );
    
    return { message: 'Token revogado com sucesso' };
  }

  /**
   * Faz upload de um documento
   */
  @Post('upload')
  @RequiresPermission({ permissionName: 'documento.criar' })
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({ summary: 'Fazer upload de um documento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dados do documento para upload',
    type: UploadDocumentoDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Documento enviado com sucesso',
    type: DocumentoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async upload(
    @UploadedFile() arquivo: any,
    @Body() uploadDto: UploadDocumentoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    const resultado = await this.documentoService.upload(
      arquivo,
      uploadDto,
      usuario.id,
    );

    // Auditoria do upload de documento
    await this.auditEventEmitter.emitEntityCreated(
      'Documento',
      resultado.id,
      resultado,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );

    // Transformar o resultado para excluir dados sensíveis
    return {
      data: plainToInstance(DocumentoResponseDto, resultado, {
        excludeExtraneousValues: true,
      }),
      meta: null,
      message: null,
    };
  }

  /**
   * Marca um documento como verificado com verificação de acesso
   */
  @Post(':id/verificar')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.verificar' })
  @ApiOperation({ summary: 'Marcar documento como verificado' })
  @ApiResponse({
    status: 200,
    description: 'Documento verificado com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
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
          description: 'Observações da verificação',
          maxLength: 500,
        },
      },
    },
  })
  async verificar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('observacoes') observacoes: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];
    
    // Buscar dados do documento antes da verificação com verificação de acesso
    const documentoAntes = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );
    
    const resultado = await this.documentoService.verificar(id, usuario.id, observacoes);
    
    // Auditoria de verificação com informações detalhadas
    await this.auditEventEmitter.emitEntityUpdated(
      'Documento',
      id,
      documentoAntes,
      resultado,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );
    
    return resultado;
  }

  /**
   * Remove um documento (soft delete) com verificação de acesso
   */
  @Delete(':id')
  @UseGuards(DocumentoAccessGuard)
  @RequiresPermission({ permissionName: 'documento.excluir' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um documento' })
  @ApiResponse({ status: 204, description: 'Documento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao documento' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async remover(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() context: RequestContext,
  ) {
    // Extrair roles do usuário do contexto
    const userRoles = context.user?.roles || [];
    
    // Buscar dados do documento antes da remoção com verificação de acesso
    const documentoAntes = await this.documentoService.findByIdWithAccess(
      id,
      usuario.id,
      userRoles,
    );
    
    await this.documentoService.remover(id, usuario.id);
    
    // Auditoria da remoção de documento com informações detalhadas
    await this.auditEventEmitter.emitEntityDeleted(
      'Documento',
      id,
      documentoAntes,
      usuario.id?.toString(),
      {
        synchronous: false,
      },
    );
  }

  /**
   * Obtém estatísticas de documentos
   */
  @Get('estatisticas/geral')
  @RequiresPermission({ permissionName: 'documento.estatisticas' })
  @ApiOperation({ summary: 'Obter estatísticas de documentos' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  @ApiQuery({
    name: 'cidadaoId',
    description: 'ID do cidadão (opcional)',
    required: false,
    type: 'string',
  })
  async getEstatisticas(@Query('cidadaoId') cidadaoId?: string) {
    return this.documentoService.getEstatisticas(cidadaoId);
  }
}
