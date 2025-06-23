import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Public } from '../../../auth/decorators/public.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { UploadTokenService } from '../services/upload-token.service';
import { QrCodeService } from '../services/qr-code.service';
import { CreateTokenDto } from '../dto/simplified/create-token.dto';
import { UploadDto } from '../dto/simplified/upload.dto';

/**
 * Controller para gerenciamento de uploads simplificados
 */
@ApiTags('Easy Upload')
@Controller('easy-upload')
export class EasyUploadController {
  private readonly logger = new Logger(EasyUploadController.name);

  constructor(
    private readonly uploadTokenService: UploadTokenService,
    private readonly qrCodeService: QrCodeService,
  ) {}

  /**
   * Cria um novo token de upload
   */
  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar token de upload' })
  @ApiResponse({ status: 201, description: 'Token criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async createToken(@Body() dto: CreateTokenDto, @GetUser() user) {
    try {
      const tokenData = {
        solicitacao_id: dto.solicitacao_id,
        cidadao_id: dto.cidadao_id,
        max_files: dto.max_files || 10,
        expires_in_minutes: dto.expires_in_minutes || 120,
        metadata: {
          required_documents: dto.required_documents || [],
          instrucoes: dto.instrucoes || 'Envie os documentos solicitados.'
        }
      };

      const token = await this.uploadTokenService.createUploadToken(tokenData, user.id);
      
      return {
        token: token.token,
        qrCode: token.metadata?.qrCode,
        expiresAt: token.expires_at
      };
    } catch (error) {
      this.logger.error(`Erro ao criar token: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao criar token de upload');
    }
  }

  /**
   * Valida um token de upload
   */
  @Get('public/validate/:token')
  @Public()
  @ApiOperation({ summary: 'Validar token de upload' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  @ApiResponse({ status: 401, description: 'Token expirado ou inválido' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async validateToken(@Param('token') token: string) {
    try {
      const tokenData = await this.uploadTokenService.findByToken(token);
      
      if (!tokenData) {
        throw new NotFoundException('Token não encontrado');
      }

      const now = new Date();
      const isExpired = tokenData.expires_at < now;
      
      if (isExpired) {
        throw new UnauthorizedException('Token expirado');
      }

      return {
        valid: true,
        expiresAt: tokenData.expires_at,
        requiredDocuments: tokenData.metadata?.required_documents || [],
        instrucoes: tokenData.metadata?.instrucoes
      };
    } catch (error) {
      this.logger.error(`Erro ao validar token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao validar token');
    }
  }

  /**
   * Realiza upload de arquivo usando um token
   */
  @Post('public/upload/:token')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de arquivo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        tipo_documento: {
          type: 'string',
          example: 'RG',
        },
        descricao: {
          type: 'string',
          example: 'Documento de identidade',
        },
        metadata: {
          type: 'object',
          example: { observacoes: 'Documento frente e verso' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Arquivo enviado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou arquivo não fornecido' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async uploadFile(
    @Param('token') token: string,
    @UploadedFile() file: any,
    @Body() uploadDto: UploadDto,
  ): Promise<any> {
    try {
      if (!file) {
        throw new BadRequestException('Arquivo não fornecido');
      }

      // Validar token
      const tokenData = await this.uploadTokenService.findByToken(token);
      
      if (!tokenData) {
        throw new NotFoundException('Token não encontrado');
      }

      const now = new Date();
      if (tokenData.expires_at < now) {
        throw new UnauthorizedException('Token expirado');
      }

      // Verificar limite de arquivos
      const uploadCount = await this.uploadTokenService.getUploadCount(token);
      if (uploadCount >= tokenData.max_files) {
        throw new BadRequestException('Limite de arquivos excedido');
      }

      // Processar upload
      const document = await this.uploadTokenService.processFileUpload(
        tokenData,
        file,
        {
          tipo: uploadDto.tipo_documento,
          descricao: uploadDto.descricao,
          metadata: uploadDto.metadata || {},
        }
      );

      return {
        documentId: document.id,
        success: true,
        message: 'Arquivo enviado com sucesso'
      };
    } catch (error) {
      this.logger.error(`Erro no upload de arquivo: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao processar upload de arquivo');
    }
  }

  /**
   * Obtém o status de um token de upload
   */
  @Get('public/status/:token')
  @Public()
  @ApiOperation({ summary: 'Status do token de upload' })
  @ApiResponse({ status: 200, description: 'Status obtido com sucesso' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async getStatus(@Param('token') token: string) {
    try {
      const tokenData = await this.uploadTokenService.findByToken(token);
      
      if (!tokenData) {
        throw new NotFoundException('Token não encontrado');
      }

      const uploadCount = await this.uploadTokenService.getUploadCount(token);
      const remainingUploads = Math.max(0, tokenData.max_files - uploadCount);
      
      // Calcular tempo restante
      const now = new Date();
      const timeRemainingMs = Math.max(0, tokenData.expires_at.getTime() - now.getTime());
      const minutesRemaining = Math.ceil(timeRemainingMs / (1000 * 60));

      return {
        filesUploaded: uploadCount,
        filesRemaining: remainingUploads,
        timeRemaining: minutesRemaining,
        expiresAt: tokenData.expires_at,
        status: tokenData.status
      };
    } catch (error) {
      this.logger.error(`Erro ao obter status: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao obter status do token');
    }
  }

  /**
   * Obtém detalhes de um token específico
   */
  @Get('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter detalhes do token' })
  @ApiResponse({ status: 200, description: 'Detalhes obtidos com sucesso' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async getTokenDetails(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<any> {
    try {
      // Buscar detalhes do token
      const token = await this.uploadTokenService.getTokenDetails(id, user.id);
      
      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }

      return token;
    } catch (error) {
      this.logger.error(`Erro ao obter detalhes do token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao obter detalhes do token');
    }
  }

  /**
   * Cancela um token de upload
   */
  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancelar token de upload' })
  @ApiResponse({ status: 200, description: 'Token cancelado com sucesso' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async cancelToken(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body('motivo') motivo?: string,
  ): Promise<any> {
    try {
      // Cancelar token
      await this.uploadTokenService.cancelToken(id, user.id, motivo);
      
      return {
        success: true,
        message: 'Token cancelado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao cancelar token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao cancelar token');
    }
  }
}
