import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { DocumentoService } from '../../documento/services/documento.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { QrCodeService } from './qr-code.service';
import { UploadToken } from '../entities/upload-token.entity';
import { UploadTokenStatus } from '../entities/upload-token.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { BaseDto } from '../../../shared/dtos/base.dto';
import { TipoDocumentoEnum } from '@/enums';

/**
 * Serviço responsável pelo gerenciamento de tokens de upload
 */
@Injectable()
export class UploadTokenService {
  private readonly logger = new Logger(UploadTokenService.name);
  private readonly tokenExpirationMinutes: number;

  constructor(
    @InjectRepository(UploadToken)
    private readonly uploadTokenRepository: Repository<UploadToken>,
    private readonly configService: ConfigService,
    private readonly qrCodeService: QrCodeService,
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly documentoService?: DocumentoService,
  ) {
    this.tokenExpirationMinutes = this.configService.get<number>('UPLOAD_TOKEN_EXPIRATION_MINUTES', 60);
  }

  /**
   * Cria um novo token de upload
   */
  async createUploadToken(tokenData: any, userId: string): Promise<UploadToken> {
    try {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.tokenExpirationMinutes);

      const uploadToken = this.uploadTokenRepository.create({
         token,
         cidadao_id: tokenData.cidadao_id,
         solicitacao_id: tokenData.solicitacao_id,
         usuario_id: userId,
         expires_at: expiresAt,
         status: UploadTokenStatus.ATIVO,
         metadata: tokenData.metadata || {},
         max_files: tokenData.max_files || 10,
         required_documents: tokenData.required_documents || []
       });

      const savedToken = await this.uploadTokenRepository.save(uploadToken);

      await this.auditEventEmitter.emitEntityCreated(
        'UploadToken',
        savedToken.id,
        { token: savedToken.token },
        userId
      );

      return savedToken;
    } catch (error) {
      this.logger.error(`Erro ao criar token de upload: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao criar token de upload');
    }
  }

  /**
   * Busca token pelo valor
   */
  async findByToken(token: string): Promise<UploadToken | null> {
    try {
      return await this.uploadTokenRepository.findOne({
        where: { token },
        relations: ['cidadao', 'solicitacao', 'usuario']
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar token');
    }
  }

  /**
   * Obtém contagem de uploads de um token
   */
  async getUploadCount(token: string): Promise<number> {
    try {
      const tokenData = await this.findByToken(token);
      if (!tokenData) {
        throw new NotFoundException('Token não encontrado');
      }
      return tokenData.metadata?.upload_count || 0;
    } catch (error) {
      this.logger.error(`Erro ao obter contagem de uploads: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao obter contagem de uploads');
    }
  }

  /**
   * Obtém detalhes do token
   */
  async getTokenDetails(tokenId: string, userId: string): Promise<UploadToken> {
    try {
      const token = await this.uploadTokenRepository.findOne({
        where: { id: tokenId, usuario_id: userId },
        relations: ['cidadao', 'solicitacao', 'usuario']
      });

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
   * Cancela um token
   */
  async cancelToken(tokenId: string, userId: string, motivo?: string): Promise<void> {
    try {
      const token = await this.getTokenDetails(tokenId, userId);
      
      const updatedMetadata = token.metadata ? { ...token.metadata } : {};
      if (motivo) {
        updatedMetadata.cancellation_reason = motivo;
      }
      
      await this.uploadTokenRepository.update(tokenId, {
        status: UploadTokenStatus.CANCELADO,
        cancelled_at: new Date(),
        cancelled_by: userId,
        metadata: updatedMetadata
      });

      await this.auditEventEmitter.emitEntityUpdated(
        'UploadToken',
        tokenId,
        { status: UploadTokenStatus.CANCELADO, motivo },
        { status: token.status },
        userId
      );
    } catch (error) {
      this.logger.error(`Erro ao cancelar token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao cancelar token');
    }
  }

  /**
   * Lista tokens com filtros
   */
  async listTokens(filters: any, userId: string): Promise<{ items: UploadToken[]; total: number }> {
    try {
      const where: FindOptionsWhere<UploadToken> = {
        usuario_id: userId
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.cidadao_id) {
        where.cidadao_id = filters.cidadao_id;
      }

      if (filters.dateRange) {
        where.created_at = Between(filters.dateRange.start, filters.dateRange.end);
      }

      const [items, total] = await this.uploadTokenRepository.findAndCount({
        where,
        relations: ['cidadao', 'solicitacao'],
        order: { created_at: 'DESC' },
        take: filters.limit || 20,
        skip: filters.offset || 0
      });

      return { items, total };
    } catch (error) {
      this.logger.error(`Erro ao listar tokens: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao listar tokens');
    }
  }

  /**
   * Valida um token
   */
  async validateToken(token: string): Promise<UploadToken> {
    try {
      const tokenData = await this.findByToken(token);
      
      if (!tokenData) {
        throw new NotFoundException('Token não encontrado');
      }

      if (tokenData.isExpired?.() || tokenData.isCancelled?.()) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      return tokenData;
    } catch (error) {
      this.logger.error(`Erro ao validar token: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao validar token');
    }
  }

  /**
   * Marca token como usado
   */
  async markTokenAsUsed(tokenId: string): Promise<void> {
    try {
      const token = await this.uploadTokenRepository.findOne({ where: { id: tokenId } });
      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }

      const metadata = token.metadata || {};
      metadata.last_used_at = new Date().toISOString();
      metadata.usage_count = (metadata.usage_count || 0) + 1;

      await this.uploadTokenRepository.update(tokenId, { metadata });
    } catch (error) {
      this.logger.error(`Erro ao marcar token como usado: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao marcar token como usado');
    }
  }

  /**
   * Processa tokens expirados
   */
  async processExpiredTokens(): Promise<void> {
    try {
      const expiredTokens = await this.uploadTokenRepository.find({
        where: {
          status: UploadTokenStatus.ATIVO,
          expires_at: Between(new Date('1900-01-01'), new Date())
        }
      });

      for (const token of expiredTokens) {
        await this.uploadTokenRepository.update(token.id, {
          status: UploadTokenStatus.EXPIRADO
        });
      }

      this.logger.log(`Processados ${expiredTokens.length} tokens expirados`);
    } catch (error) {
      this.logger.error(`Erro ao processar tokens expirados: ${error.message}`, error.stack);
    }
  }

  async processFileUpload(
    tokenData: UploadToken,
    file: any,
    documentInfo: { tipo: string; descricao: string; metadata: Record<string, any> }
  ): Promise<any> {
    try {
      if (tokenData.isExpired?.() || tokenData.isCancelled?.()) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      if (!this.documentoService) {
        throw new InternalServerErrorException('Serviço de documentos não disponível');
      }

      if (!tokenData.cidadao_id) {
        throw new BadRequestException('ID do cidadão é obrigatório para upload de documentos');
      }

      const documento = await this.documentoService.upload(
        file,
        {
          cidadao_id: tokenData.cidadao_id,
          ...(tokenData.solicitacao_id ? { solicitacao_id: tokenData.solicitacao_id } : {}),
          tipo: documentInfo.tipo as TipoDocumentoEnum,
          descricao: documentInfo.descricao,
          arquivo: file.buffer
        },
        tokenData.usuario_id
      );

      if (!documento) {
        throw new InternalServerErrorException('Falha ao criar documento');
      }

      const metadata = tokenData.metadata || {};
      metadata.upload_count = (metadata.upload_count || 0) + 1;
      metadata.last_upload_at = new Date().toISOString();
      
      await this.uploadTokenRepository.update(tokenData.id, { metadata });

      await this.auditEventEmitter.emitEntityCreated(
        'Documento',
        documento.id,
        { 
          tipo: documentInfo.tipo,
          nome_arquivo: file.originalname,
          tamanho: file.size
        },
        tokenData.usuario_id
      );

      return documento;
    } catch (error) {
      this.logger.error(`Erro ao processar upload de arquivo: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Falha ao processar upload de arquivo');
    }
  }
}