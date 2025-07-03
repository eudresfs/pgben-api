import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UseInterceptors as NestUseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { Usuario } from '../../../entities';
import { ComprovanteService } from '../services/comprovante.service';
import { ComprovanteUploadDto } from '../dtos/comprovante-upload.dto';
import { ComprovanteResponseDto } from '../dtos/comprovante-response.dto';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';

/**
 * Controller para gerenciamento de comprovantes de pagamento
 * Implementa endpoints otimizados seguindo padrão prepare-then-execute
 */
@ApiTags('Pagamentos')
@Controller('pagamentos/:pagamentoId/comprovantes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor)
export class ComprovanteController {
  constructor(private readonly comprovanteService: ComprovanteService) {}

  /**
   * Lista comprovantes de um pagamento
   */
  @Get()
  @ApiOperation({ summary: 'Lista comprovantes de um pagamento' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comprovantes retornada com sucesso',
    type: [ComprovanteResponseDto],
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  async findAll(@Param('pagamentoId', ParseUUIDPipe) pagamentoId: string) {
    const comprovantes =
      await this.comprovanteService.findByPagamento(pagamentoId);

    return {
      data: comprovantes.map(this.mapToResponseDto),
      meta: {
        total: comprovantes.length,
        pagamentoId,
      },
    };
  }

  /**
   * Upload de comprovante
   */
  @Post()
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Faz upload de comprovante' })
  @ApiParam({
    name: 'pagamento_id',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiResponse({
    status: 201,
    description: 'Comprovante enviado com sucesso',
    type: ComprovanteResponseDto,
  })
  @RequiresPermission({
    permissionName: 'pagamento.editar',
    scopeType: TipoEscopo.UNIDADE,
  })
  async upload(
    @Param('pagamento_id') pagamentoId: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() uploadDto: ComprovanteUploadDto,
    @GetUser() usuario: Usuario,
  ) {
    const comprovante = await this.comprovanteService.upload(
      arquivo,
      pagamentoId,
      uploadDto.tipo_documento,
      usuario.id,
    );

    return {
      data: this.mapToResponseDto(comprovante),
      message: 'Comprovante enviado com sucesso',
    };
  }

  /**
   * Busca comprovante por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Busca comprovante por ID' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID do comprovante',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprovante encontrado',
    type: ComprovanteResponseDto,
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const comprovante = await this.comprovanteService.findById(id);

    return {
      data: this.mapToResponseDto(comprovante),
    };
  }

  /**
   * Download de comprovante
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Download de comprovante' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID do comprovante',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo do comprovante',
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buffer, fileName, mimeType } =
      await this.comprovanteService.getContent(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache',
    });

    res.end(buffer);
  }

  /**
   * Remove comprovante
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove comprovante' })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID do comprovante',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprovante removido com sucesso',
  })
  @RequiresPermission({
    permissionName: 'pagamento.editar',
    scopeType: TipoEscopo.UNIDADE,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    await this.comprovanteService.remove(id);

    return {
      message: 'Comprovante removido com sucesso',
    };
  }

  // ========== MÉTODO AUXILIAR PRIVADO ==========

  /**
   * Mapeia entidade para DTO de resposta
   */
  private mapToResponseDto(comprovante: any): ComprovanteResponseDto {
    return {
      id: comprovante.id,
      pagamento_id: comprovante.pagamento_id,
      tipo_documento: comprovante.tipo_documento,
      nome_arquivo: comprovante.nome_arquivo,
      url: comprovante.url || '',
      tamanho: comprovante.tamanho,
      mime_type: comprovante.mime_type,
      data_upload: comprovante.data_upload,
      responsavel_upload: {
        id: comprovante.responsavel_upload_id || '',
        nome: comprovante.responsavel_upload_nome || '',
      },
      created_at: comprovante.created_at,
      updated_at: comprovante.updated_at,
    };
  }
}
