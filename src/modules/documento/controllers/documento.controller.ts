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
  UnauthorizedException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentoService } from '../services/documento.service';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
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
@Controller('documento')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  /**
   * Lista todos os documentos de uma solicitação
   */
  @Get('solicitacao/:solicitacaoId')
  @ApiOperation({ summary: 'Listar documentos de uma solicitação' })
  @ApiResponse({ status: 200, description: 'Lista de documentos retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async findBySolicitacao(@Param('solicitacaoId') solicitacaoId: string, @Req() req: Request) {
    return this.documentoService.findBySolicitacao(solicitacaoId, req.user);
  }

  /**
   * Obtém detalhes de um documento específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return this.documentoService.findById(id, req.user);
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
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.TECNICO_UNIDADE)
  async upload(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() uploadDocumentoDto: UploadDocumentoDto,
    @Req() req: Request
  ) {
    if (!arquivo) {
      throw new BadRequestException('Arquivo não fornecido');
    }
    
    return this.documentoService.upload(
      arquivo,
      uploadDocumentoDto,
      req.user
    );
  }

  /**
   * Remove um documento de uma solicitação
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remover documento' })
  @ApiResponse({ status: 200, description: 'Documento removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.TECNICO_UNIDADE)
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.documentoService.remove(id, req.user);
  }

  /**
   * Verifica um documento
   */
  @Post(':id/verificar')
  @ApiOperation({ summary: 'Verificar documento' })
  @ApiResponse({ status: 200, description: 'Documento verificado com sucesso' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.COORDENADOR)
  async verificarDocumento(
    @Param('id') id: string,
    @Body('observacoes') observacoes: string,
    @Req() req: Request
  ) {
    return this.documentoService.verificarDocumento(id, observacoes, req.user);
  }
}
