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
  ApiQuery,
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
import { GerarComprovanteDto, ComprovanteGeradoDto } from '../dtos/gerar-comprovante.dto';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { AuditoriaPagamento } from '../decorators/auditoria.decorator';

/**
 * Controller para gerenciamento de comprovantes de pagamento
 * Implementa endpoints otimizados seguindo padrão prepare-then-execute
 */
@ApiTags('Pagamentos')
@Controller('pagamentos/:pagamentoId/comprovantes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor, AuditoriaInterceptor)
export class ComprovanteController {
  constructor(private readonly comprovanteService: ComprovanteService) {}

  /**
   * Lista comprovantes de um pagamento
   */
  @Get()
  @AuditoriaPagamento.Consulta('Consulta de comprovantes de pagamento')
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
    permissionName: 'pagamento.visualizar'
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
  @AuditoriaPagamento.Criacao('Upload de comprovante de pagamento')
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Faz upload de comprovante' })
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
  @RequiresPermission({
    permissionName: 'pagamento.comprovante.upload',
  })
  async upload(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() uploadDto: ComprovanteUploadDto,
    @GetUser() usuario: Usuario,
  ) {
    const comprovante = await this.comprovanteService.upload(
      pagamentoId,
      arquivo,
      uploadDto,
      usuario.id,
    );

    return {
      data: this.mapToResponseDto(comprovante),
      message: 'Comprovante enviado com sucesso',
    };
  }

  /**
   * Gera comprovante em PDF pré-preenchido
   */
  @Get('gerar-comprovante')
  @AuditoriaPagamento.Consulta('Geração de comprovante PDF')
  @ApiOperation({ 
    summary: 'Gera comprovante em PDF pré-preenchido',
    description: 'Gera um comprovante em PDF com dados pré-preenchidos do pagamento para assinatura. Quando formato=pdf, retorna o arquivo para download direto.'
  })
  @ApiParam({
    name: 'pagamentoId',
    type: 'string',
    description: 'ID do pagamento',
  })
  @ApiQuery({
    name: 'formato',
    enum: ['pdf', 'base64'],
    description: 'Formato de retorno do comprovante. pdf=download direto, base64=metadados com conteúdo codificado',
    required: false,
    example: 'pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprovante PDF gerado com sucesso',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ComprovanteGeradoDto',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Pagamento não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados obrigatórios ausentes ou inválidos',
  })
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
  })
  async gerarComprovante(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @Query() query: GerarComprovanteDto,
    @Res() res?: Response,
  ): Promise<ComprovanteGeradoDto | void> {
    const resultado = await this.comprovanteService.gerarComprovantePdf(pagamentoId, query);
    
    // Se formato for 'pdf' (padrão), retorna arquivo para download
    if (!query.formato || query.formato === 'pdf') {
      // Buscar o buffer do PDF novamente para download
      const pdfBuffer = await this.comprovanteService.gerarPdfBuffer(pagamentoId, query);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.nomeArquivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      return;
    }
    
    // Se formato for 'base64', retorna metadados com conteúdo
    return resultado;
  }

  /**
   * Busca comprovante por ID
   */
  @Get(':id')
  @AuditoriaPagamento.Consulta('Consulta de comprovante específico')
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
    permissionName: 'pagamento.visualizar'
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
  @AuditoriaPagamento.Consulta('Download de comprovante')
  @ApiOperation({ summary: 'Faz download de comprovante' })
  @RequiresPermission({
    permissionName: 'pagamento.comprovante.download',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID do comprovante',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo do comprovante',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, mimetype, nomeOriginal } =
      await this.comprovanteService.download(id);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${nomeOriginal}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Remove comprovante
   */
  @Delete(':id')
  @AuditoriaPagamento.Exclusao('Exclusão de comprovante')
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
    permissionName: 'pagamento.comprovante.excluir'
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    await this.comprovanteService.remove(id, usuario.id);

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
      nome_original: comprovante.nome_original,
      tamanho: comprovante.tamanho,
      mimetype: comprovante.mimetype,
      data_upload: comprovante.data_upload,
      observacoes: comprovante.observacoes,
      usuario_upload_id: comprovante.usuario_upload_id,
    };
  }
}
