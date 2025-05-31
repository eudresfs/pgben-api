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
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../usuario/entities/usuario.entity';

/**
 * Controlador de Documentos
 *
 * Responsável por gerenciar as rotas relacionadas aos documentos
 * anexados aos cidadãos e solicitações de benefícios
 */
@ApiTags('Documentos')
@Controller('v1/documento')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

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
    enum: ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA', 'OUTROS'],
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
    enum: ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA', 'OUTROS'],
  })
  @ApiQuery({
    name: 'cidadaoId',
    description: 'ID do cidadão (opcional)',
    required: false,
    type: 'string',
    format: 'uuid',
  })
  async findReutilizaveis(
    @Query('tipo') tipo?: string,
    @Query('cidadaoId') cidadaoId?: string,
  ) {
    return this.documentoService.findReutilizaveis(cidadaoId, tipo);
  }

  /**
   * Obtém detalhes de um documento específico
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'documento.visualizar' })
  @ApiOperation({ summary: 'Obter detalhes de um documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentoService.findById(id);
  }

  /**
   * Faz download de um documento
   */
  @Get(':id/download')
  @RequiresPermission({ permissionName: 'documento.download' })
  @ApiOperation({ summary: 'Fazer download de um documento' })
  @ApiResponse({ status: 200, description: 'Documento baixado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const resultado = await this.documentoService.download(id);

    res.set({
      'Content-Type': resultado.mimetype,
      'Content-Disposition': `attachment; filename="${resultado.nomeOriginal}"`,
      'Content-Length': resultado.buffer.length.toString(),
    });

    res.send(resultado.buffer);
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
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async upload(
    @UploadedFile() arquivo: any,
    @Body() uploadDto: UploadDocumentoDto,
    @GetUser() usuario: Usuario,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    return this.documentoService.upload(arquivo, uploadDto, usuario.id);
  }

  /**
   * Marca um documento como verificado
   */
  @Post(':id/verificar')
  @RequiresPermission({ permissionName: 'documento.verificar' })
  @ApiOperation({ summary: 'Marcar documento como verificado' })
  @ApiResponse({
    status: 200,
    description: 'Documento verificado com sucesso',
  })
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
  ) {
    return this.documentoService.verificar(id, usuario.id, observacoes);
  }

  /**
   * Remove um documento (soft delete)
   */
  @Delete(':id')
  @RequiresPermission({ permissionName: 'documento.excluir' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um documento' })
  @ApiResponse({ status: 204, description: 'Documento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @ApiParam({
    name: 'id',
    description: 'ID do documento',
    type: 'string',
    format: 'uuid',
  })
  async remover(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any
  ) {
    await this.documentoService.remover(id, req.user.id);
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
    format: 'uuid',
  })
  async getEstatisticas(@Query('cidadaoId') cidadaoId?: string) {
    return this.documentoService.getEstatisticas(cidadaoId);
  }
}
