import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { ComprovanteService } from '../services/comprovante.service';
import { ComprovanteUploadDto } from '../dtos/comprovante-upload.dto';
import { ComprovanteResponseDto } from '../dtos/comprovante-response.dto';
import { Response } from 'express';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { Usuario } from '@/entities';

/**
 * Controller para gerenciamento de comprovantes de pagamento
 *
 * Implementa endpoints para upload, visualização e remoção de
 * documentos comprobatórios anexados aos pagamentos.
 *
 * @author Equipe PGBen
 */
@ApiTags('Pagamentos')
@Controller('pagamentos/:pagamentoId/comprovantes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ComprovanteController {
  constructor(private readonly comprovanteService: ComprovanteService) {}

  /**
   * Lista todos os comprovantes associados a um pagamento
   */
  @Get()
  @ApiOperation({ summary: 'Lista comprovantes para um determinado pagamento' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comprovantes',
    type: [ComprovanteResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async findAll(@Param('pagamentoId', ParseUUIDPipe) pagamentoId: string) {
    const comprovantes =
      await this.comprovanteService.findAllByPagamento(pagamentoId);

    // Mapear para DTO de resposta
    return comprovantes.map((comprovante) => ({
      id: comprovante.id,
      pagamentoId: comprovante.pagamento_id,
      tipoDocumento: comprovante.tipo_documento,
      nomeArquivo: comprovante.nome_arquivo,
      tamanho: comprovante.tamanho,
      mimeType: comprovante.mime_type,
      dataUpload: comprovante.data_upload,
      uploadedPor: {
        id: comprovante.uploaded_por,
        nome: 'Usuário Responsável', // seria obtido da entidade Usuario
      },
    }));
  }

  /**
   * Realiza o upload de um comprovante para um pagamento
   */
  @Post()
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Realiza upload de um comprovante para um pagamento',
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 201,
    description: 'Comprovante enviado com sucesso',
    type: ComprovanteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou dados incorretos',
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @RequiresPermission({
    permissionName: 'pagamento.editar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.pagamentoId'
  })
  async uploadComprovante(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @UploadedFile() arquivo: any,
    @Body() uploadDto: ComprovanteUploadDto,
    @GetUser() usuario: Usuario
  ) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // Usar o ID do usuário atual
    const usuarioId = usuario.id

    const comprovante = await this.comprovanteService.uploadComprovante(
      pagamentoId,
      arquivo,
      uploadDto,
      usuarioId,
    );

    // Mapear para DTO de resposta
    return {
      id: comprovante.id,
      pagamentoId: comprovante.pagamento_id,
      tipoDocumento: comprovante.tipo_documento,
      nomeArquivo: comprovante.nome_arquivo,
      tamanho: comprovante.tamanho,
      mimeType: comprovante.mime_type,
      dataUpload: comprovante.data_upload,
      uploadedPor: {
        id: usuarioId,
        nome: 'Usuário Responsável', // seria obtido da entidade Usuario
      },
    };
  }

  /**
   * Obtém um comprovante específico para download
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Faz download de um comprovante' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do comprovante' })
  @ApiResponse({ status: 200, description: 'Arquivo enviado com sucesso' })
  @ApiResponse({ status: 404, description: 'Comprovante não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.id'
  })
  async downloadComprovante(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } =
      await this.comprovanteService.getComprovanteContent(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  /**
   * Busca um comprovante pelo ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Busca um comprovante pelo ID' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do comprovante' })
  @ApiResponse({
    status: 200,
    description: 'Comprovante encontrado',
    type: ComprovanteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Comprovante não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.id'
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const comprovante = await this.comprovanteService.findOne(id);

    if (!comprovante) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    // Mapear para DTO de resposta
    return {
      id: comprovante.id,
      pagamentoId: comprovante.pagamento_id,
      tipoDocumento: comprovante.tipo_documento,
      nomeArquivo: comprovante.nome_arquivo,
      tamanho: comprovante.tamanho,
      mimeType: comprovante.mime_type,
      dataUpload: comprovante.data_upload,
      uploadedPor: {
        id: comprovante.uploaded_por,
        nome: 'Usuário Responsável', // seria obtido da entidade Usuario
      },
    };
  }

  /**
   * Remove um comprovante
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove um comprovante' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do comprovante' })
  @ApiResponse({ status: 200, description: 'Comprovante removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Comprovante não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Comprovante não pode ser removido',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @RequiresPermission({
    permissionName: 'pagamento.editar',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.id'
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario
  ) {
    
    // Usar o ID do usuário atual
    await this.comprovanteService.removeComprovante(id, usuario.id);

    return { message: 'Comprovante removido com sucesso' };
  }
}
